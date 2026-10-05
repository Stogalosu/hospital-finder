// TypeScript ES module. Usage:
//   import { init, dispatchAmbulance, drawRoutes } from './ambulance-sim';
//   init({ mapboxToken, hospitals });
//   const result = await dispatchAmbulance({ latitude, longitude }, hospital);
//   drawRoutes(map, result);
import type { Map as MapboxMap, GeoJSONSource } from 'mapbox-gl';
import {hospital_list} from "../../public/hospital_list";

const FLEET_SIZE = 50;   // number of ambulances on the map
const CANDIDATES = 3;    // how many nearest ambulances get a real road-route check
const BOUNDS = { minLat: 44.38, maxLat: 44.50, minLng: 26.02, maxLng: 26.20 }; // Bucharest

let mapboxToken: string = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";
let hospitals: Hospital[] = hospital_list;

const rand = (min: number, max: number): number => min + Math.random() * (max - min);

const ambulances: Ambulance[] = Array.from({ length: FLEET_SIZE }, (_, i) => ({
    id: i + 1,
    latitude: rand(BOUNDS.minLat, BOUNDS.maxLat),
    longitude: rand(BOUNDS.minLng, BOUNDS.maxLng),
}));

export const getFleet = (): Ambulance[] => ambulances.map((a) => ({ ...a }));

// ---------- Helpers ----------
function checkPoint(p: LatLng): void {
    if (!p || !Number.isFinite(p.latitude) || !Number.isFinite(p.longitude) ||
        Math.abs(p.latitude) > 90 || Math.abs(p.longitude) > 180) {
        throw new Error('Invalid location: expected { latitude, longitude }');
    }
}

function requireToken(): string {
    if (!mapboxToken) throw new Error('Call init({ mapboxToken, hospitals }) first');
    return mapboxToken;
}

function distance(a: LatLng, b: LatLng): number { // haversine, meters
    const R = 6371000, rad = Math.PI / 180;
    const dLat = (b.latitude - a.latitude) * rad, dLng = (b.longitude - a.longitude) * rad;
    const h = Math.sin(dLat / 2) ** 2 +
        Math.cos(a.latitude * rad) * Math.cos(b.latitude * rad) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
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
    const shortlist = ambulances
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
    if (!hospital) throw new Error('No hospital given (pass one, or set hospitals in init)');

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

// ---------- Browser: highlight both routes on a mapbox-gl map ----------
// A new call replaces the routes of the previous patient.
export function drawRoutes(map: MapboxMap, result: DispatchResult): void {
    const layers = [
        { id: 'route-to-patient',  data: result.toPatient,  color: '#f59e0b' },
        { id: 'route-to-hospital', data: result.toHospital, color: '#2563eb' },
    ];
    for (const { id, data, color } of layers) {
        const source = map.getSource(id) as GeoJSONSource | undefined;
        if (source) {
            source.setData(data);
        } else {
            map.addSource(id, { type: 'geojson', data });
            map.addLayer({
                id, type: 'line', source: id,
                layout: { 'line-cap': 'round', 'line-join': 'round' },
                paint: { 'line-color': color, 'line-width': 5 },
            });
        }
    }

    // Zoom so both routes are visible
    const coords = [...result.toPatient.geometry.coordinates, ...result.toHospital.geometry.coordinates];
    const lngs = coords.map((c) => c[0]);
    const lats = coords.map((c) => c[1]);
    map.fitBounds(
        [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]],
        { padding: 60 },
    );
}