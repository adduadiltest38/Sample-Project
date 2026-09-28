// ─────────────────────────────────────────────────────────────
// ChargeFlow domain types (shared by the frontend and backend)
// Map space: 1 map unit = 10 metres. World is 2400 × 1600 units.
// ─────────────────────────────────────────────────────────────

export interface Point {
  x: number;
  y: number;
}

export interface LatLng {
  lat: number;
  lng: number;
}

export type RoadClass = 'highway' | 'avenue' | 'street' | 'local';

export interface RoadNode extends Point {
  id: string;
}

export interface Road {
  id: string;
  name: string;
  class: RoadClass;
  /** Ordered node ids. Consecutive ids form routable edges. */
  nodes: string[];
  /** Posted speed in km/h. */
  speedKmh: number;
  /** 0–1 traffic multiplier applied to the speed (1 = free flow). */
  traffic?: number;
  /** Decorative streets are drawn but never routed on. */
  routable?: boolean;
}

export type District =
  | 'Downtown'
  | 'Marina District'
  | 'Tech Park'
  | 'Airport District'
  | 'Central Mall'
  | 'Green Valley'
  | 'Business Bay'
  | 'Harbor Point';

export interface Vehicle {
  id: string;
  name: string;
  make: string;
  model: string;
  trim: string;
  /** Usable battery capacity in kWh. */
  batteryKWh: number;
  /** Rated consumption in Wh/km. */
  efficiencyWhKm: number;
  /** Peak DC charging power in kW. */
  maxDcKW: number;
  color: string;
  colorName: string;
  /** Body proportions for the map marker. */
  body: 'sedan' | 'suv' | 'sport';
}

export type Amenity =
  | 'Coffee'
  | 'Food'
  | 'Restroom'
  | 'Shopping'
  | 'WiFi'
  | 'Lounge'
  | 'Cinema'
  | 'Park'
  | 'Workspace'
  | 'Beach'
  | 'Convenience';

export interface ChargingStation {
  id: string;
  name: string;
  network: string;
  district: District;
  address: string;
  /** Road network node where the station is accessed. */
  nodeId: string;
  position: Point;
  location: LatLng;
  chargers: number;
  availableChargers: number;
  powerKW: number;
  connector: string;
  pricePerKwh: number;
  rating: number;
  reviews: number;
  amenities: Amenity[];
  /** Typical queue time when fully occupied, in minutes. */
  queueMinutes: number;
  solar?: boolean;
}

export type PlaceCategory =
  | 'restaurant'
  | 'cafe'
  | 'cinema'
  | 'shopping'
  | 'park'
  | 'entertainment';

export type ActivityTag =
  | 'coffee'
  | 'food'
  | 'entertainment'
  | 'shopping'
  | 'relax'
  | 'work'
  | 'music'
  | 'games';

export interface Place {
  id: string;
  name: string;
  category: PlaceCategory;
  emoji: string;
  district: District;
  position: Point;
  location: LatLng;
  /** The charging station this place is clustered around. */
  nearStationId: string;
  rating: number;
  priceLevel: 1 | 2 | 3 | 4;
  /** Typical visit length (minutes) and the shortest sensible visit. */
  visitMinutes: number;
  minVisitMinutes: number;
  /** Opening hours in local time (24h). */
  opens: number;
  closes: number;
  tags: ActivityTag[];
  blurb: string;
}

export interface InCarActivity {
  id: string;
  name: string;
  emoji: string;
  tags: ActivityTag[];
  minutes: number;
  blurb: string;
}

// ── Routing ──────────────────────────────────────────────────

export type ManeuverType =
  | 'depart'
  | 'straight'
  | 'slight-left'
  | 'slight-right'
  | 'left'
  | 'right'
  | 'uturn'
  | 'charging-stop'
  | 'arrive';

export interface Maneuver {
  /** Distance along the leg (metres) where the maneuver happens. */
  atM: number;
  type: ManeuverType;
  road: string;
  text: string;
}

export interface LegSegment {
  from: Point;
  to: Point;
  lengthM: number;
  road: string;
  roadClass: RoadClass;
  speedMps: number;
  startM: number;
}

export interface RouteLeg {
  nodeIds: string[];
  points: Point[];
  segments: LegSegment[];
  distanceM: number;
  durationS: number;
  energyKWh: number;
  maneuvers: Maneuver[];
  /** Main roads in travel order (deduplicated). */
  roads: string[];
}

export type RouteTag = 'ai' | 'fastest' | 'cheapest' | 'comfort';

export interface RouteOption {
  id: string;
  label: string;
  tags: RouteTag[];
  stationId: string;
  legs: [RouteLeg, RouteLeg];
  distanceKm: number;
  driveMinutes: number;
  chargeMinutes: number;
  waitMinutes: number;
  totalMinutes: number;
  arrivalSocAtStation: number;
  departureSoc: number;
  arrivalSocAtDestination: number;
  energyAddedKWh: number;
  chargingCost: number;
  amenityScore: number;
  score: number;
  reasons: string[];
  via: string;
  feasible: boolean;
}

// ── Recommendations ──────────────────────────────────────────

export type FitStatus = 'perfect' | 'plenty' | 'shortened' | 'no-fit' | 'closed';

export interface TimeFit {
  status: FitStatus;
  walkMinutes: number;
  walkMeters: number;
  activityMinutes: number;
  bufferMinutes: number;
  totalMinutes: number;
  slackMinutes: number;
  chargingMinutes: number;
}

export interface ActivityRecommendation {
  kind: 'place' | 'in-car';
  id: string;
  name: string;
  emoji: string;
  category: PlaceCategory | 'in-car';
  rating?: number;
  fit: TimeFit;
  score: number;
  headline: string;
  reasons: string[];
}

export interface RecommendationRequest {
  chargingMinutesRemaining: number;
  stationId: string;
  category?: ActivityTag | 'all';
  preferences?: ActivityTag[];
  bufferMinutes?: number;
  clockHour?: number;
}

// ── AI chat ──────────────────────────────────────────────────

export interface ChatContext {
  journeyState: string;
  vehicleId: string;
  batteryPercent: number;
  rangeKm: number;
  stationId?: string;
  chargingMinutesRemaining?: number;
  chargeTargetPercent?: number;
  isCharging?: boolean;
  routeOptions?: Pick<
    RouteOption,
    'id' | 'stationId' | 'totalMinutes' | 'chargeMinutes' | 'chargingCost' | 'tags'
  >[];
  preferences?: ActivityTag[];
  clockHour?: number;
}

export interface ChatSuggestion {
  type: 'place' | 'station' | 'action';
  id: string;
  label: string;
  emoji?: string;
  meta?: string;
}

export interface ChatReply {
  reply: string;
  source: 'python' | 'engine';
  suggestions: ChatSuggestion[];
}

// ── Journey state machine ────────────────────────────────────

export type JourneyState =
  | 'IDLE'
  | 'SEARCHING'
  | 'ROUTE_SELECTED'
  | 'NAVIGATING'
  | 'ARRIVING'
  | 'ARRIVED'
  | 'CHARGING'
  | 'EXPLORING'
  | 'WALKING'
  | 'VISITING'
  | 'RETURNING'
  | 'CHARGING_COMPLETE'
  | 'NAVIGATING_TO_DESTINATION'
  | 'TRIP_COMPLETE';

export interface ChargingSessionInfo {
  id: string;
  stationId: string;
  vehicleId: string;
  startSoc: number;
  targetSoc: number;
  estimateMinutes: number;
  pricePerKwh: number;
  startedAt: string;
}
