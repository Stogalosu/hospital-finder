'use client';

import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useRef, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import type { MapPoint } from "@/components/base-map";
import type { LocationPicker } from "@/hooks/use-location-picker";

const MAX_NAME_LENGTH = 25; // must be strictly less than this

export type MedicalResult = {
    status: string;           // anything other than "non-medical"
    detected_specialty: string;
    hospital: {
        id: number,
        name: string,
        type: string
    };
    triage: string;
};

export type NonMedicalResult = {
    status: "non-medical";
    message: string;
};

export type AiResult = MedicalResult | NonMedicalResult;

export function isNonMedical(r: AiResult): r is NonMedicalResult {
    return r.status === "non-medical";
}

type Props = {
    // The map (and its picker state) lives in the page, behind this pop-up
    picker: LocationPicker;
    // patient = the exact point the user picked, for the ambulance map
    setSuccessfulRequest: (data: AiResult, patient: MapPoint) => void;
};

// Pill-shaped dark fields from the design
const fieldClass =
    "h-9 rounded-full border-0 bg-[var(--hp-field)] px-4 text-white shadow-none placeholder:text-white/40 " +
    "focus-visible:ring-2 focus-visible:ring-white/70 aria-invalid:ring-2 aria-invalid:ring-red-400";
const labelClass = "text-white";
const errorClass = "text-sm text-red-400";

export default function NewRequestForm({ picker, setSuccessfulRequest }: Props) {

    const nameRef = useRef<HTMLInputElement>(null);
    const surnameRef = useRef<HTMLInputElement>(null);
    const ageRef = useRef<HTMLInputElement>(null);
    const phoneRef = useRef<HTMLInputElement>(null);
    const descriptionRef = useRef<HTMLTextAreaElement>(null);

    const [nameValid, setNameValid] = useState(true);
    const [surnameValid, setSurnameValid] = useState(true);
    const [ageValid, setAgeValid] = useState(true);
    const [phoneValid, setPhoneValid] = useState(true);
    const [descriptionValid, setDescriptionValid] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    function isNameValid(name: string) {
        const trimmed = name.trim();
        return trimmed.length > 0 && trimmed.length < MAX_NAME_LENGTH;
    }

    function isAgeValid(age: number) {
        return age >= 0 && age <= 120;
    }

    function isPhoneValid(phone: string) {
        const phoneNumber = Number(phone);
        if (phone.length == 0) return true;
        if (!isNaN(phoneNumber))
            return (phone.length == 10 && phone.charAt(0) == '0') ||
                (phone.length <= 16 && phone.charAt(0) == '+');
        else return false;
    }

    function isDescriptionValid(description: string) {
        return description.length > 0 && description.length <= 150;
    }

    function onSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();

        const surnameValue = surnameRef.current?.value ?? "";
        const isValidSurname = isNameValid(surnameValue);
        setSurnameValid(isValidSurname);

        const nameValue = nameRef.current?.value ?? "";
        const isValidName = isNameValid(nameValue);
        setNameValid(isValidName);

        const ageValue = Number(ageRef.current?.value ?? 0);
        const isValidAge = isAgeValid(ageValue);
        setAgeValid(isValidAge);

        const phoneValue = phoneRef.current?.value ?? "";
        const isValidPhone = isPhoneValid(phoneValue);
        setPhoneValid(isValidPhone);

        const descriptionValue = descriptionRef.current?.value ?? "";
        const isValidDescription = isDescriptionValid(descriptionValue);
        setDescriptionValid(isValidDescription);

        const locError = picker.validate();
        const position = picker.position;

        // `!position` is redundant with locError, but narrows the type below
        if (
            !isValidSurname || !isValidName || !isValidAge ||
            !isValidPhone || !isValidDescription || locError !== null || !position
        ) return;

        const payload = {
            text: descriptionValue,
            latitude: position.lat,
            longitude: position.lng,
            age: ageValue
        };

        const apiUrl = process.env.NEXT_PUBLIC_FLASK_API_URL;

        async function sendRequest(): Promise<AiResult> {
            const response = await fetch(`${apiUrl}/recommend`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            // throwing stops here, so an error body is never treated as a result
            if (!response.ok) throw new Error(`Server error: ${response.status}`);

            const data: AiResult = await response.json();
            setSuccessfulRequest(data, position!);
            return data;
        }

        const request = sendRequest();
        setSubmitting(true);
        request.catch(() => { /* the toast reports it */ }).finally(() => setSubmitting(false));

        toast.promise(request, {
            loading: "Processing data…",
            success: (data: AiResult) =>
                isNonMedical(data) ? data.message : data.detected_specialty,
            error: (e: unknown) => e instanceof Error ? e.message : "Something went wrong",
        });
    }

    return (
        <form onSubmit={onSubmit} className="w-full">
            <FieldGroup className="mx-auto w-full max-w-[26.5rem]">
                <div className="flex flex-row gap-8">
                    <Field data-invalid={!surnameValid ? "true" : "false"}>
                        <FieldLabel htmlFor="surname" className={labelClass}>Surname</FieldLabel>
                        <Input
                            id="surname"
                            name="surname"
                            type="text"
                            placeholder="Popescu"
                            ref={surnameRef}
                            className={fieldClass}
                            autoFocus
                            required
                            aria-invalid={!surnameValid ? "true" : "false"}
                        />
                        {!surnameValid && (
                            <p className={errorClass}>Must be under {MAX_NAME_LENGTH} characters.</p>
                        )}
                    </Field>
                    <Field data-invalid={!nameValid ? "true" : "false"}>
                        <FieldLabel htmlFor="name" className={labelClass}>First name</FieldLabel>
                        <Input
                            id="name"
                            name="name"
                            type="text"
                            placeholder="Ion"
                            ref={nameRef}
                            className={fieldClass}
                            required
                            aria-invalid={!nameValid ? "true" : "false"}
                        />
                        {!nameValid && (
                            <p className={errorClass}>Must be under {MAX_NAME_LENGTH} characters.</p>
                        )}
                    </Field>
                </div>
                <Field data-invalid={!ageValid ? "true" : "false"}>
                    <FieldLabel htmlFor="age" className={labelClass}>Age</FieldLabel>
                    <Input
                        id="age"
                        name="age"
                        type="number"
                        placeholder="18"
                        ref={ageRef}
                        className={fieldClass}
                        required
                        aria-invalid={!ageValid ? "true" : "false"}
                    />
                </Field>
                <Field data-invalid={!phoneValid ? "true" : "false"}>
                    <FieldLabel htmlFor="phone" className={labelClass}>Phone number</FieldLabel>
                    <Input
                        id="phone"
                        name="phone"
                        type="text"
                        placeholder="07xxxxxxxx"
                        ref={phoneRef}
                        className={fieldClass}
                        aria-invalid={!phoneValid ? "true" : "false"}
                    />
                </Field>
                <Field data-invalid={!descriptionValid ? "true" : "false"}>
                    <FieldLabel htmlFor="description" className={labelClass}>Describe your symptoms:</FieldLabel>
                    <Textarea
                        id="description"
                        name="description"
                        placeholder="What's wrong?"
                        ref={descriptionRef}
                        className={`${fieldClass} min-h-[4.5rem] rounded-[1.4rem] py-3`}
                        required
                        aria-invalid={!descriptionValid ? "true" : "false"}
                        rows={3}
                    />
                </Field>
                <Field data-invalid={picker.locationError ? "true" : "false"}>
                    <FieldLabel htmlFor="address" className={labelClass}>Address</FieldLabel>
                    <Input
                        id="address"
                        name="address"
                        type="text"
                        placeholder="Str. Ion Mincu nr 10"
                        value={picker.address}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            picker.onAddressInput(e.currentTarget.value)
                        }
                        className={fieldClass}
                        required
                        aria-invalid={picker.locationError ? "true" : "false"}
                    />
                    {picker.locationError && (
                        <p className={errorClass}>{picker.locationError}</p>
                    )}
                </Field>
                <Field className="w-auto self-center pt-6">
                    <Button
                        type="submit"
                        variant="default"
                        className="h-9 rounded-full bg-[var(--hp-accent)] px-8 text-white hover:bg-[#2249d6] disabled:opacity-50"
                        disabled={submitting || (picker.position !== null && !picker.inBucharest)}
                    >
                        Submit
                    </Button>
                </Field>
            </FieldGroup>
        </form>
    );
}
