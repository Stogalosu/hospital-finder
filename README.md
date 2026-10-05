# Health+Path

**Your health, our path.**

Health+Path is a web app that helps a person in Bucharest find the right hospital and see how fast an ambulance could reach them. The user describes their symptoms and picks their location on a map. An AI backend works out which medical specialty is needed and which hospital fits best, and the app then simulates dispatching the nearest ambulance. It draws both routes on the map (ambulance to patient, then patient to hospital) with estimated times and distances.

Built for a hackathon. The ambulance fleet is **simulated**; there is no real vehicle data.

---

## Features

- **Symptom intake form** with validation: name, age, optional phone, symptom description, address.
- **Interactive location picking**, in two directions:
    - type an address and the marker and map move to it;
    - click the map and the address field fills in automatically.
- **Bucharest-only service area.** Locations outside Bucharest are rejected, and Submit is disabled for them.
- **AI triage.** The backend returns a detected specialty, a triage level, and a recommended hospital. If the text is not a medical problem, the backend answers `non-medical` and the app shows its message instead of a hospital.
- **Ambulance dispatch simulation.** A fleet of 50 ambulances is placed on real roads. The app picks the one with the shortest driving time to the patient.
- **Route display.** Two highlighted routes on the map, with ETAs and distances in a result panel.
- **Dark, navy design** with a pop-up form animation, built to match the project's reference mockups.

---

## How it works

```
 User fills in the form + picks a point on the map
                     │
                     ▼
   Client-side validation (names, age, phone, description, inside Bucharest)
                     │
                     ▼
   POST {NEXT_PUBLIC_FLASK_API_URL}/recommend
     { text, latitude, longitude, age }
                     │
          ┌──────────┴───────────┐
          ▼                      ▼
   status = "non-medical"   medical result
   show the message         { detected_specialty, triage, hospital }
                                 │
                                 ▼
                 Look up hospital coordinates in public/hospital_list
                                 │
                                 ▼
        Dispatch simulation (Mapbox Directions)
          1. shortlist the 3 nearest ambulances (straight-line distance)
          2. get real driving routes for those 3, choose the fastest
          3. get the route patient -> hospital
                                 │
                                 ▼
        Map shows both routes, the dispatched ambulance,
        and a panel with hospital, specialty, triage and ETAs
```

### Ambulance fleet

- 50 ambulances are generated at random positions inside a Bucharest bounding box.
- Random points would land on buildings and rivers, so each one is **snapped to the nearest road** with the Mapbox Matrix API (two batches of 25).
- The snapped fleet is cached in `sessionStorage` for the browser session, so reloads don't cost extra API calls. A new tab or session creates a new fleet.
- The fleet is created on the client only, which avoids React hydration mismatches.

### Backend contract

The frontend expects a Flask (or compatible) API with one endpoint.

`POST /recommend`

```json
{ "text": "chest pain and shortness of breath", "latitude": 44.43, "longitude": 26.10, "age": 54 }
```

Medical response:

```json
{
  "status": "ok",
  "detected_specialty": "Cardiology",
  "triage": "high",
  "hospital": { "id": 3, "name": "Example Hospital", "type": "public" }
}
```

Non-medical response:

```json
{ "status": "non-medical", "message": "No medical hospitalization required." }
```

Any status other than `"non-medical"` is treated as a medical result. A non-2xx response is shown to the user as an error toast.

The hospital `id` must match an entry in `public/hospital_list`, because the frontend looks up the coordinates locally.

---

## Tech stack

| Area | Technology |
|---|---|
| Framework | Next.js (App Router) with TypeScript |
| Styling | Tailwind CSS, shadcn/ui components |
| Maps | Mapbox GL JS via `react-map-gl` |
| Geocoding | Mapbox Geocoding API v6 (forward and reverse) |
| Routing | Mapbox Directions API |
| Road snapping | Mapbox Matrix API |
| AI / triage | Separate Flask backend (`/recommend`) |

---

## Project structure

```
public/
  logo.png                        Official logo, cropped, transparent
  hospital_list                   Hospital data (id, name, coordinates, ...)
src/
  app/
    page.tsx                      Home: header, map, result panel, form pop-up
    globals.css                   Tailwind + design tokens + pop-up animations
    new-request/_components/
      NewRequestForm.tsx          The symptom form and its validation
  components/
    base-map.tsx                  Generic Mapbox map: markers, paths, camera control
    ambulance-map.tsx             Fleet, dispatch, routes (built on BaseMap)
    site-header.tsx               Hamburger button and logo
    request-modal.tsx             Pop-up container with animation
    ui/                           shadcn components
  hooks/
    use-location-picker.ts        Address, picked point, Bucharest check
  lib/
    ambulance-sim.ts              Fleet creation, road snapping, dispatch logic
    geocoding.ts                  Mapbox geocoding helpers
    map-convert.ts                Converts between { latitude, longitude } and { lat, lng }
```

### Types

`LatLng`, `Hospital`, `Ambulance`, `DispatchResult`, `RouteFeature` and related interfaces are declared globally in a `.d.ts` file and use `latitude` / `longitude`. The map components use `MapPoint` (`lat` / `lng`). `lib/map-convert.ts` converts between the two at the boundary.

---

## Getting started

### Prerequisites

- Node.js 18 or newer
- A Mapbox account and a **public** access token (starts with `pk.`)
- The Flask backend running and reachable from the browser

### Install

```bash
npm install
```

If you are setting up from scratch, the map dependencies are:

```bash
npm i react-map-gl mapbox-gl
npm i -D @types/geojson
```

### Environment variables

Create `.env.local` in the project root:

```env
NEXT_PUBLIC_MAPBOX_TOKEN=pk.your_public_token
NEXT_PUBLIC_FLASK_API_URL=http://localhost:5000

# Optional: a custom Mapbox Studio style. Defaults to mapbox://styles/mapbox/navigation-night-v1
# NEXT_PUBLIC_MAPBOX_STYLE=mapbox://styles/your-username/your-style-id
```

### Run

```bash
npm run dev
```

Open http://localhost:3000.

### Build

```bash
npm run build
npm start
```

---

## Using the app

1. The home page shows the map of Bucharest with the ambulance fleet as grey dots.
2. Click **New request**. The form pops up over the map.
3. Fill in your details and describe your symptoms.
4. Set the location by typing an address, or by clicking the map (still clickable behind the pop-up).
5. Click **Submit**. A toast shows the detected specialty, or the non-medical message.
6. For a medical result, the form closes and the map shows the dispatched ambulance (highlighted), the patient and hospital markers, both routes, and a panel with times and distances.

### Validation rules

| Field | Rule |
|---|---|
| Surname, first name | Required, fewer than 25 characters |
| Age | 0 to 120 |
| Phone | Optional. Either 10 digits starting with `0`, or up to 16 characters starting with `+` |
| Symptoms | Required, up to 150 characters |
| Location | Required, must be inside Bucharest |

---

## Mapbox usage and cost

- **Typed address:** one forward-geocoding request per pause in typing (debounced by 600 ms, and in-flight requests are cancelled).
- **Map click:** one reverse-geocoding request.
- **New session:** two Matrix API requests to snap the fleet.
- **Each dispatch:** four Directions requests (three candidate ambulances plus patient to hospital).

Repeated test submissions count against your Mapbox quota.

---

## Known limitations

- The fleet is simulated: random positions, no movement, no real availability.
- The "inside Bucharest" check relies on the administrative areas Mapbox returns. Points near the city border can occasionally be classified differently than expected.
- The hospital must exist in the local `hospital_list`; otherwise the app shows a message and draws no route.
- If one of the three candidate ambulances has no road route to the patient, the whole dispatch fails with an error.
- The hamburger menu button is present but has no menu attached yet.
- Name, surname, phone and address are validated in the form but are **not** sent to the backend, which currently receives only the symptom text, coordinates and age.

## Security notes

- `NEXT_PUBLIC_` variables are visible in the browser. Use a public Mapbox token and restrict it by URL in the Mapbox dashboard. Never put a secret token here.
- Validation in the browser can be bypassed. The backend should re-check the coordinates, age and text length.
- This app handles health-related information. Before using it with real people, review data protection requirements (for example GDPR) and how requests are stored and logged.

## Disclaimer

Health+Path is a hackathon prototype. It is **not a medical device** and does not replace professional medical advice, diagnosis, or emergency services. In an emergency, call your local emergency number (112 in Romania).