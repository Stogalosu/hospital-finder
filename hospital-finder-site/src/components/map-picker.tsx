import {useMap, useMapsLibrary, Map, AdvancedMarker} from "@vis.gl/react-google-maps";
import {useEffect, useMemo} from "react";

type MapPickerProps = {
    position: LatLng | null;
    searchQuery: string;
    onPositionChange: (pos: LatLng) => void;
    onAddressFromMap: (address: string) => void;
};

type LatLng = { lat: number; lng: number };

const BUCHAREST: LatLng = { lat: 44.4268, lng: 26.1025 };

export function MapPicker({ position, searchQuery, onPositionChange, onAddressFromMap }: MapPickerProps) {
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
                .geocode({ address: searchQuery, region: "RO" })
                .then(({ results }: google.maps.GeocoderResponse) => {
                    if (results[0]) {
                        const loc = results[0].geometry.location;
                        const pos = { lat: loc.lat(), lng: loc.lng() };
                        onPositionChange(pos);
                        map?.panTo(pos);
                    }
                })
                .catch(() => { /* no result, ignore */ });
        }, 600);

        return () => clearTimeout(timeout);
    }, [searchQuery, geocoder, map, onPositionChange]);

    function handleMapClick(e: { detail: { latLng: LatLng | null } }) {
        const latLng = e.detail.latLng;
        if (!latLng) return;

        onPositionChange(latLng);

        geocoder
            ?.geocode({ location: latLng })
            .then(({ results }: google.maps.GeocoderResponse) => {
                onAddressFromMap(results[0]?.formatted_address ?? "");
            })
            .catch(() => onAddressFromMap(""));
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