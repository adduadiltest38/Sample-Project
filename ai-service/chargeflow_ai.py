#!/usr/bin/env python3
"""
ChargeFlow AI — a tiny, dependency-free demo "AI" service.

It answers a set of predefined questions (plus close variations) using the
live trip data the Node backend sends with every message: battery, charging
window, the current station, nearby places and route options.

Everything is deterministic and runs on the Python standard library only,
so there is nothing to install. Run it directly:

    python3 ai-service/chargeflow_ai.py            # listens on :8790

Endpoints
    GET  /health    -> {"ok": true, "service": "chargeflow-ai", "intents": [...]}
    GET  /prompts   -> {"prompts": [...]}          quick questions for the UI
    POST /chat      -> {"reply", "intent", "suggestions"}
         body: {"message": "...", "context": {...}}  (see sample_context())
"""

from __future__ import annotations

import json
import math
import os
import re
import sys
from dataclasses import dataclass
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any, Callable

PORT = int(os.environ.get("AI_SERVICE_PORT", "8790"))

# Quick questions shown as chips in the chat. Each maps to an intent below.
PROMPTS = [
    "Find coffee nearby",
    "Find food",
    "What can I do in 15 minutes?",
    "Which charger is best?",
    "Is my car ready?",
    "How much will charging cost?",
    "Can I make it to Harbor Point?",
    "Is there a restroom?",
]

CATEGORY_WORDS = {
    "coffee": r"coffee|caf[eé]|latte|espresso|cappuccino|\btea\b",
    "food": r"food|eat|lunch|dinner|breakfast|hungry|restaurant|burger|sushi|meal|snack",
    "relax": r"relax|park|walk|chill|fresh air|quiet|stroll",
    "shopping": r"shop|store|mall|buy",
    "work": r"work|laptop|meeting|\bcall\b|wifi|email|desk",
    "music": r"music|song|playlist|vinyl|jazz",
    "games": r"game|arcade|\bplay\b|\bvr\b|kart",
    "entertainment": r"entertain|movie|cinema|film|\bfun\b",
}

CATEGORY_LABEL = {
    "coffee": "coffee",
    "food": "food",
    "relax": "a relaxing spot",
    "shopping": "shopping",
    "work": "a place to work",
    "music": "music",
    "games": "games",
    "entertainment": "entertainment",
    "all": "something to do",
}

PLACE_CATEGORY_TAG = {
    "cafe": "coffee",
    "restaurant": "food",
    "cinema": "entertainment",
    "entertainment": "entertainment",
    "shopping": "shopping",
    "park": "relax",
}


# ── Charging-window maths ─────────────────────────────────────────────────
# Available activity time =
#   charging remaining − walk there − activity − walk back − safety buffer

def time_fit(place: dict, minutes: float, buffer: int) -> dict:
    walk = place.get("walkMinutes", 0)
    typical = place.get("visitMinutes", 10)
    minimum = place.get("minVisitMinutes", 5)
    available = minutes - walk * 2 - buffer

    if not place.get("open", True):
        status, activity = "closed", typical
    elif available >= typical + 6:
        status, activity = "plenty", typical
    elif available >= max(minimum, typical * 0.8):
        status, activity = "perfect", min(typical, math.floor(available))
    elif available >= minimum:
        status, activity = "shortened", math.floor(available)
    else:
        status, activity = "no-fit", typical

    total = walk * 2 + activity + buffer
    return {
        "status": status,
        "walk": walk,
        "activity": activity,
        "buffer": buffer,
        "total": total,
        "slack": minutes - total,
    }


FIT_SCORE = {"perfect": 40, "plenty": 34, "shortened": 18, "no-fit": -40, "closed": -80}


def matches(place: dict, tag: str) -> bool:
    return tag == "all" or tag in place.get("tags", []) or PLACE_CATEGORY_TAG.get(place.get("category")) == tag


def rank_places(ctx: dict, minutes: float, tag: str = "all") -> list[tuple[dict, dict]]:
    buffer = ctx.get("bufferMinutes", 5)
    prefs = ctx.get("preferences", [])
    ranked = []
    for p in ctx.get("places", []):
        if not matches(p, tag):
            continue
        fit = time_fit(p, minutes, buffer)
        score = (
            FIT_SCORE[fit["status"]]
            - 1.6 * fit["walk"]
            + 14 * (p.get("rating", 4) - 4)
            + (10 if any(matches(p, t) for t in prefs) else 0)
        )
        ranked.append((p, fit, score))
    ranked.sort(key=lambda r: r[2], reverse=True)
    return [(p, f) for p, f, _ in ranked]


def fits(fit: dict) -> bool:
    return fit["status"] in ("perfect", "plenty", "shortened")


def place_suggestion(p: dict, fit: dict) -> dict:
    label = {
        "perfect": "fits ✓",
        "plenty": "fits ✓",
        "shortened": f"{fit['activity']} min visit",
    }.get(fit["status"], "too long")
    return {
        "type": "place",
        "id": p["id"],
        "label": p["name"],
        "emoji": p.get("emoji"),
        "meta": f"{fit['walk']} min walk · {label}",
    }


def window_minutes(ctx: dict) -> float:
    m = ctx.get("chargingMinutesRemaining")
    return float(m) if m else 20.0


# ── Intent handlers ───────────────────────────────────────────────────────

Reply = dict[str, Any]


def reply(text: str, intent: str, suggestions: list[dict] | None = None) -> Reply:
    return {"reply": text, "intent": intent, "suggestions": suggestions or []}


def handle_activity(msg: str, ctx: dict, tag: str = "all") -> Reply:
    explicit = re.search(r"(\d{1,3})\s*(?:min|minute)", msg)
    minutes = float(explicit.group(1)) if explicit else window_minutes(ctx)
    station = ctx.get("station", {}).get("name", "the station")
    ranked = rank_places(ctx, minutes, tag)
    suggestions = [place_suggestion(p, f) for p, f in ranked if f["status"] != "closed"][:3]

    if ctx.get("isCharging") and not explicit:
        lead = f"You have about {round(minutes)} minutes of charging left."
    elif explicit:
        lead = f"With {round(minutes)} minutes:"
    else:
        lead = f"Near {station}:"

    best = next(((p, f) for p, f in ranked if fits(f)), None)
    if best:
        p, f = best
        back_with = max(f["buffer"], round(f["buffer"] + f["slack"]))
        text = (
            f"{lead} {p['emoji']} {p['name']} is your best option. It's a {f['walk']}-minute walk, "
            f"you'll spend about {f['activity']} minutes there and still be back with a {back_with}-minute buffer."
        )
        alt = next(((q, g) for q, g in ranked[1:] if fits(g) and q is not p), None)
        if alt:
            q, g = alt
            text += f" Prefer something else? {q['emoji']} {q['name']} is {g['walk']} min away."
        return reply(text, f"activity:{tag}", suggestions)

    # Nothing fits: explain the maths, then offer an in-car option.
    closest = min((f for _, f in ranked if f["status"] != "closed"), key=lambda f: f["total"], default=None)
    in_car = next((a for a in ctx.get("inCar", []) if tag == "all" or tag in a.get("tags", [])), None)
    if closest:
        name = next(p for p, f in ranked if f is closest)
        text = (
            f"{round(minutes)} minutes is tight for a walk. Even {name['emoji']} {name['name']} needs about "
            f"{closest['total']} minutes round-trip with your {closest['buffer']}-minute buffer."
        )
    else:
        text = f"I couldn't find {CATEGORY_LABEL[tag]} near {station}."
    if in_car:
        text += f" Stay comfy instead: {in_car['emoji']} {in_car['name']}."
        suggestions = [{"type": "action", "id": in_car["id"], "label": in_car["name"], "emoji": in_car["emoji"], "meta": "In your car"}] + suggestions[:2]
    return reply(text, f"activity:{tag}", suggestions)


def handle_best_charger(msg: str, ctx: dict) -> Reply:
    options = ctx.get("routeOptions", [])
    if not options:
        return reply("Tap “Find Best Charging Route” and I'll compare every charger on your way.", "best-charger")
    ai = next((o for o in options if "ai" in o.get("tags", [])), options[0])
    text = (
        f"✨ {ai['station']} is the best balance for you: {ai['powerKW']} kW, {ai['available']} chargers free "
        f"and about {ai['chargeMinutes']} minutes of charging. {' · '.join(ai.get('reasons', [])[:2])}."
    )
    extras = []
    fastest = next((o for o in options if "fastest" in o.get("tags", [])), None)
    cheapest = next((o for o in options if "cheapest" in o.get("tags", [])), None)
    if fastest and fastest is not ai:
        extras.append(f"{fastest['station']} is {ai['totalMinutes'] - fastest['totalMinutes']} min faster overall")
    if cheapest and cheapest is not ai:
        extras.append(f"{cheapest['station']} saves ${ai['chargingCost'] - cheapest['chargingCost']:.2f}")
    if extras:
        text += " Alternatives: " + "; ".join(extras) + "."
    suggestions = [
        {"type": "station", "id": o["stationId"], "label": o["station"], "emoji": "⚡", "meta": f"{o['totalMinutes']} min total · ${o['chargingCost']:.2f}"}
        for o in options[:3]
    ]
    return reply(text, "best-charger", suggestions)


def handle_car_status(msg: str, ctx: dict) -> Reply:
    v = ctx.get("vehicle", {})
    battery = round(v.get("batteryPercent", 0))
    if ctx.get("isCharging"):
        left = max(1, round(window_minutes(ctx)))
        target = ctx.get("chargeTargetPercent", 80)
        return reply(
            f"⚡ Not yet. Your {v.get('name', 'car')} is at {battery}% and needs about {left} more minutes to reach {target}%. "
            f"I'll remind you when it's time to head back.",
            "car-status",
        )
    if ctx.get("journeyState") == "CHARGING_COMPLETE":
        return reply(f"✅ Yes! Your {v.get('name', 'car')} is charged to {battery}% and ready to go.", "car-status")
    advice = "I recommend charging soon." if battery < 30 else "You're fine for now, but a top-up on the way protects your onward trip."
    return reply(
        f"🔋 Your {v.get('name', 'car')} is at {battery}% with about {round(v.get('rangeKm', 0))} km of range. {advice}",
        "car-status",
        [{"type": "action", "id": "find-routes", "label": "Find best charging route", "emoji": "✨"}] if not ctx.get("routeOptions") else [],
    )


def handle_cost(msg: str, ctx: dict) -> Reply:
    s = ctx.get("station") or {}
    est = ctx.get("chargeEstimate")
    if est:
        price = f"{est['energyKWh']} kWh at ${est['pricePerKwh']:.2f}/kWh"
        if est.get("live"):
            text = f"💳 About ${est['cost']:.2f} more to finish: {price}, {est['minutes']} minutes left."
        else:
            text = f"💳 Charging at {s.get('name', 'this station')} costs about ${est['cost']:.2f}: {price}, {est['minutes']} minutes."
        return reply(text + " No idle fee if you're back on time.", "cost")
    options = ctx.get("routeOptions", [])
    chosen = next((o for o in options if o.get("stationId") == s.get("id")), None) or (options[0] if options else None)
    if chosen:
        return reply(
            f"💳 Charging at {chosen['station']} costs about ${chosen['chargingCost']:.2f}: "
            f"{chosen['energyKWh']} kWh at ${chosen['pricePerKwh']:.2f}/kWh, {chosen['chargeMinutes']} minutes. No idle fee if you're back on time.",
            "cost",
        )
    if s:
        return reply(f"💳 {s['name']} charges ${s.get('pricePerKwh', 0):.2f} per kWh.", "cost")
    return reply("Plan a route first and I'll estimate the charging cost for each stop.", "cost")


def handle_reach(msg: str, ctx: dict) -> Reply:
    v = ctx.get("vehicle", {})
    dest = ctx.get("destination", "your destination")
    trip_km = ctx.get("tripKm", 0)
    if not trip_km:
        return reply("Pick a destination first and I'll check your range against it.", "reach")
    range_km = v.get("rangeKm", 0)
    reserve_km = range_km * ctx.get("reservePercent", 15) / max(1, v.get("batteryPercent", 1))
    if trip_km and range_km - trip_km > reserve_km:
        text = f"✅ Yes. {dest} is {trip_km:.0f} km away and you have about {range_km:.0f} km of range."
        if ctx.get("onwardKm"):
            text += f" For the {ctx['onwardKm']} km onward trip you'll still want a charge stop."
        return reply(text, "reach")
    return reply(
        f"⚠️ It's tight. {dest} is {trip_km:.0f} km away and you have about {range_km:.0f} km of range. "
        f"Let's add a charging stop so you keep your reserve.",
        "reach",
        [{"type": "action", "id": "find-routes", "label": "Find best charging route", "emoji": "✨"}],
    )


def handle_amenity(msg: str, ctx: dict) -> Reply:
    s = ctx.get("station") or {}
    amenities = s.get("amenities", [])
    want = "Restroom" if re.search(r"restroom|toilet|bathroom|wc", msg) else "WiFi" if "wifi" in msg else None
    if want and want in amenities:
        return reply(f"Yes, {s.get('name', 'this station')} has a {want.lower()} right next to the chargers.", "amenity")
    if want:
        return reply(f"{s.get('name', 'This station')} doesn't list a {want.lower()}. The nearest café usually does.", "amenity")
    return reply(f"{s.get('name', 'This station')} has: {', '.join(amenities)}.", "amenity")


def handle_greeting(msg: str, ctx: dict) -> Reply:
    name = ctx.get("userName", "there")
    return reply(
        f"Hi {name}! 👋 I can find the best charger, tell you when your car is ready, and plan something useful while you charge.",
        "greeting",
    )


def handle_thanks(msg: str, ctx: dict) -> Reply:
    return reply("Anytime! Enjoy the stop ⚡", "thanks")


def handle_help(msg: str, ctx: dict) -> Reply:
    return reply(
        "I'm ChargeFlow AI. Try one of these: " + " · ".join(f"“{p}”" for p in PROMPTS[:5]) + ".",
        "help",
    )


# ── Intent routing ────────────────────────────────────────────────────────

@dataclass
class Intent:
    name: str
    pattern: str
    handler: Callable[[str, dict], Reply]


INTENTS: list[Intent] = [
    Intent("best-charger", r"(which|best|recommend|cheapest|fastest).*(charger|station|route)|charger.*best", handle_best_charger),
    Intent("cost", r"cost|price|how much|expensive|pay", handle_cost),
    Intent("reach", r"make it|reach|get to|enough (battery|charge|range)", handle_reach),
    Intent("amenity", r"restroom|toilet|bathroom|\bwc\b|amenit", handle_amenity),
    Intent("car-status", r"ready|charged|how long|status|battery|range|percent|%", handle_car_status),
    *[
        Intent(f"activity:{tag}", words, lambda m, c, t=tag: handle_activity(m, c, t))
        for tag, words in CATEGORY_WORDS.items()
    ],
    Intent("activity:all", r"what (can|should) i do|\d+\s*min|bored|nearby|around here|kill time", handle_activity),
    Intent("greeting", r"^(hi|hello|hey|salam|good (morning|afternoon|evening))\b", handle_greeting),
    Intent("thanks", r"thank|thx|cheers", handle_thanks),
    Intent("help", r"help|what can you|who are you", handle_help),
]


def answer(message: str, ctx: dict) -> Reply:
    msg = message.lower().strip()
    # "What can I do in 15 minutes?" mentions minutes, not charging status.
    if re.search(r"\d+\s*min", msg) and not re.search(r"ready|charged", msg):
        tag = next((t for t, w in CATEGORY_WORDS.items() if re.search(w, msg)), "all")
        return handle_activity(msg, ctx, tag)
    for intent in INTENTS:
        if re.search(intent.pattern, msg):
            return intent.handler(msg, ctx)
    return handle_help(msg, ctx)


# ── HTTP server ───────────────────────────────────────────────────────────

class Handler(BaseHTTPRequestHandler):
    server_version = "ChargeFlowAI/1.0"

    def _send(self, status: int, body: dict) -> None:
        data = json.dumps(body, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(data)

    def do_OPTIONS(self) -> None:  # CORS preflight
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.end_headers()

    def do_GET(self) -> None:
        if self.path == "/health":
            self._send(200, {"ok": True, "service": "chargeflow-ai", "intents": [i.name for i in INTENTS]})
        elif self.path == "/prompts":
            self._send(200, {"prompts": PROMPTS})
        else:
            self._send(404, {"error": "Not found"})

    def do_POST(self) -> None:
        if self.path != "/chat":
            self._send(404, {"error": "Not found"})
            return
        try:
            length = int(self.headers.get("Content-Length") or 0)
            body = json.loads(self.rfile.read(length) or b"{}")
            message = str(body.get("message", "")).strip()[:500]
            if not message:
                self._send(400, {"error": '"message" is required'})
                return
            self._send(200, answer(message, body.get("context") or {}))
        except json.JSONDecodeError:
            self._send(400, {"error": "Body must be JSON"})
        except Exception as exc:  # keep the demo alive whatever happens
            self._send(500, {"error": f"AI service error: {exc}"})

    def log_message(self, fmt: str, *args: Any) -> None:
        sys.stdout.write("\033[35m[chargeflow-ai]\033[0m " + (fmt % args) + "\n")


def sample_context() -> dict:
    """A realistic context, used by `--demo` to show answers without the app."""
    return {
        "userName": "Alex",
        "journeyState": "CHARGING",
        "isCharging": True,
        "chargingMinutesRemaining": 24,
        "chargeTargetPercent": 80,
        "bufferMinutes": 5,
        "reservePercent": 15,
        "preferences": ["coffee", "relax"],
        "destination": "Harbor Point",
        "tripKm": 29,
        "onwardKm": 215,
        "vehicle": {"name": "Tesla Model 3", "batteryPercent": 53, "rangeKm": 224},
        "station": {"id": "station-001", "name": "ChargeFlow Fast Hub", "pricePerKwh": 0.45, "amenities": ["Coffee", "Food", "Restroom", "Shopping", "WiFi"]},
        "places": [
            {"id": "place-brew-lab", "name": "Brew Lab", "emoji": "☕", "category": "cafe", "tags": ["coffee", "work"], "rating": 4.8, "walkMinutes": 4, "visitMinutes": 10, "minVisitMinutes": 6, "open": True},
            {"id": "place-urban-bites", "name": "Urban Bites", "emoji": "🍔", "category": "restaurant", "tags": ["food"], "rating": 4.6, "walkMinutes": 4, "visitMinutes": 15, "minVisitMinutes": 10, "open": True},
            {"id": "place-central-park", "name": "Central Park", "emoji": "🌳", "category": "park", "tags": ["relax"], "rating": 4.7, "walkMinutes": 6, "visitMinutes": 20, "minVisitMinutes": 6, "open": True},
        ],
        "routeOptions": [
            {"stationId": "station-001", "station": "ChargeFlow Fast Hub", "tags": ["ai"], "powerKW": 150, "available": "5/8", "pricePerKwh": 0.45, "energyKWh": 17.1, "chargeMinutes": 24, "totalMinutes": 51, "chargingCost": 7.67, "reasons": ["Fast charger · 150 kW", "Coffee nearby"]},
            {"stationId": "station-003", "station": "Tech Park Supercharge", "tags": ["fastest"], "powerKW": 250, "available": "7/12", "pricePerKwh": 0.61, "energyKWh": 13.3, "chargeMinutes": 18, "totalMinutes": 43, "chargingCost": 8.14, "reasons": ["Fast charger · 250 kW"]},
            {"stationId": "station-006", "station": "Central Mall Charging", "tags": ["cheapest"], "powerKW": 100, "available": "11/20", "pricePerKwh": 0.29, "energyKWh": 15.1, "chargeMinutes": 33, "totalMinutes": 62, "chargingCost": 4.37, "reasons": ["Coffee nearby"]},
        ],
        "inCar": [{"id": "incar-lofi", "name": "Charging Chill playlist", "emoji": "🎧", "tags": ["music", "relax"]}],
    }


def main() -> None:
    if "--demo" in sys.argv:
        ctx = sample_context()
        for q in PROMPTS:
            print(f"\n> {q}\n{answer(q, ctx)['reply']}")
        return
    server = ThreadingHTTPServer(("127.0.0.1", PORT), Handler)
    print(f"\033[35m[chargeflow-ai]\033[0m Python AI service ready on http://localhost:{PORT} ({len(PROMPTS)} predefined questions)", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
