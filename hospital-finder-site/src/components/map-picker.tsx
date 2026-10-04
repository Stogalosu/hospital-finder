'use client';

import Map, { Marker, MapRef, MapMouseEvent } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import { useEffect, useRef } from "react";

type LatLng = { lat: number; lng: number };

type MapPickerProps = {
    position: LatLng | null;
    searchQuery: string;
    onLocationChange: (pos: LatLng, inBucharest: boolean) => void;
    onAddressFromMap: (address: string) => void;
};

const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";
const BUCHAREST: LatLng = { lat: 44.4268, lng: 26.1025 };
const GEOCODING_URL = "https://api.mapbox.com/search/geocode/v6";

type GeocodeFeature = {
    geometry: { coordinates: [number, number] }; // [lng, lat]
    properties: {
        full_address?: string;
        place_formatted?: string;
        name?: string;
        context?: Record<string, { name?: string } | undefined>;
    };
};

function normalize(s: string) {
    return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function isInBucharest(feature: GeocodeFeature | undefined) {
    const ctx = feature?.properties.context;
    if (!ctx) return false;
    return ["region", "place", "district", "locality"].some((key) => {
        const name = ctx[key]?.name;
        return !!name && ["bucharest", "bucuresti"].includes(normalize(name));
    });
}

function addressOf(feature: GeocodeFeature | undefined) {
    const p = feature?.properties;
    return p?.full_address ?? p?.place_formatted ?? p?.name ?? "";
}

async function forwardGeocode(query: string, signal: AbortSignal): Promise<GeocodeFeature | undefined> {
    const params = new URLSearchParams({
        q: query,
        access_token: TOKEN,
        country: "ro",
        language: "en",
        limit: "1",
        proximity: `${BUCHAREST.lng},${BUCHAREST.lat}`, // bias towards Bucharest, don't hard-restrict
    });
    const res = await fetch(`${GEOCODING_URL}/forward?${params}`, { signal });
    if (!res.ok) throw new Error("Geocoding failed");
    const data: { features: GeocodeFeature[] } = await res.json();
    return data.features[0];
}

async function reverseGeocode({ lat, lng }: LatLng): Promise<GeocodeFeature | undefined> {
    const params = new URLSearchParams({
        longitude: String(lng),
        latitude: String(lat),
        access_token: TOKEN,
        language: "en",
        limit: "1",
    });
    const res = await fetch(`${GEOCODING_URL}/reverse?${params}`);
    if (!res.ok) throw new Error("Reverse geocoding failed");
    const data: { features: GeocodeFeature[] } = await res.json();
    return data.features[0];
}

export function MapPicker({ position, searchQuery, onLocationChange, onAddressFromMap }: MapPickerProps) {
    const mapRef = useRef<MapRef>(null);

    useEffect(() => {
        if (!searchQuery.trim()) return;

        const controller = new AbortController();
        const timeout = setTimeout(() => {
            forwardGeocode(searchQuery, controller.signal)
                .then((feature) => {
                    if (!feature) return;
                    const [lng, lat] = feature.geometry.coordinates;
                    const pos = { lat, lng };
                    onLocationChange(pos, isInBucharest(feature));
                    mapRef.current?.flyTo({ center: [lng, lat], duration: 800 });
                })
                .catch(() => { /* aborted or no result, ignore */ });
        }, 600);

        return () => {
            clearTimeout(timeout);
            controller.abort();
        };
    }, [searchQuery, onLocationChange]);

    function handleMapClick(e: MapMouseEvent) {
        const latLng = { lat: e.lngLat.lat, lng: e.lngLat.lng };

        reverseGeocode(latLng)
            .then((feature) => {
                onLocationChange(latLng, isInBucharest(feature));
                onAddressFromMap(addressOf(feature));
            })
            .catch(() => {
                onLocationChange(latLng, false);
                onAddressFromMap("");
            });
    }

    return (
        <div className="h-100 w-full">
            <Map
                ref={mapRef}
                mapboxAccessToken={TOKEN}
                initialViewState={{ latitude: BUCHAREST.lat, longitude: BUCHAREST.lng, zoom: 11 }}
                mapStyle="mapbox://styles/stogalosu/cmuu5zh7e009301s8385q4sp6"
                style={{ width: "100%", height: "100%" }}
                onClick={handleMapClick}
            >
                {position && <Marker latitude={position.lat} longitude={position.lng} />}
            </Map>
        </div>
    );
}