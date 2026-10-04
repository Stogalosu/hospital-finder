'use client';

import {Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import {Input} from "@/components/ui/input";
import {useRef, useState} from "react";
import {Textarea} from "@/components/ui/textarea";
import {Button} from "@/components/ui/button";

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

    function onSubmit() {

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
                    </Field>
                </div>
                <Field data-invalid={!ageValid ? "true" : "false"}>
                    <FieldLabel htmlFor="age">Age</FieldLabel>
                    <Input
                        id="age"
                        name="age"
                        type="text"
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
            </FieldGroup>
        </form>
    );
}