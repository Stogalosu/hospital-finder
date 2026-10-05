'use client';

import { useEffect, useMemo, useState } from "react";
import { BaseMap, MapMarker, MapPath, MapPoint } from "@/components/base-map";
import { getFleet, dispatchAmbulance } from "@/lib/ambulance-sim";
import { toLatLng, toMapPoint, routeToPath } from "@/lib/map-convert";
import { cn } from "@/lib/utils";

// When set, the map accepts clicks and shows the selected point (used behind the request form)
export type PickingProps = {
    position: MapPoint | null;
    focus: MapPoint | null;
    onPick: (point: MapPoint) => void;
};

type Props = {
    patient: MapPoint | null;
    hospital: Hospital | null;
    picking?: PickingProps | null;
    onResult?: (result: DispatchResult | null) => void;
    className?: string;
};

// Pointer events off, so a click on a dot still reaches the map while picking a location
const fleetDot = (
    <div className="pointer-events-none size-6 rounded-full border-[3px] border-[#eef3f5] bg-[#727587]" />
);
const dispatchedDot = (
    <div className="pointer-events-none size-7 rounded-full border-[3px] border-white bg-amber-400 shadow-[0_0_0_6px_rgba(251,191,36,0.28)]" />
);

export function AmbulanceMap({ patient, hospital, picking, onResult, className }: Props) {
    const [fleet, setFleet] = useState<Ambulance[]>([]);
    const [result, setResult] = useState<DispatchResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    // SHOW AMBULANCES: the fleet is snapped to roads (async), client-side only
    useEffect(() => {
        let cancelled = false;
        getFleet()
            .then((f) => { if (!cancelled) setFleet(f); })
            .catch((e) => {
                if (!cancelled) setError(e instanceof Error ? e.message : "Could not load the fleet");
            });
        return () => { cancelled = true; };
    }, []);

    // GET THE ROUTE: dispatch whenever the patient or hospital changes
    useEffect(() => {
        if (!patient || !hospital || fleet.length === 0) {
            setResult(null);
            onResult?.(null);
            return;
        }
        let cancelled = false; // ignore stale responses
        setError(null);
        dispatchAmbulance(toLatLng(patient), hospital)
            .then((r) => {
                if (cancelled) return;
                setResult(r);
                onResult?.(r);
            })
            .catch((e) => {
                if (cancelled) return;
                setResult(null);
                onResult?.(null);
                setError(e instanceof Error ? e.message : "Dispatch failed");
            });
        return () => { cancelled = true; };
    }, [fleet, patient?.lat, patient?.lng, hospital]); // eslint-disable-line react-hooks/exhaustive-deps

    // RENDER AMBULANCES: fleet as grey dots, the dispatched one highlighted
    const markers = useMemo<MapMarker[]>(() => {
        const list: MapMarker[] = fleet
            .filter((a) => a.id !== result?.ambulanceId)
            .map((a) => ({ id: `amb-${a.id}`, position: toMapPoint(a), element: fleetDot }));

        if (result && hospital) {
            list.push({ id: "dispatched", position: toMapPoint(result.ambulancePosition), element: dispatchedDot });
            list.push({ id: "patient", position: toMapPoint(result.patient), color: "#dc2626" });
            list.push({ id: "hospital", position: toMapPoint(hospital.coordinates), color: "#06b6d4" });
        }
        if (picking?.position) {
            list.push({ id: "selected", position: picking.position, color: "#dc2626" });
        }
        return list;
    }, [fleet, result, hospital, picking?.position]);

    // DISPLAY THE ROUTES (bright colors, readable on the navy map)
    const toPatientPath = useMemo(() => (result ? routeToPath(result.toPatient) : []), [result]);
    const toHospitalPath = useMemo(() => (result ? routeToPath(result.toHospital) : []), [result]);

    const paths = useMemo<MapPath[]>(
        () => result
            ? [
                { id: "to-patient", coordinates: toPatientPath, color: "#fbbf24", width: 5 },  // amber
                { id: "to-hospital", coordinates: toHospitalPath, color: "#22d3ee", width: 5 }, // cyan
            ]
            : [],
        [result, toPatientPath, toHospitalPath]
    );

    // Frame only the routes, not the whole fleet
    const fitPoints = useMemo(
        () => [...toPatientPath, ...toHospitalPath],
        [toPatientPath, toHospitalPath]
    );

    return (
        <div className={cn("relative overflow-hidden rounded-[30px] bg-[var(--hp-map)]", className)}>
            <BaseMap
                className="h-full w-full"
                zoom={12}
                markers={markers}
                paths={paths}
                fitBounds={fitPoints}
                focus={picking?.focus ?? null}
                onClick={picking?.onPick}
            />
            {error && (
                <p
                    role="alert"
                    className="absolute bottom-4 right-4 max-w-xs rounded-2xl bg-[var(--hp-modal)]/90 px-4 py-2 text-sm text-red-400"
                >
                    {error}
                </p>
            )}
        </div>
    );
}
