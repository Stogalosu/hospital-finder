'use client';

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/site-header";
import { AmbulanceMap } from "@/components/ambulance-map";
import { RequestModal } from "@/components/request-modal";
import type { MapPoint } from "@/components/base-map";
import NewRequestForm, { AiResult, isNonMedical } from "@/app/new-request/_components/NewRequestForm";
import { useLocationPicker } from "@/hooks/use-location-picker";
import { hospital_list } from "../../public/hospital_list";

export default function Home() {
    const [formOpen, setFormOpen] = useState(false);
    const [result, setResult] = useState<AiResult | null>(null);
    const [patient, setPatient] = useState<MapPoint | null>(null);
    const [dispatch, setDispatch] = useState<DispatchResult | null>(null);
    const picker = useLocationPicker();

    const medical = result && !isNonMedical(result) ? result : null;

    // The API returns only the hospital id/name, so look up the coordinates locally
    const hospital = medical
        ? hospital_list.find((h) => h.id === medical.hospital.id)
        : undefined;

    function openForm() {
        // starting a new request: clear the previous dispatch and picked location
        setResult(null);
        setPatient(null);
        setDispatch(null);
        picker.reset();
        setFormOpen(true);
    }

    function onSuccess(data: AiResult, pos: MapPoint) {
        setResult(data);
        setPatient(pos);
        setFormOpen(false); // the pop-up closes, so the map below shows the dispatch
    }

    return (
        <div className="flex min-h-dvh flex-col bg-[var(--hp-bg)]">
            <SiteHeader />

            {/* The map card fills the rest of the screen, like the reference */}
            <main className="relative min-h-[28rem] flex-1">
                <div className="absolute inset-x-4 bottom-4 top-0 sm:inset-x-12 sm:bottom-12">
                    <AmbulanceMap
                        className="h-full w-full"
                        patient={hospital ? patient : null}
                        hospital={hospital ?? null}
                        onResult={setDispatch}
                        // While the form is open the map is clickable and shows the selected point
                        picking={
                            formOpen
                                ? { position: picker.position, focus: picker.focus, onPick: picker.pickPoint }
                                : null
                        }
                    />

                    {result && (
                        <aside
                            aria-live="polite"
                            className="absolute left-4 top-4 max-w-xs rounded-3xl bg-[var(--hp-modal)]/90 p-5 text-white shadow-xl backdrop-blur-sm"
                        >
                            {isNonMedical(result) ? (
                                <p className="text-sm">{result.message}</p>
                            ) : (
                                <>
                                    <p className="text-lg font-semibold leading-tight">{result.hospital.name}</p>
                                    <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
                                        <dt className="text-white/60">Specialty</dt>
                                        <dd>{result.detected_specialty}</dd>
                                        <dt className="text-white/60">Triage</dt>
                                        <dd>{result.triage}</dd>
                                        {dispatch && (
                                            <>
                                                <dt className="text-white/60">Ambulance</dt>
                                                <dd>
                                                    #{dispatch.ambulanceId} arrives in {dispatch.etaToPatientMin} min
                                                    ({dispatch.distanceToPatientKm} km)
                                                </dd>
                                                <dt className="text-white/60">Hospital</dt>
                                                <dd>
                                                    {dispatch.etaToHospitalMin} min after pickup
                                                    ({dispatch.distanceToHospitalKm} km)
                                                </dd>
                                            </>
                                        )}
                                    </dl>
                                    {!hospital && (
                                        <p className="mt-3 text-sm text-red-400">
                                            This hospital is not in the local list, so no route can be drawn.
                                        </p>
                                    )}
                                </>
                            )}
                        </aside>
                    )}

                    {!formOpen && (
                        <Button
                            onClick={openForm}
                            className="absolute bottom-6 left-1/2 h-10 -translate-x-1/2 rounded-full bg-[var(--hp-accent)] px-8 text-white shadow-lg hover:bg-[#2249d6]"
                        >
                            New request
                        </Button>
                    )}
                </div>
            </main>

            <RequestModal open={formOpen} onClose={() => setFormOpen(false)} title="New request">
                <NewRequestForm picker={picker} setSuccessfulRequest={onSuccess} />
            </RequestModal>
        </div>
    );
}
