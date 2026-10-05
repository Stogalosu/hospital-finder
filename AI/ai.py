from flask import Flask, request, jsonify
from dataclasses import dataclass
from typing import List, Dict, Tuple, Optional
import sys
import json
import torch
from sentence_transformers import SentenceTransformer, util

app = Flask(__name__)

@dataclass
class Coordinates:
    latitude: float
    longitude: float

@dataclass
class Hospital:
    id: int
    name: str
    type: str
    coordinates: Coordinates
    specialties: List[str]

SYMPTOM_MAPPING = {
    "gastroenterology": ["I feel like throwing up", "nausea", "stomach pain", "diarrhea", "abdominal cramps", "bloating", "vomiting", "heartburn"],
    "cardiology": ["chest pain", "heart palpitations", "shortness of breath", "irregular heartbeat", "tightness in chest", "high blood pressure"],
    "neurology": ["severe headache", "dizziness", "numbness in limbs", "difficulty speaking", "seizures", "loss of balance"],
    "psychiatry": ["feeling depressed", "extreme anxiety", "hallucinations", "panic attack", "insomnia", "mood swings"],
    "addiction-recovery": ["alcohol withdrawal", "drug addiction", "craving substances", "rehab for drugs", "drug abuse"],
    "orthopedics": ["broken bone", "joint pain", "sprained ankle", "bone fracture", "back pain", "knee injury"],
    "trauma": ["severe injury", "accident", "deep cut", "physical trauma", "crush injury", "car crash"],
    "pneumology": ["difficulty breathing", "persistent cough", "wheezing", "lung infection", "shortness of breath", "phthisiology"],
    "ENT": ["sore throat", "earache", "nasal congestion", "difficulty swallowing", "sinus pain", "hearing loss"],
    "dermatology": ["skin rash", "itching", "acne", "skin burns", "strange spots on skin", "skin inflammation"],
    "urology": ["pain during urination", "blood in urine", "bladder pain", "kidney stones", "urinary tract infection"],
    "nephrology": ["kidney failure", "dialysis needed", "swelling in legs", "protein in urine"],
    "gynecology": ["pelvic pain", "menstrual problems", "vaginal discharge", "ovary pain"],
    "obstretics": ["pregnancy complications", "labor pain", "prenatal care", "foetal distress"],
    "ophthalmology": ["blurry vision", "eye pain", "red eyes", "sudden vision loss", "eye infection"],
    "infectious-diseases": ["high fever", "chills", "tropical disease", "viral infection", "severe flu", "sepsis"],
    "emergency-medicine": ["unconscious", "heavy bleeding", "heart attack", "stroke symptoms", "stopped breathing"],
    "general-surgery": ["appendicitis", "gallbladder pain", "hernia", "need surgical intervention", "abdominal surgery"],
    "internal-medicine": ["general malaise", "chronic fatigue", "unexplained weight loss", "systemic illness"]
}

TRIAGE_ANCHORS = {
    "emergency": ["I am having a heart attack", "I cannot breathe", "Severe bleeding from a wound", "I am unconscious"],
    "medical": ["I have a headache", "My stomach hurts", "I feel feverish", "Sore throat and cough"],
    "non-medical": ["I am bored", "The weather is nice", "I want to eat pizza", "I am doing my homework"]
}

class HospitalRecommendationSystem:
    def __init__(self, json_path: str):
        self.model = SentenceTransformer('all-MiniLM-L6-v2')
        self.hospitals = self._load_hospitals(json_path)
        
        self.triage_labels = []
        self.triage_embeddings = []
        for label, examples in TRIAGE_ANCHORS.items():
            for ex in examples:
                self.triage_labels.append(label)
                self.triage_embeddings.append(self.model.encode(ex, convert_to_tensor=True))
        self.triage_embeddings = torch.stack(self.triage_embeddings)

        self.spec_labels = []
        self.spec_embeddings = []
        for spec, symptoms in SYMPTOM_MAPPING.items():
            for sym in symptoms:
                self.spec_labels.append(spec)
                self.spec_embeddings.append(self.model.encode(sym, convert_to_tensor=True))
        self.spec_embeddings = torch.stack(self.spec_embeddings)

    def _load_hospitals(self, path: str) -> List[Hospital]:
        with open(path, "r", encoding="utf8") as f:
            data = json.load(f)
        hospitals = []
        for x in data:
            h_type = x["type"].replace("peidatric", "pediatric")
            hospitals.append(Hospital(
                id=x["id"], name=x["name"], type=h_type,
                coordinates=Coordinates(x["coordinates"]["latitude"], x["coordinates"]["longitude"]),
                specialties=x["specialties"]
            ))
        return hospitals

    def get_best_match(self, text: str, embeddings: torch.Tensor, labels: List[str]) -> Tuple[str, float]:
        user_emb = self.model.encode(text, convert_to_tensor=True)
        cos_scores = util.cos_sim(user_emb, embeddings)[0]
        best_idx = torch.argmax(cos_scores).item()
        return labels[best_idx], cos_scores[best_idx].item()

    def recommend(self, user_text: str, lat: float, lon: float, age: int):
        triage_label, triage_score = self.get_best_match(user_text, self.triage_embeddings, self.triage_labels)
        
        if triage_label == "non-medical":
            return {"status": "non-medical", "message": "No medical hospitalization required."}

        best_spec, spec_score = self.get_best_match(user_text, self.spec_embeddings, self.spec_labels)

        if age >= 18:
            valid_types = ["mixed", "adult_only"]
        else:
            valid_types = ["pediatric_only", "mixed"]

        search_variants = [best_spec]
        if age < 18:
            search_variants.append(f"pediatric-{best_spec}")
            search_variants.append("pediatrics")

        min_dist = float('inf')
        selected_h = None

        for h in self.hospitals:
            dist = abs(lat - h.coordinates.latitude) + abs(lon - h.coordinates.longitude)
            if h.type in valid_types and any(sv in h.specialties for sv in search_variants):
                if dist < min_dist:
                    min_dist = dist
                    selected_h = h

        if selected_h:
            return {
                "status": "medical",
                "triage": triage_label,
                "detected_specialty": best_spec,
                "hospital": {
                    "id": selected_h.id,
                    "name": selected_h.name,
                    "type": selected_h.type
                }
            }
        return {"status": "no_hospital_found", "message": "No hospital found for this specialty in your area."}

syses = HospitalRecommendationSystem("hospital_list.json")

@app.route('/recommend', methods=['POST'])
def recommend_hospital():
    data = request.json
    if not data or not all(k in data for k in ("text", "latitude", "longitude", "age")):
        return jsonify({"error": "Missing required fields: text, latitude, longitude, age"}), 400

    result = syses.recommend(
        user_text=data['text'],
        lat=float(data['latitude']),
        lon=float(data['longitude']),
        age=int(data['age'])
    )
    return jsonify(result)

if __name__ == "__main__":
    app.run(debug=True, port=5000)
