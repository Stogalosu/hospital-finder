'use client';

import Map, { Marker, Source, Layer, MapRef, MapMouseEvent } from "react-map-gl/mapbox";
import type { LayerProps } from "react-map-gl/mapbox";
import type { FeatureCollection } from "geojson";
import "mapbox-gl/dist/mapbox-gl.css";
import { useEffect, useMemo, useRef, useState } from "react";

export type MapPoint = { lat: number; lng: number };

export type MapMarker = {
    id: string;
    position: MapPoint;
    color?: string;
    element?: React.ReactNode; // custom marker content; replaces the default pin
    onClick?: () => void;
};

export type MapPath = {
    id: string;
    coordinates: MapPoint[];   // in order, from start to end
    color?: string;
    width?: number;
};

export type BaseMapProps = {
    markers?: MapMarker[];
    paths?: MapPath[];
    onClick?: (pos: MapPoint) => void;
    focus?: MapPoint | null;            // flies to this point whenever it changes
    fitBounds?: boolean | MapPoint[];   // true = fit all markers and paths; array = fit just these points
    center?: MapPoint;
    zoom?: number;
    mapStyle?: string;
    className?: string;
};

const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";
const DEFAULT_CENTER: MapPoint = { lat: 44.4268, lng: 26.1025 }; // Bucharest
const DEFAULT_STYLE =
    process.env.NEXT_PUBLIC_MAPBOX_STYLE ?? "mapbox://styles/mapbox/streets-v12";

const pathCasingLayer: LayerProps = {
    id: "paths-casing",
    type: "line",
    layout: { "line-cap": "round", "line-join": "round" },
    paint: {
        "line-color": "#ffffff",
        "line-width": ["+", ["get", "width"], 4], // 2px outline on each side
        "line-opacity": 0.9,
    },
};

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

    // One FeatureCollection holds all paths; color and width are read per feature
    const pathsGeoJson = useMemo<FeatureCollection>(
        () => ({
            type: "FeatureCollection",
            features: paths
                .filter((p) => p.coordinates.length >= 2)
                .map((p) => ({
                    type: "Feature" as const,
                    properties: { color: p.color ?? "#2563eb", width: p.width ?? 4 },
                    geometry: {
                        type: "LineString" as const,
                        coordinates: p.coordinates.map((c) => [c.lng, c.lat]),
                    },
                })),
        }),
        [paths]
    );

    // Fly to a point when `focus` changes
    useEffect(() => {
        if (!loaded || !focus) return;
        mapRef.current?.flyTo({ center: [focus.lng, focus.lat], duration: 800 });
    }, [loaded, focus?.lat, focus?.lng]); // eslint-disable-line react-hooks/exhaustive-deps

    // Fit the camera. The key avoids re-fitting when only array identities change
    const fitPoints: MapPoint[] = Array.isArray(fitBounds)
        ? fitBounds
        : fitBounds
            ? [...markers.map((m) => m.position), ...paths.flatMap((p) => p.coordinates)]
            : [];
    const fitKey = JSON.stringify(fitPoints);

    useEffect(() => {
        if (!loaded || fitPoints.length === 0) return;
        const lngs = fitPoints.map((p) => p.lng);
        const lats = fitPoints.map((p) => p.lat);
        mapRef.current?.fitBounds(
            [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]],
            { padding: 60, maxZoom: 16, duration: 800 }
        );
    }, [loaded, fitKey]); // eslint-disable-line react-hooks/exhaustive-deps

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
                style={{ width: "100%", height: "100%", aspectRatio: "square"}}
                onLoad={() => setLoaded(true)}
                onClick={handleClick}
            >
                {pathsGeoJson.features.length > 0 && (
                    <Source id="paths" type="geojson" data={pathsGeoJson}>
                        <Layer {...pathCasingLayer} />
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
                            // don't let a marker click also count as a map click
                            e.originalEvent.stopPropagation();
                            m.onClick?.();
                        }}
                    >
                        {m.element}
                    </Marker>
                ))}
            </Map>
        </div>
    );
}