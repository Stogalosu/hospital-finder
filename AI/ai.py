from fastapi import FastAPI
from dataclasses import dataclass
import json
from transformers import pipeline
from typing import List

app=FastAPI

class Coordinates(BaseModel):
  latitude: float
  longitude: float

class Hospital(BaseModel):
  id: int
  name: str
  type: str
  coordinates: Coordinates
  specialties: List[str]

class PatientRequest(BaseModel):
    symptom: str
    latitude: float
    longitude: float
    age: int

classifier = pipeline("zero-shot-classification", model="MoritzLaurer/mDeBERTa-v3-base-mnli-xnli")

with open("hospital_list.json","r",encoding="utf8") as f:
    hospitals = json.load(f)

unique_specialities=set()
hospitals_vector: List[Hospital] = []

for x in hospitals:
    coords = Coordinates(
        latitude=x["coordinates"]["latitude"],
        longitude=x["coordinates"]["longitude"],
    )
    hospital=Hospital(
        id=x["id"],
        name=x["name"],
        type=x["type"],
        coordinates=coords,
        specialties=x["specialties"],
    )
    hospitals_vector.append(hospital)
    for spec in x.get("specialties", []):
        unique_specialities.add(spec.capitalize())

candidate_labels=list(unique_specialities)
candidate_labels.append("Unrelated to medical symptoms")

def reccomend_hospital(request: PatientRequest):
    output = classifier(sequence_to_classify, candidate_labels,hypothesis_template="The patient's condition requires treatment in the {} department.")
    best_label = output["labels"][0]
    best_score = output["scores"][0]
    THRESHOLD = 0.10

    if request.age>=18:
        valid_types=["mixed","adult_only"]
    else:
        valid_types=["pediatric_only","mixed"]
    if best_label == "Unrelated to medical symptoms" or best_score < THRESHOLD:
       return{
            "status": "irrelevant",
            "messages": "Result: Irrelevant / Not a medical symptom"
       }
       matched_speciality = best_label.lower()
       minimum_distance = 999999
       selected_id = -1
       selected_hospital_name = None
       for hospital in hospitals_vector:
           distance = abs(x - hospital.coordinates.latitude) + abs(y - hospital.coordinates.longitude)
           if matched_speciality in hospital.specialties and hospital.type in valid_types :
               if distance < minimum_distance:
                   minimum_distance = distance
                   selected_id = hospital.id
                   selected_hospital_name = hospital.name
       if selected_id != -1:
               return {
                   "status": "success",
                   "specialty": best_label,
                   "score": best_score,
                   "hospital_id": selected_id,
                   "hospital_name": selected_hospital_name
               }
           else:
               return {
                   "status": "not_found",
                   "message": "No hospital was found."
               }
