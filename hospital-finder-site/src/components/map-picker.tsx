'use client';

import { useEffect, useState } from "react";
import { BaseMap, MapPoint } from "@/components/base-map";

type MapPickerProps = {
    position: MapPoint | null;
    searchQuery: string;
    onLocationChange: (pos: MapPoint, inBucharest: boolean) => void;
    onAddressFromMap: (address: string) => void;
};

const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";
const BUCHAREST: MapPoint = { lat: 44.4268, lng: 26.1025 };
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

// Bucharest can show up as the region, the place, or a district, depending on the result
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

async function reverseGeocode({ lat, lng }: MapPoint): Promise<GeocodeFeature | undefined> {
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
    const [focus, setFocus] = useState<MapPoint | null>(null);

    // Typed address -> move the marker (debounced)
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
                    setFocus(pos); // BaseMap flies there
                })
                .catch(() => { /* aborted or no result, ignore */ });
        }, 600);

        return () => {
            clearTimeout(timeout);
            controller.abort();
        };
    }, [searchQuery, onLocationChange]);

    // Map click -> reverse geocode, then move the marker + fill the address input
    function handleMapClick(point: MapPoint) {
        reverseGeocode(point)
            .then((feature) => {
                onLocationChange(point, isInBucharest(feature));
                onAddressFromMap(addressOf(feature));
            })
            .catch(() => {
                // Couldn't resolve the point: treat it as outside Bucharest
                onLocationChange(point, false);
                onAddressFromMap("");
            });
    }

    return (
        <BaseMap
            markers={position ? [{ id: "selected", position }] : []}
            focus={focus}
            onClick={handleMapClick}
        />
    );
}