interface LatLng {
    latitude: number;
    longitude: number;
}

interface Hospital {
    id?: number;
    name: string;
    address?: string;
    type?: string;
    coordinates: LatLng;
    specialties?: string[];
}

interface Ambulance extends LatLng {
    id: number;
}

interface RouteFeature {
    type: 'Feature';
    properties: Record<string, never>;
    geometry: { type: 'LineString'; coordinates: [number, number][] }; // [lng, lat] pairs
}

interface DispatchResult {
    patient: LatLng;
    ambulanceId: number;
    ambulancePosition: LatLng;
    hospitalName: string;
    toPatient: RouteFeature;
    toHospital: RouteFeature;
    etaToPatientMin: number;
    etaToHospitalMin: number;
    distanceToPatientKm: number;
    distanceToHospitalKm: number;
}

interface InitConfig {
    mapboxToken: string;
    hospitals?: Hospital[];
}

interface RouteInfo {
    geojson: RouteFeature;
    distanceM: number;
    durationS: number;
}

interface DirectionsResponse {
    code: string;
    message?: string;
    routes?: { distance: number; duration: number; geometry: RouteFeature['geometry'] }[];
}

interface GeocodeResponse {
    features?: { geometry: { coordinates: [number, number] } }[];
}