'use client';

import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useRef, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {APIProvider} from "@vis.gl/react-google-maps";
import {MapPicker} from "@/components/map-picker";

type LatLng = { lat: number; lng: number };

export default function NewRequestForm() {
    const apiKey: string = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

    const nameRef = useRef<HTMLInputElement>(null);
    const surnameRef = useRef<HTMLInputElement>(null);
    const ageRef = useRef<HTMLInputElement>(null);
    const phoneRef = useRef<HTMLInputElement>(null);
    const descriptionRef = useRef<HTMLTextAreaElement>(null);

    const [ageValid, setAgeValid] = useState(true);
    const [phoneValid, setPhoneValid] = useState(true);
    const [descriptionValid, setDescriptionValid] = useState(true);
    const [locationValid, setLocationValid] = useState(true);

    const [address, setAddress] = useState("");           // what the input shows
    const [searchQuery, setSearchQuery] = useState("");   // only set when the user types
    const [position, setPosition] = useState<LatLng | null>(null);

    function isAgeValid(age: number) {
        return age >= 0 && age <= 120;
    }

    function isPhoneValid(phone: string) {
        const phoneNumber = Number(phone);
        if (!isNaN(phoneNumber))
            return (phone.length == 10 && phone.charAt(0) == '0') ||
                (phone.length <= 16 && phone.charAt(0) == '+');
        else return false;
    }

    function isDescriptionValid(description: string) {
        return description.length > 0 && description.length <= 200;
    }

    function onSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();

        const ageValue = Number(ageRef.current?.value ?? 0);
        const isValidAge = isAgeValid(ageValue);
        setAgeValid(isValidAge);

        const phoneValue = phoneRef.current?.value ?? "";
        const isValidPhone = isPhoneValid(phoneValue);
        setPhoneValid(isValidPhone);

        const descriptionValue = descriptionRef.current?.value ?? "";
        const isValidDescription = isDescriptionValid(descriptionValue);
        setDescriptionValid(isValidDescription);

        const isValidLocation = position !== null;
        setLocationValid(isValidLocation);

        if (!isValidAge || !isValidPhone || !isValidDescription || !isValidLocation) return;

        const payload = {
            surname: surnameRef.current?.value ?? "",
            name: nameRef.current?.value ?? "",
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
                    <Field>
                        <FieldLabel htmlFor="surname">Surname</FieldLabel>
                        <Input
                            id="surname"
                            name="surname"
                            type="text"
                            placeholder="Popescu"
                            ref={surnameRef}
                            required
                        />
                    </Field>
                    <Field>
                        <FieldLabel htmlFor="name">First name</FieldLabel>
                        <Input
                            id="name"
                            name="name"
                            type="text"
                            placeholder="Ion"
                            ref={nameRef}
                            required
                        />
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
                        required
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
                <Field data-invalid={!locationValid ? "true" : "false"}>
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
                        aria-invalid={!locationValid ? "true" : "false"}
                    />
                    {!locationValid && (
                        <p className="text-sm text-destructive">
                            Please enter a valid address or click a point on the map.
                        </p>
                    )}
                </Field>
                <Field>
                    <APIProvider apiKey={apiKey}>
                        <MapPicker
                            position={position}
                            searchQuery={searchQuery}
                            onPositionChange={(pos) => {
                                setPosition(pos);
                                setLocationValid(true);
                            }}
                            onAddressFromMap={setAddress} // does NOT touch searchQuery
                        />
                    </APIProvider>
                </Field>
                <Field className="self-center w-25 pt-6">
                    <Button type="submit" variant="default">
                        Submit
                    </Button>
                </Field>
            </FieldGroup>
        </form>
    );
}