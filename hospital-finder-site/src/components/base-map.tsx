'use client';

import Map, { Marker, Source, Layer, MapRef, MapMouseEvent } from "react-map-gl/mapbox";
import type { LayerProps } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import { useEffect, useMemo, useRef, useState } from "react";
import type { FeatureCollection } from "geojson";

export type LatLng = { lat: number; lng: number };

export type MapMarker = {
    id: string;
    position: LatLng;
    color?: string;
    onClick?: () => void;
};

export type MapPath = {
    id: string;
    coordinates: LatLng[];
    color?: string;
    width?: number;
};

export type BaseMapProps = {
    markers?: MapMarker[];
    paths?: MapPath[];
    onClick?: (pos: LatLng) => void;
    focus?: LatLng | null;
    fitBounds?: boolean;
    center?: LatLng;
    zoom?: number;
    mapStyle?: string;
    className?: string;
};

const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";
const DEFAULT_CENTER: LatLng = { lat: 44.4268, lng: 26.1025 };
const DEFAULT_STYLE =
    process.env.NEXT_PUBLIC_MAPBOX_STYLE ?? "mapbox://styles/stogalosu/cmuu5zh7e009301s8385q4sp6";

const pathLayer: LayerProps = {
    id: "paths-line",
    type: "line",
    layout: { "line-cap": "round", "line-join": "round" },
    paint: {
        "line-color": ["get", "color"],
        "line-width": ["get", "width"],
    },
};

export function BaseMap({
                            markers = [],
                            paths = [],
                            onClick,
                            focus,
                            fitBounds = false,
                            center = DEFAULT_CENTER,
                            zoom = 11,
                            mapStyle = DEFAULT_STYLE,
                            className = "h-100 w-full",
                        }: BaseMapProps) {
    const mapRef = useRef<MapRef>(null);
    const [loaded, setLoaded] = useState(false);

    const pathsGeoJson = useMemo<FeatureCollection>(
        () => ({
            type: "FeatureCollection",
            features: paths
                .filter((p) => p.coordinates.length >= 2)
                .map((p) => ({
                    type: "Feature",
                    properties: { color: p.color ?? "#2563eb", width: p.width ?? 4 },
                    geometry: {
                        type: "LineString",
                        coordinates: p.coordinates.map((c) => [c.lng, c.lat]),
                    },
                })),
        }),
        [paths]
    );

    useEffect(() => {
        if (!loaded || !focus) return;
        mapRef.current?.flyTo({ center: [focus.lng, focus.lat], duration: 800 });
    }, [loaded, focus?.lat, focus?.lng]);

    const contentKey = JSON.stringify([
        markers.map((m) => m.position),
        paths.map((p) => p.coordinates),
    ]);
    useEffect(() => {
        if (!loaded || !fitBounds) return;
        const points = [...markers.map((m) => m.position), ...paths.flatMap((p) => p.coordinates)];
        if (points.length === 0) return;

        const lngs = points.map((p) => p.lng);
        const lats = points.map((p) => p.lat);
        mapRef.current?.fitBounds(
            [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]],
            { padding: 60, maxZoom: 16, duration: 800 }
        );
    }, [loaded, fitBounds, contentKey]);

    function handleClick(e: MapMouseEvent) {
        onClick?.({ lat: e.lngLat.lat, lng: e.lngLat.lng });
    }

    return (
        <div className={className}>
            <Map
                ref={mapRef}
                mapboxAccessToken={TOKEN}
                initialViewState={{ latitude: center.lat, longitude: center.lng, zoom }}
                mapStyle={mapStyle}
                style={{ width: "100%", height: "100%" }}
                onLoad={() => setLoaded(true)}
                onClick={handleClick}
            >
                {pathsGeoJson.features.length > 0 && (
                    <Source id="paths" type="geojson" data={pathsGeoJson}>
                        <Layer {...pathLayer} />
                    </Source>
                )}

                {markers.map((m) => (
                    <Marker
                        key={m.id}
                        latitude={m.position.lat}
                        longitude={m.position.lng}
                        color={m.color}
                        onClick={(e) => {
                            e.originalEvent.stopPropagation();
                            m.onClick?.();
                        }}
                    />
                ))}
            </Map>
        </div>
    );
}