import { useMap, useMapsLibrary, Map, AdvancedMarker } from "@vis.gl/react-google-maps";
import { useEffect, useMemo } from "react";

type LatLng = { lat: number; lng: number };

type MapPickerProps = {
    position: LatLng | null;
    searchQuery: string;
    onLocationChange: (pos: LatLng, inBucharest: boolean) => void;
    onAddressFromMap: (address: string) => void;
};

const BUCHAREST: LatLng = { lat: 44.4268, lng: 26.1025 };

const BUCHAREST_BOUNDS = { north: 44.5412, south: 44.3342, east: 26.2275, west: 25.969 };

function normalize(s: string) {
    return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function isInBucharest(results: google.maps.GeocoderResult[]) {
    return results.some((r) =>
        r.address_components.some(
            (c) =>
                c.types.includes("administrative_area_level_1") &&
                ["bucharest", "bucuresti"].includes(normalize(c.long_name))
        )
    );
}

export function MapPicker({ position, searchQuery, onLocationChange, onAddressFromMap }: MapPickerProps) {
    const map = useMap();
    const geocodingLib = useMapsLibrary("geocoding");
    const geocoder = useMemo(
        () => (geocodingLib ? new geocodingLib.Geocoder() : null),
        [geocodingLib]
    );

    useEffect(() => {
        if (!geocoder || !searchQuery.trim()) return;

        const timeout = setTimeout(() => {
            geocoder
                .geocode({ address: searchQuery, region: "RO", bounds: BUCHAREST_BOUNDS })
                .then(({ results }: google.maps.GeocoderResponse) => {
                    if (results[0]) {
                        const loc = results[0].geometry.location;
                        const pos = { lat: loc.lat(), lng: loc.lng() };
                        onLocationChange(pos, isInBucharest([results[0]]));
                        map?.panTo(pos);
                    }
                })
                .catch(() => { /* no result, ignore */ });
        }, 600);

        return () => clearTimeout(timeout);
    }, [searchQuery, geocoder, map, onLocationChange]);

    function handleMapClick(e: { detail: { latLng: LatLng | null } }) {
        const latLng = e.detail.latLng;
        if (!latLng || !geocoder) return;

        geocoder
            .geocode({ location: latLng })
            .then(({ results }: google.maps.GeocoderResponse) => {
                onLocationChange(latLng, isInBucharest(results));
                onAddressFromMap(results[0]?.formatted_address ?? "");
            })
            .catch(() => {
                onLocationChange(latLng, false);
                onAddressFromMap("");
            });
    }

    return (
        <div className="h-100 w-full">
            <Map
                mapId="DEMO_MAP_ID" //TODO change
                defaultCenter={BUCHAREST}
                defaultZoom={12}
                gestureHandling="greedy"
                disableDefaultUI
                zoomControl
                onClick={handleMapClick}
            >
                {position && <AdvancedMarker position={position} />}
            </Map>
        </div>
    );
}