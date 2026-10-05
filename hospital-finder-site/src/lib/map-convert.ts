import type { MapPoint } from "@/components/base-map";

export const toMapPoint = (p: LatLng): MapPoint => ({ lat: p.latitude, lng: p.longitude });
export const toLatLng = (p: MapPoint): LatLng => ({ latitude: p.lat, longitude: p.lng });

// RouteFeature coordinates are [lng, lat] pairs
export const routeToPath = (f: RouteFeature): MapPoint[] =>
    f.geometry.coordinates.map(([lng, lat]) => ({ lat, lng }));