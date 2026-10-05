'use client';

import { useEffect, useMemo, useState } from "react";
import { BaseMap, MapMarker, MapPath, MapPoint } from "@/components/base-map";
import { getFleet, dispatchAmbulance } from "@/lib/ambulance-sim";
import { toLatLng, toMapPoint, routeToPath } from "@/lib/map-convert";

type Props = {
    patient: MapPoint | null;
    hospital: Hospital;
    onResult?: (result: DispatchResult) => void;
};

const dot = (size: string, bg: string) => (
    <div className={`${size} rounded-full border-2 border-white shadow ${bg}`} />
);

export function AmbulanceMap({ patient, hospital, onResult }: Props) {
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
        if (!patient || fleet.length === 0) {
            setResult(null);
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
                setError(e instanceof Error ? e.message : "Dispatch failed");
            });
        return () => { cancelled = true; };
    }, [fleet, patient?.lat, patient?.lng, hospital]); // eslint-disable-line react-hooks/exhaustive-deps

    // RENDER AMBULANCES: fleet as grey dots, the dispatched one highlighted
    const markers = useMemo<MapMarker[]>(() => {
        const list: MapMarker[] = fleet
            .filter((a) => a.id !== result?.ambulanceId)
            .map((a) => ({
                id: `amb-${a.id}`,
                position: toMapPoint(a),
                element: dot("size-3", "bg-gray-500"),
            }));

        if (result) {
            list.push({
                id: "dispatched",
                position: toMapPoint(result.ambulancePosition),
                element: dot("size-5", "bg-amber-500"),
            });
            list.push({ id: "patient", position: toMapPoint(result.patient), color: "#dc2626" });
            list.push({ id: "hospital", position: toMapPoint(hospital.coordinates), color: "#06b6d4" });
        }
        return list;
    }, [fleet, result, hospital]);

    // DISPLAY THE ROUTES
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
        <div className="flex flex-col gap-2">
            <BaseMap
                markers={markers}
                paths={paths}
                fitBounds={fitPoints}
                className="aspect-square w-full max-x-2xl"
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            {result && (
                <p className="text-sm">
                    Ambulance #{result.ambulanceId}: {result.etaToPatientMin} min to patient
                    ({result.distanceToPatientKm} km), then {result.etaToHospitalMin} min to{" "}
                    {result.hospitalName} ({result.distanceToHospitalKm} km).
                </p>
            )}
        </div>
    );
}