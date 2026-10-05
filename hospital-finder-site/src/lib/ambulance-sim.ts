import { hospital_list } from "../../public/hospital_list";

const FLEET_SIZE = 300;   // number of ambulances on the map
const CANDIDATES = 3;    // how many nearest ambulances get a real road-route check
const BOUNDS = { minLat: 44.38, maxLat: 44.50, minLng: 26.02, maxLng: 26.20 }; // Bucharest
const MATRIX_BATCH = 25; // Matrix API limit for the driving profile
const CACHE_KEY = "ambulance-fleet-v1";

const mapboxToken: string = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";
const hospitals: Hospital[] = hospital_list;

type MatrixResponse = {
    code: string;
    message?: string;
    sources?: { location: [number, number] | null; distance?: number }[]; // [lng, lat]
};

const rand = (min: number, max: number): number => min + Math.random() * (max - min);

// ---------- Helpers ----------
function checkPoint(p: LatLng): void {
    if (!p || !Number.isFinite(p.latitude) || !Number.isFinite(p.longitude) ||
        Math.abs(p.latitude) > 90 || Math.abs(p.longitude) > 180) {
        throw new Error('Invalid location: expected { latitude, longitude }');
    }
}

function requireToken(): string {
    if (!mapboxToken) throw new Error('Missing NEXT_PUBLIC_MAPBOX_TOKEN');
    return mapboxToken;
}

function distance(a: LatLng, b: LatLng): number { // haversine, meters
    const R = 6371000, rad = Math.PI / 180;
    const dLat = (b.latitude - a.latitude) * rad, dLng = (b.longitude - a.longitude) * rad;
    const h = Math.sin(dLat / 2) ** 2 +
        Math.cos(a.latitude * rad) * Math.cos(b.latitude * rad) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
}

// ---------- Fleet (snapped to roads) ----------
function randomFleet(): Ambulance[] {
    return Array.from({ length: FLEET_SIZE }, (_, i) => ({
        id: i + 1,
        latitude: rand(BOUNDS.minLat, BOUNDS.maxLat),
        longitude: rand(BOUNDS.minLng, BOUNDS.maxLng),
    }));
}

// The Matrix API returns every input coordinate snapped to the nearest road.
// We only need the snapped `sources`, so we ask for a single destination to keep the cost low.
async function snapBatch(batch: Ambulance[]): Promise<Ambulance[]> {
    const token = requireToken();
    const coords = batch.map((a) => `${a.longitude},${a.latitude}`).join(';');
    const url =
        `https://api.mapbox.com/directions-matrix/v1/mapbox/driving/${coords}` +
        `?sources=all&destinations=0&access_token=${token}`;

    const data = (await (await fetch(url)).json()) as MatrixResponse;
    if (data.code !== 'Ok' || !data.sources || data.sources.length !== batch.length) {
        throw new Error(`Mapbox Matrix error: ${data.code} ${data.message ?? ''}`);
    }

    // If a point can't be snapped, drop it rather than leave it off-road
    return batch.flatMap((a, i) => {
        const loc = data.sources![i].location;
        return loc ? [{ id: a.id, latitude: loc[1], longitude: loc[0] }] : [];
    });
}

async function snapToRoads(points: Ambulance[]): Promise<Ambulance[]> {
    const batches: Ambulance[][] = [];
    for (let i = 0; i < points.length; i += MATRIX_BATCH) {
        batches.push(points.slice(i, i + MATRIX_BATCH));
    }
    return (await Promise.all(batches.map(snapBatch))).flat();
}

function readCache(): Ambulance[] | null {
    try {
        const raw = sessionStorage.getItem(CACHE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as Ambulance[];
        return Array.isArray(parsed) && parsed.length > 0 ? parsed : null;
    } catch {
        return null;
    }
}

function writeCache(fleet: Ambulance[]): void {
    try { sessionStorage.setItem(CACHE_KEY, JSON.stringify(fleet)); } catch { /* ignore */ }
}

// Built once per session and shared by every caller
let fleetPromise: Promise<Ambulance[]> | null = null;

export function getFleet(): Promise<Ambulance[]> {
    if (!fleetPromise) {
        fleetPromise = (async () => {
            const cached = readCache();
            if (cached) return cached;
            const fleet = await snapToRoads(randomFleet());
            writeCache(fleet);
            return fleet;
        })().catch((e) => {
            fleetPromise = null; // allow a retry on the next call
            throw e;
        });
    }
    return fleetPromise.then((fleet) => fleet.map((a) => ({ ...a })));
}

// ---------- Mapbox Directions ----------
export async function getRoute(from: LatLng, to: LatLng): Promise<RouteInfo> {
    const token = requireToken();
    // NOTE: Mapbox wants longitude,latitude
    const coords = `${from.longitude},${from.latitude};${to.longitude},${to.latitude}`;
    const url =
        `https://api.mapbox.com/directions/v5/mapbox/driving/${coords}` +
        `?geometries=geojson&overview=full&access_token=${token}`;

    const data = (await (await fetch(url)).json()) as DirectionsResponse;
    if (data.code === 'NoRoute') throw new Error('No road route found for that point');
    if (data.code !== 'Ok' || !data.routes?.length) {
        throw new Error(`Mapbox Directions error: ${data.code} ${data.message ?? ''}`);
    }

    const route = data.routes[0];
    return {
        geojson: { type: 'Feature', properties: {}, geometry: route.geometry },
        distanceM: route.distance,
        durationS: route.duration,
    };
}

// Straight-line distance shortlists a few ambulances, then real road time decides.
async function findClosestAmbulance(patient: LatLng): Promise<{ ambulance: Ambulance; route: RouteInfo }> {
    const fleet = await getFleet();
    if (fleet.length === 0) throw new Error('The fleet is empty');

    const shortlist = fleet
        .map((a) => ({ a, d: distance(a, patient) }))
        .sort((x, y) => x.d - y.d)
        .slice(0, CANDIDATES)
        .map((c) => c.a);

    const routes = await Promise.all(shortlist.map((a) => getRoute(a, patient)));

    let best = 0;
    routes.forEach((r, i) => { if (r.durationS < routes[best].durationS) best = i; });
    return { ambulance: shortlist[best], route: routes[best] };
}

// ---------- Dispatch: works for ANY patient point ----------
export async function dispatchAmbulance(
    patient: LatLng,
    hospital: Hospital | undefined = hospitals[0],
): Promise<DispatchResult> {
    checkPoint(patient);
    if (!hospital) throw new Error('No hospital given');

    const { ambulance, route: toPatient } = await findClosestAmbulance(patient);
    const toHospital = await getRoute(patient, hospital.coordinates);

    return {
        patient,
        ambulanceId: ambulance.id,
        ambulancePosition: { latitude: ambulance.latitude, longitude: ambulance.longitude },
        hospitalName: hospital.name,
        toPatient: toPatient.geojson,
        toHospital: toHospital.geojson,
        etaToPatientMin: Math.round(toPatient.durationS / 60),
        etaToHospitalMin: Math.round(toHospital.durationS / 60),
        distanceToPatientKm: +(toPatient.distanceM / 1000).toFixed(1),
        distanceToHospitalKm: +(toHospital.distanceM / 1000).toFixed(1),
    };
}

// ---------- Address -> coordinates -> dispatch ----------
export async function geocodeAddress(address: string): Promise<LatLng> {
    const token = requireToken();
    const url =
        `https://api.mapbox.com/search/geocode/v6/forward` +
        `?q=${encodeURIComponent(address)}&limit=1&access_token=${token}`;
    const data = (await (await fetch(url)).json()) as GeocodeResponse;
    if (!data.features?.length) throw new Error(`Address not found: "${address}"`);
    const [lng, lat] = data.features[0].geometry.coordinates;
    return { latitude: lat, longitude: lng };
}

export async function onAddressRequest(address: string, hospital?: Hospital): Promise<DispatchResult> {
    return dispatchAmbulance(await geocodeAddress(address), hospital);
}