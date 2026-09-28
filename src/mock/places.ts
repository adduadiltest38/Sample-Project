import type { ActivityTag, District, Place, PlaceCategory } from '../types';
import { chargingStations } from './stations';
import { toLatLng } from './routes';

type Seed = [
  id: string,
  name: string,
  category: PlaceCategory,
  emoji: string,
  stationId: string,
  offset: [number, number],
  rating: number,
  price: 1 | 2 | 3 | 4,
  visit: [typical: number, min: number],
  hours: [opens: number, closes: number],
  tags: ActivityTag[],
  blurb: string,
];

// Offsets are relative to the charging station marker (1 unit = 10 m).
// Walking distance is measured along an L-shaped footpath (|dx| + |dy|).
const seeds: Seed[] = [
  // ── ChargeFlow Fast Hub (featured demo cluster) ────────────
  ['place-brew-lab', 'Brew Lab', 'cafe', '☕', 'station-001', [24, 6], 4.8, 2, [10, 6], [7, 22], ['coffee', 'work'], 'Single-origin pour-overs and flat whites on the promenade.'],
  ['place-urban-bites', 'Urban Bites', 'restaurant', '🍔', 'station-001', [-22, 8], 4.6, 2, [15, 10], [11, 23], ['food'], 'Smash burgers, bowls and fresh juices — fast service.'],
  ['place-central-park', 'Central Park', 'park', '🌳', 'station-001', [-8, -37], 4.7, 1, [20, 6], [6, 23], ['relax'], 'Shaded paths, a fountain garden and quiet benches.'],
  ['place-nomad-desk', 'Nomad Desk', 'cafe', '💼', 'station-001', [-8, 30], 4.5, 2, [15, 8], [8, 20], ['work', 'coffee'], 'Quiet co-working café with fast WiFi and phone booths.'],
  ['place-sakura', 'Sakura Sushi Bar', 'restaurant', '🍣', 'station-001', [30, 34], 4.7, 3, [25, 18], [12, 23], ['food'], 'Omakase counter and quick lunch sets.'],
  ['place-vinyl-vault', 'Vinyl Vault', 'shopping', '🎧', 'station-001', [58, 12], 4.6, 2, [15, 8], [10, 22], ['music', 'shopping'], 'Record store with listening booths and local artists.'],
  ['place-pixel-arcade', 'Pixel Arcade', 'entertainment', '🎮', 'station-001', [-52, 16], 4.5, 1, [20, 10], [10, 24], ['games', 'entertainment'], 'Retro cabinets, racing sims and air hockey.'],
  ['place-seaside-cinema', 'Seaside Cinema', 'cinema', '🎬', 'station-001', [6, 58], 4.4, 3, [120, 95], [10, 24], ['entertainment'], 'Boutique cinema with recliner seats and sea views.'],

  // ── Volt Station Downtown ──────────────────────────────────
  ['place-spice-route', 'Spice Route', 'restaurant', '🍛', 'station-002', [30, -20], 4.6, 2, [30, 20], [12, 23], ['food'], 'Modern Indian thalis and street-food plates.'],
  ['place-burger-lab', 'The Burger Lab', 'restaurant', '🍔', 'station-002', [-40, 25], 4.3, 2, [20, 12], [11, 24], ['food'], 'Wagyu burgers and truffle fries.'],
  ['place-espresso-republic', 'Espresso Republic', 'cafe', '☕', 'station-002', [25, 30], 4.5, 2, [10, 5], [7, 21], ['coffee'], 'Italian espresso bar with standing counter.'],
  ['place-nova-cinemas', 'Nova Cinemas Downtown', 'cinema', '🎬', 'station-002', [60, -10], 4.4, 3, [120, 95], [10, 24], ['entertainment'], 'Twelve-screen multiplex with Dolby Atmos.'],
  ['place-echo-lounge', 'Echo Lounge', 'entertainment', '🎷', 'station-002', [-30, -45], 4.6, 3, [45, 30], [18, 24], ['music', 'entertainment'], 'Live jazz and DJ sets in the evening.'],

  // ── Tech Park Supercharge ──────────────────────────────────
  ['place-byte-bistro', 'Byte Bistro', 'restaurant', '🥗', 'station-003', [-40, -20], 4.4, 2, [20, 12], [8, 21], ['food'], 'Healthy bowls for the Tech Park crowd.'],
  ['place-green-bowl', 'Green Bowl', 'restaurant', '🥙', 'station-003', [-30, 35], 4.3, 1, [15, 10], [9, 21], ['food'], 'Falafel wraps and grain bowls.'],
  ['place-circuit-coffee', 'Circuit Coffee', 'cafe', '☕', 'station-003', [-25, 12], 4.6, 2, [10, 5], [7, 20], ['coffee', 'work'], 'Cold brew on tap and standing desks.'],
  ['place-vr-arena', 'VR Arena', 'entertainment', '🥽', 'station-003', [-60, 50], 4.7, 3, [30, 20], [12, 24], ['games', 'entertainment'], 'Free-roam VR missions for up to 6 players.'],
  ['place-tech-park-green', 'Tech Park Green', 'park', '🌳', 'station-003', [64, -40], 4.5, 1, [15, 8], [6, 22], ['relax'], 'Lawns and shaded walking loops between campuses.'],

  // ── Airport Charge Plaza ───────────────────────────────────
  ['place-runway-diner', 'Runway Diner', 'restaurant', '🥞', 'station-004', [30, -25], 4.2, 2, [25, 15], [6, 24], ['food'], 'All-day breakfast with runway views.'],
  ['place-sky-noodle', 'Sky Noodle Bar', 'restaurant', '🍜', 'station-004', [40, 30], 4.5, 2, [20, 12], [10, 24], ['food'], 'Hand-pulled noodles and bao.'],
  ['place-jetlag-coffee', 'Jetlag Coffee', 'cafe', '☕', 'station-004', [25, 6], 4.3, 2, [10, 5], [0, 24], ['coffee'], 'Open 24/7 — espresso for early flights.'],
  ['place-duty-free', 'Duty Free Outlet', 'shopping', '🛍️', 'station-004', [70, -60], 4.1, 3, [30, 15], [8, 23], ['shopping'], 'Fragrances, electronics and travel gear.'],

  // ── Marina EV Point ────────────────────────────────────────
  ['place-catch-of-the-day', 'Catch of the Day', 'restaurant', '🐟', 'station-005', [-40, 20], 4.7, 3, [35, 25], [12, 23], ['food'], 'Grilled catch of the day on the marina.'],
  ['place-marina-tacos', 'Marina Tacos', 'restaurant', '🌮', 'station-005', [45, 15], 4.5, 1, [15, 10], [11, 24], ['food'], 'Baja fish tacos and aguas frescas.'],
  ['place-salt-sand', 'Salt & Sand Café', 'cafe', '🥐', 'station-005', [20, 25], 4.6, 2, [15, 8], [7, 20], ['coffee', 'relax'], 'Beachside croissants and iced lattes.'],
  ['place-marina-beach', 'Marina Beach Park', 'park', '🏖️', 'station-005', [80, 35], 4.8, 1, [25, 10], [6, 22], ['relax'], 'Palm-lined beach promenade.'],

  // ── Central Mall Charging ──────────────────────────────────
  ['place-central-mall', 'Central Mall', 'shopping', '🛍️', 'station-006', [40, 40], 4.6, 3, [40, 15], [10, 23], ['shopping'], '300 stores under one roof.'],
  ['place-food-hall', 'Food Hall Nova', 'restaurant', '🍱', 'station-006', [70, 55], 4.5, 2, [25, 15], [10, 23], ['food'], '30 kitchens, one big communal hall.'],
  ['place-pasta-fresca', 'Pasta Fresca', 'restaurant', '🍝', 'station-006', [100, 48], 4.4, 2, [30, 20], [11, 23], ['food'], 'Fresh pasta made in the window.'],
  ['place-shawarma-station', 'Shawarma Station', 'restaurant', '🌯', 'station-006', [-35, -30], 4.7, 1, [10, 6], [10, 24], ['food'], 'Legendary chicken shawarma, ready in 3 minutes.'],
  ['place-mall-roasters', 'Mall Roasters', 'cafe', '☕', 'station-006', [-26, 24], 4.4, 2, [10, 5], [9, 23], ['coffee'], 'Roastery café at the mall entrance.'],
  ['place-cinemax', 'CineMax Central Mall', 'cinema', '🎬', 'station-006', [120, 90], 4.5, 3, [120, 95], [10, 24], ['entertainment'], 'IMAX, 4DX and VIP screens.'],
  ['place-gadget-galaxy', 'Gadget Galaxy', 'shopping', '📱', 'station-006', [85, 75], 4.3, 3, [20, 10], [10, 23], ['shopping', 'games'], 'Latest phones, consoles and EV accessories.'],
  ['place-bowl-roll', 'Bowl & Roll', 'entertainment', '🎳', 'station-006', [140, 110], 4.4, 2, [45, 30], [12, 24], ['games', 'entertainment'], 'Bowling lanes and a games lounge.'],

  // ── Business Bay PowerHub ──────────────────────────────────
  ['place-bay-brasserie', 'Bay Brasserie', 'restaurant', '🥩', 'station-007', [40, -25], 4.6, 4, [45, 30], [12, 24], ['food'], 'French brasserie popular for business lunches.'],
  ['place-poke-point', 'Poke Point', 'restaurant', '🥗', 'station-007', [-20, 35], 4.4, 2, [15, 10], [10, 22], ['food'], 'Build-your-own poke bowls.'],
  ['place-daily-grind', 'The Daily Grind', 'cafe', '☕', 'station-007', [22, 14], 4.5, 2, [10, 5], [6, 21], ['coffee', 'work'], 'Busy café with meeting pods.'],
  ['place-bay-imax', 'Bay IMAX', 'cinema', '🎬', 'station-007', [70, 50], 4.3, 3, [130, 100], [11, 24], ['entertainment'], 'The biggest screen in Nova City.'],

  // ── Green Valley Eco Charge ────────────────────────────────
  ['place-farm-table', 'Farm Table', 'restaurant', '🥕', 'station-008', [-40, -30], 4.7, 3, [35, 25], [11, 22], ['food'], 'Farm-to-table plates from Valley growers.'],
  ['place-green-valley-park', 'Green Valley Park', 'park', '🌿', 'station-008', [-16, 10], 4.9, 1, [25, 10], [5, 23], ['relax'], 'Lake loop, birdwatching deck and picnic lawns.'],
  ['place-leaf-bean', 'Leaf & Bean', 'cafe', '🍵', 'station-008', [-30, 40], 4.5, 2, [15, 8], [7, 19], ['coffee', 'relax'], 'Matcha, herbal teas and garden seating.'],

  // ── Harbor Point Quick Charge ──────────────────────────────
  ['place-harbor-grill', 'Harbor Grill', 'restaurant', '🦐', 'station-009', [-50, 20], 4.5, 3, [40, 25], [12, 24], ['food'], 'Seafood grill on the pier.'],
  ['place-fishermans-wharf', "Fisherman's Wharf", 'restaurant', '🦞', 'station-009', [-20, 60], 4.3, 3, [35, 25], [12, 23], ['food'], 'Classic seafood platters by the water.'],
  ['place-harbor-lights', 'Harbor Lights Cinema', 'cinema', '🎬', 'station-009', [50, -40], 4.2, 2, [115, 95], [12, 24], ['entertainment'], 'Open-air rooftop screenings.'],
  ['place-harbor-karting', 'Harbor Karting', 'entertainment', '🏎️', 'station-009', [90, -70], 4.6, 3, [30, 20], [12, 23], ['games', 'entertainment'], 'Electric go-karts on a harbour-side track.'],
  ['place-harbor-market', 'Harbor Market', 'shopping', '🧺', 'station-009', [-60, -30], 4.5, 2, [25, 10], [8, 20], ['shopping', 'food'], 'Weekend makers market and food stalls.'],
  ['place-harbor-gardens', 'Harbor Point Gardens', 'park', '🌴', 'station-009', [16, -6], 4.6, 1, [15, 8], [6, 22], ['relax'], 'Palm gardens overlooking the bay.'],

  // ── Sheikh Avenue Ultra ────────────────────────────────────
  ['place-road-trip-kitchen', 'Road Trip Kitchen', 'restaurant', '🌭', 'station-010', [25, -20], 4.1, 1, [15, 8], [0, 24], ['food'], 'Grab-and-go meals for the road.'],
  ['place-pit-stop-espresso', 'Pit Stop Espresso', 'cafe', '☕', 'station-010', [-20, -18], 4.3, 1, [8, 4], [0, 24], ['coffee'], 'Drive-through style espresso bar.'],

  // ── Nova Creek Charge ──────────────────────────────────────
  ['place-creekside-kebab', 'Creekside Kebab', 'restaurant', '🍢', 'station-011', [20, 25], 4.5, 1, [15, 10], [11, 24], ['food'], 'Charcoal-grilled kebabs by the creek.'],
  ['place-dhow-coffee', 'Dhow Coffee', 'cafe', '☕', 'station-011', [25, -20], 4.4, 1, [10, 5], [7, 22], ['coffee'], 'Cardamom coffee served on a restored dhow.'],
];

const stationMap = new Map(chargingStations.map((s) => [s.id, s]));

export const places: Place[] = seeds.map(
  ([id, name, category, emoji, stationId, [dx, dy], rating, priceLevel, [visitMinutes, minVisitMinutes], [opens, closes], tags, blurb]) => {
    const station = stationMap.get(stationId)!;
    const position = { x: station.position.x + dx, y: station.position.y + dy };
    return {
      id,
      name,
      category,
      emoji,
      district: station.district as District,
      position,
      location: toLatLng(position),
      nearStationId: stationId,
      rating,
      priceLevel,
      visitMinutes,
      minVisitMinutes,
      opens,
      closes,
      tags,
      blurb,
    };
  },
);

export const placeById = (id: string) => places.find((p) => p.id === id);

export const placesNearStation = (stationId: string) =>
  places.filter((p) => p.nearStationId === stationId);

export const categoryMeta: Record<PlaceCategory, { label: string; emoji: string }> = {
  restaurant: { label: 'Restaurant', emoji: '🍔' },
  cafe: { label: 'Café', emoji: '☕' },
  cinema: { label: 'Cinema', emoji: '🎬' },
  shopping: { label: 'Shopping', emoji: '🛍️' },
  park: { label: 'Park', emoji: '🌳' },
  entertainment: { label: 'Entertainment', emoji: '🎮' },
};
