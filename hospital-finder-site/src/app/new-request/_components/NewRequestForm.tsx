'use client';

import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useCallback, useRef, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { MapPicker } from "@/components/map-picker";

type LatLng = { lat: number; lng: number };

const MAX_NAME_LENGTH = 25; // must be strictly less than this

const MSG_MISSING = "Please enter a valid address or click a point on the map.";
const MSG_OUTSIDE = "The location must be inside Bucharest.";

export default function NewRequestForm() {

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
    const [locationError, setLocationError] = useState<string | null>(null);

    const [address, setAddress] = useState("");           // what the input shows
    const [searchQuery, setSearchQuery] = useState("");   // only set when the user types
    const [position, setPosition] = useState<LatLng | null>(null);
    const [inBucharest, setInBucharest] = useState(false);

    const handleLocationChange = useCallback((pos: LatLng, isInside: boolean) => {
        setPosition(pos);
        setInBucharest(isInside);
        setLocationError(isInside ? null : MSG_OUTSIDE);
    }, []);

    function isNameValid(name: string) {
        const trimmed = name.trim();
        return trimmed.length > 0 && trimmed.length < MAX_NAME_LENGTH;
    }

    function isAgeValid(age: number) {
        return age >= 0 && age <= 120;
    }

    function isPhoneValid(phone: string) {
        const phoneNumber = Number(phone);
        if(phone.length == 0) return true;
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

        let locError: string | null = null;
        if (position === null) locError = MSG_MISSING;
        else if (!inBucharest) locError = MSG_OUTSIDE;
        setLocationError(locError);

        if (
            !isValidSurname || !isValidName || !isValidAge ||
            !isValidPhone || !isValidDescription || locError !== null
        ) return;

        const payload = {
            surname: surnameValue.trim(),
            name: nameValue.trim(),
            age: ageValue,
            phone: phoneValue,
            description: descriptionValue,
            address,
            coordinates: position,
        };

        console.log(payload); // TODO: send to your API
    }

    return (
        <form onSubmit={onSubmit} className="w-full max-w-sm">
            <FieldGroup>
                <div className="flex flex-row gap-8">
                    <Field data-invalid={!surnameValid ? "true" : "false"}>
                        <FieldLabel htmlFor="surname">Surname</FieldLabel>
                        <Input
                            id="surname"
                            name="surname"
                            type="text"
                            placeholder="Popescu"
                            ref={surnameRef}
                            required
                            aria-invalid={!surnameValid ? "true" : "false"}
                        />
                        {!surnameValid && (
                            <p className="text-sm text-destructive">
                                Must be under {MAX_NAME_LENGTH} characters.
                            </p>
                        )}
                    </Field>
                    <Field data-invalid={!nameValid ? "true" : "false"}>
                        <FieldLabel htmlFor="name">First name</FieldLabel>
                        <Input
                            id="name"
                            name="name"
                            type="text"
                            placeholder="Ion"
                            ref={nameRef}
                            required
                            aria-invalid={!nameValid ? "true" : "false"}
                        />
                        {!nameValid && (
                            <p className="text-sm text-destructive">
                                Must be under {MAX_NAME_LENGTH} characters.
                            </p>
                        )}
                    </Field>
                </div>
                <Field data-invalid={!ageValid ? "true" : "false"}>
                    <FieldLabel htmlFor="age">Age</FieldLabel>
                    <Input
                        id="age"
                        name="age"
                        type="number"
                        placeholder="18"
                        ref={ageRef}
                        required
                        aria-invalid={!ageValid ? "true" : "false"}
                    />
                </Field>
                <Field data-invalid={!phoneValid ? "true" : "false"}>
                    <FieldLabel htmlFor="phone">Phone number</FieldLabel>
                    <Input
                        id="phone"
                        name="phone"
                        type="text"
                        placeholder="07xxxxxxxx"
                        ref={phoneRef}
                        aria-invalid={!phoneValid ? "true" : "false"}
                    />
                </Field>
                <Field data-invalid={!descriptionValid ? "true" : "false"}>
                    <FieldLabel htmlFor="description">Describe your symptoms:</FieldLabel>
                    <Textarea
                        id="description"
                        name="description"
                        placeholder="What's wrong?"
                        ref={descriptionRef}
                        required
                        aria-invalid={!descriptionValid ? "true" : "false"}
                        rows={10}
                    />
                </Field>
                <Field data-invalid={locationError ? "true" : "false"}>
                    <FieldLabel htmlFor="address">Address</FieldLabel>
                    <Input
                        id="address"
                        name="address"
                        type="text"
                        placeholder="Str. Ion Mincu nr 10"
                        value={address}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                            setAddress(e.currentTarget.value);
                            setSearchQuery(e.currentTarget.value); // triggers forward geocoding
                        }}
                        required
                        aria-invalid={locationError ? "true" : "false"}
                    />
                    {locationError && (
                        <p className="text-sm text-destructive">{locationError}</p>
                    )}
                </Field>
                <Field>
                    <MapPicker
                        position={position}
                        searchQuery={searchQuery}
                        onLocationChange={handleLocationChange}
                        onAddressFromMap={setAddress} // does NOT touch searchQuery
                    />
                </Field>
                <Field className="self-center w-25 pt-6">
                    <Button
                        type="submit"
                        variant="default"
                        disabled={position !== null && !inBucharest}
                    >
                        Submit
                    </Button>
                </Field>
            </FieldGroup>
        </form>
    );
}