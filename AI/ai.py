from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI()

class SymptomInput(BaseModel):
  symptoms: str


@app.post("/predict")
def predict_specialty(data: SymptomInput):
  text = data.symptoms.lower()

  if any(word in text for word in ["inima", "piept", "palpitatii", "tensiune"]):
    specialty = "Cardiologie"
  elif any(word in text for word in ["os", "fractura", "genunchi", "picior", "mana"]):
    specialty = "Ortopedie"
  elif any(word in text for word in ["cap", "amețeală", "migrena", "amorțeala"):
    specialty = "Neurologie"
  else:
    specialty = "Medicină Generală"
  return {"specialty": specialty}
