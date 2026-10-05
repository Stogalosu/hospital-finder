'use client';

import { Card, CardContent } from "@/components/ui/card";
import { useState } from "react";
import NewRequestForm, {AiResult, isNonMedical} from "@/app/new-request/_components/NewRequestForm";
import { Button } from "@/components/ui/button";
import { AmbulanceMap } from "@/components/ambulance-map";
import type { MapPoint } from "@/components/base-map";
import { hospital_list } from "../../public/hospital_list";

export default function Home() {
    const [newRequestForm, setNewRequestForm] = useState(false);
    const [result, setResult] = useState<AiResult | null>(null);
    const [patient, setPatient] = useState<MapPoint | null>(null);

    const medical = result && !isNonMedical(result) ? result : null;
    const hospital = medical
        ? hospital_list.find((h) => h.id === medical.hospital.id)
        : undefined;

    function onSuccess(data: AiResult, pos: MapPoint) {
        setResult(data);
        setPatient(pos);
        setNewRequestForm(false);
    }

    function toggleForm() {
        if (!newRequestForm) {
            // starting a new request: clear the previous dispatch
            setResult(null);
            setPatient(null);
        }
        setNewRequestForm(!newRequestForm);
    }

    return (
        <div className="flex w-full min-h-full flex-col items-center py-32 px-[10%] gap-16 overflow-y-auto">
            <Card className="max-w-[60%] p-12 self-start">
                <CardContent>
                    <p className="text-7xl font-bold underline">Hospital finder</p>
                    <p className="text-2xl pt-4 pb-8">Your health, our path</p>
                </CardContent>
            </Card>
            <Card className="max-w-[60%] p-12 self-end">
                <CardContent>
                    {result && isNonMedical(result) ? (
                        <p className="text-lg">{result.message}</p>
                    ) : medical ? (
                        <div className="flex flex-col gap-2">
                            <p className="text-2xl font-bold">{medical.hospital.name}</p>
                            <p className="text-lg">Specialty: {medical.detected_specialty}</p>
                            <p className="text-lg">Triage: {medical.triage}</p>
                        </div>
                    ) : (
                        <p className="text-lg pt-4 pb-8"></p>
                    )}
                    {!result && <p className="text-lg">Awaiting request...</p> }
                </CardContent>
            </Card>

            {newRequestForm ? (
                <>
                    <p className="text-2xl font-bold pt-4">New request</p>
                    <NewRequestForm setSuccessfulRequest={onSuccess} />
                </>
            ) : (
                <div className="w-full">
                    {medical && !hospital && (
                        <p className="text-sm text-destructive pb-2">
                            Hospital "{medical.hospital.name}" was not found in the local list.
                        </p>
                    )}
                    <AmbulanceMap
                        patient={hospital ? patient : null}
                        hospital={hospital ?? hospital_list[0]}
                    />
                </div>
            )}

            <Button className="p-4 w-35 self-center" onClick={toggleForm}>
                {newRequestForm ? "Cancel request" : "New request"}
            </Button>
        </div>
    );
}