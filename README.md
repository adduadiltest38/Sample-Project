# ⚡ ChargeFlow

**Charge your car. Make the most of your time.**

ChargeFlow is a demo of an EV charging navigation app with a charging companion built in. It runs as one continuous journey:

> I'm driving → the app understands my battery → finds the best charger → navigates me there → starts a charging session → knows how much time I have → recommends something useful nearby → walks me there → reminds me when to return → finishes charging → continues my journey.

Everything runs on realistic mock data, with a hand-built animated SVG map of the fictional **Nova City**.

**Not required:** Google Maps or Places keys, GPS, login, payments, real charger APIs, or a database.

---

## Quick start

```bash
npm install
npm run dev
```

Open **http://localhost:5173**. That's it — no keys, no config.

`npm run dev` starts both:

| Process | URL | What |
| --- | --- | --- |
| `web` (Vite + React) | http://localhost:5173 | The app (proxies `/api` to the backend) |
| `api` (Express + tsx) | http://localhost:8787 | Mock REST API + AI service |

Other scripts: `npm run build` (typecheck + production build), `npm start` (serves the built app **and** the API from one port), `npm run typecheck`.

### Optional: richer AI with OpenRouter

```bash
cp .env.example .env
# then set OPENROUTER_API_KEY (and optionally OPENROUTER_MODEL)
```

| Variable | Default | Notes |
| --- | --- | --- |
| `OPENROUTER_API_KEY` | _(empty)_ | Empty → the deterministic `RecommendationEngine` answers. |
| `OPENROUTER_MODEL` | `anthropic/claude-sonnet-4.5` | Any OpenRouter model slug. |
| `OPENROUTER_BASE_URL` | `https://openrouter.ai/api/v1` | |
| `API_PORT` | `8787` | |

Only the backend reads the key; it is never sent to the browser. If OpenRouter errors, times out (12 s) or is unreachable, the backend falls back to the local engine per request, so the UI behaves the same either way. The top bar shows which provider is active.

---

## The demo script (≈ 3 minutes)

1. **Dashboard:** Tesla Model 3 at **58%**, 245 km of range, heading to **Harbor Point**. The app flags *Charging required: Yes*, because today's plan (29 km plus a 215 km onward trip) would leave you below your 15% reserve.
2. **✨ Find Best Charging Route:** a radar sweep runs while the planner scores all 11 chargers. You get four options (AI Recommended, Fastest, Cheapest, Comfortable). The AI pick is **ChargeFlow Fast Hub**: 26 km, 26 min driving, 24 min charging, with reasons ✓ Fast charger ✓ Coffee nearby ✓ Low wait ✓ Top rated.
3. **Navigate:** the route draws itself and the car drives it, facing its direction of travel. Turn-by-turn updates live (*Turn right onto Downtown Avenue*, *Continue on Sheikh Avenue · 2.6 km*), and the battery drops 58 → 57 → 56 … from a deterministic consumption model.
4. **Charging station ahead · 800 m**, then **🎉 You've arrived!**
5. **Start Charging ⚡:** a live session shows the ring, kW, kWh, cost and time left. Then the companion asks: *"You have approximately 23 minutes. What would you like to do?"*
6. **✨ Brew Lab is your best option:** a 4-minute walk and a 10-minute visit, and you're still back with a 5-minute buffer. Expand any place to see the time maths.
7. **Walk There:** the map switches to walking mode, with a walker marker on a dotted footpath, live return distance and a leave-by time.
8. **Charging almost complete ⚡ Return to your vehicle now.** → **Head back now**.
9. **⚡ Charging Complete · 80%** → **Continue to Harbor Point** → trip summary (km, time, cost, CO₂ saved).

### Demo Mode (presenter controls)

The small **Demo Mode** button opens:

- **Battery:** 10 / 25 / 50 / 75%
- **Navigation:** Start · Pause · Skip to Station
- **Charging:** Start · +5 min · +10 min · Complete
- **Location:** Move to Station · Move to Café · Return to Car
- **Simulation speed:** *Presenter* (default), *1 s = 1 min*, *Turbo*
- **Reset demo**

Every control works from any state and does the transitions it needs. For example, *Start Charging* from the dashboard plans a route, jumps to the station and plugs in.

**Presenter speed** is phase-aware so the story reads well live: driving runs at 48×, deciding what to do at the charger slows to 10×, and walking/visiting runs at 30×. The clock chip in the top bar always shows the current multiplier.

---

## Architecture

```
.
├── backend/                  Express mock API (runs with tsx)
│   ├── server.ts
│   ├── routes/               stations · routes · charging · places · recommendations · ai
│   ├── services/             routing · charging · recommendations · ai (AIRecommendationService)
│   ├── mock/                 re-exports src/mock (single source of truth)
│   └── utils/                env · http helpers
├── src/
│   ├── app/                  App shell (desktop sidebar / mobile bottom sheet)
│   ├── components/
│   │   ├── map/              CityMap (camera, pan/zoom/pinch), BaseMap, labels, markers, routes
│   │   ├── navigation/       TripPlanner, RouteOptions, NavigationBanner/Panel, Arrival, TripComplete
│   │   ├── charging/         ChargingPanel, ChargingRing, ReturnAlert, ChargingPill, Complete
│   │   ├── recommendations/  CompanionPrompt, PlaceCard, TimeFitBreakdown, Explore, Walking
│   │   ├── stations/         StationCard, AmenityChips
│   │   ├── vehicle/          VehicleCard, VehiclePicker, BatteryGauge, CarIllustration
│   │   ├── ai/               AIAssistant (FAB + chat)
│   │   ├── layout/           TopBar, JourneyStepper, JourneyPanel, DemoPanel, Toasts
│   │   └── ui/               Button, Sheet, Badge, Skeleton, ProgressBar…
│   ├── stores/               journeyStore (state machine + simulation), uiStore, chatStore
│   ├── lib/                  routing, routePlanner, energy, recommendationEngine, chatEngine, cityGen, geo
│   ├── mock/                 vehicles · stations · places · routes · users · recommendations · city
│   ├── services/             api client (with local fallbacks)
│   ├── hooks/ · types/ · utils/
```

`src/lib` and `src/mock` are pure TypeScript with no DOM code. The browser and the backend share them, so the engine that powers `/api/recommendations` is the same one that ranks places live in the UI.

### Journey state machine

`src/stores/journeyStore.ts` owns the whole experience. The panels, map camera, markers and animations all react to one `state`:

```
IDLE → SEARCHING → ROUTE_SELECTED → NAVIGATING → ARRIVING → ARRIVED → CHARGING
  → EXPLORING → WALKING → VISITING → RETURNING → CHARGING_COMPLETE
  → NAVIGATING_TO_DESTINATION → TRIP_COMPLETE
```

Transitions are whitelisted in `TRANSITIONS`. `VISITING` and `TRIP_COMPLETE` are two small additions to the spec's list. Charging keeps running while you're away. If it finishes before you're back, you get an alert, and returning takes you straight to `CHARGING_COMPLETE`.

A single `requestAnimationFrame` loop (`useSimulationLoop`) advances the simulation clock. Each tick moves the car along the route (with per-road speeds and gentle acceleration), drains the battery, integrates the charging curve and walks the pedestrian.

### The map

The map is original SVG with no tiles and no external map service. It includes:

- **Geography:** a smoothed coastline, Nova Bay, Nova Creek with its lagoon, parks, beaches and an airport with runways.
- **Streets and buildings:** a local street grid, and about 2,800 procedurally placed buildings (seeded PRNG, so the city is identical on every load) with drop shadows and taller towers in Downtown and Business Bay.
- **Road hierarchy:** highways, avenues and streets, with road names drawn along the roads.
- **Camera:** an autopilot that fits the trip, follows the car with look-ahead, zooms in at the station and follows you on foot. Drag, wheel or pinch to take over; **Recenter** hands control back.
- **Markers:** the vehicle is a top-down car with a soft, elongated glow (no giant circle). Station pins show live availability and pulse while charging. Place markers are ringed by time-fit (green fits, amber shorter visit, grey doesn't fit).

### EV intelligence (all deterministic)

- **Consumption:** rated Wh/km × a road-class factor, plus a 2.4 kW climate load (Nova City is 38 °C).
- **Charging:** a state-of-charge taper curve × min(station kW, car kW) × a hot-battery derate. Minutes are estimated by numerical integration.
- **Route planner:** Dijkstra with turn penalties runs over the road graph. Every station is evaluated as a stop, and routes are scored on total time, cost, amenities, availability, charger power, rating and arrival reserve (`src/lib/routePlanner.ts`, weights in `src/mock/recommendations.ts`).
- **Charging-time fit:**

  ```
  Available activity time = charging remaining − walk there − activity − walk back − safety buffer
  ```

  Each place is then graded *Perfect fit*, *Plenty of time*, *Shorter visit*, *Not recommended* or *Closed*. Places are ranked by time fit, walking distance, rating, preferences, open status and category.

---

## API

| Method | Path | Body / query |
| --- | --- | --- |
| GET | `/api/health` | – (includes AI provider status) |
| GET | `/api/stations` | `?from=NODE_ID` adds distance/time |
| GET | `/api/stations/:id` | |
| POST | `/api/routes` | `{ vehicleId, batteryPercent, destinationNodeId?, stationId? }` |
| POST | `/api/charging/start` | `{ stationId, vehicleId, startSoc, targetSoc }` |
| GET | `/api/charging/:id` | replays the curve at 1 real s = 1 simulated min |
| GET | `/api/places` | `?stationId=&category=` |
| POST | `/api/recommendations` | `{ chargingMinutesRemaining, stationId, category?, preferences?, bufferMinutes? }` |
| GET | `/api/ai/status` | |
| POST | `/api/ai/chat` | `{ message, context }` |

```bash
curl -X POST localhost:8787/api/recommendations -H 'content-type: application/json' \
  -d '{"chargingMinutesRemaining":24,"stationId":"station-001"}'
```

The frontend works even if the API is down. Routes, recommendations and chat all fall back to the shared on-device engine.

---

## Mock data

All demo data lives in `src/mock/`:

| File | Contents |
| --- | --- |
| `vehicles.ts` | 10 EVs (Tesla Model 3/Y, Taycan, Ioniq 5, EV6, i4, EQE, Q8 e-tron, Seal, Air) |
| `stations.ts` | 11 charging stations |
| `places.ts` | 51 places: 20 restaurants, 11 cafés, 5 cinemas, 5 shops, 5 parks, 5 entertainment |
| `routes.ts` | Road network (Sheikh Avenue, Marina Road, Central Boulevard, Airport Road, Tech Park Highway, Harbor Street, Downtown Avenue…) and trip presets |
| `city.ts` | Coastline, creek, parks, airport, district labels (Downtown, Marina District, Tech Park, Airport District, Central Mall, Green Valley, Business Bay, Harbor Point) |
| `users.ts` | Demo user (Alex, Tesla Model 3, 58%), reserve, buffer and start time |
| `recommendations.ts` | Companion categories, in-car activities, AI quick prompts, ranking weights |

All locations, businesses and coordinates are fictional.

---

Built with React 19, TypeScript, Vite, Tailwind CSS v4, Framer Motion, Zustand, lucide-react, Express and tsx.
