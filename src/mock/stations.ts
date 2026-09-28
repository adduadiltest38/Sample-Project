import type { Amenity, ChargingStation, District } from '../types';
import { roadNodes, toLatLng } from './routes';

interface StationSeed {
  id: string;
  name: string;
  network: string;
  district: District;
  address: string;
  nodeId: string;
  /** Marker offset from the access node, in map units. */
  offset: [number, number];
  chargers: number;
  availableChargers: number;
  powerKW: number;
  connector: string;
  pricePerKwh: number;
  rating: number;
  reviews: number;
  amenities: Amenity[];
  queueMinutes: number;
  solar?: boolean;
}

const seeds: StationSeed[] = [
  {
    id: 'station-001',
    name: 'ChargeFlow Fast Hub',
    network: 'ChargeFlow',
    district: 'Harbor Point',
    address: '41 Marina Road, Creekside',
    nodeId: 'MR_HUB',
    offset: [0, 20],
    chargers: 8,
    availableChargers: 5,
    powerKW: 150,
    connector: 'CCS2 · DC',
    pricePerKwh: 0.45,
    rating: 4.8,
    reviews: 1284,
    amenities: ['Coffee', 'Food', 'Restroom', 'Shopping', 'WiFi'],
    queueMinutes: 6,
  },
  {
    id: 'station-002',
    name: 'Volt Station Downtown',
    network: 'Volt',
    district: 'Downtown',
    address: '120 Downtown Avenue',
    nodeId: 'DT_VOLT',
    offset: [20, 0],
    chargers: 6,
    availableChargers: 1,
    powerKW: 120,
    connector: 'CCS2 · DC',
    pricePerKwh: 0.52,
    rating: 4.4,
    reviews: 642,
    amenities: ['Food', 'Restroom', 'WiFi'],
    queueMinutes: 10,
  },
  {
    id: 'station-003',
    name: 'Tech Park Supercharge',
    network: 'ChargeFlow',
    district: 'Tech Park',
    address: '8 Innovation Drive',
    nodeId: 'TP_STN',
    offset: [-20, 0],
    chargers: 12,
    availableChargers: 7,
    powerKW: 250,
    connector: 'CCS2 · DC',
    pricePerKwh: 0.61,
    rating: 4.6,
    reviews: 2011,
    amenities: ['WiFi', 'Restroom', 'Convenience'],
    queueMinutes: 5,
  },
  {
    id: 'station-004',
    name: 'Airport Charge Plaza',
    network: 'SkyVolt',
    district: 'Airport District',
    address: 'Airport Road, Car Park P3',
    nodeId: 'AIR_STN',
    offset: [20, 0],
    chargers: 10,
    availableChargers: 4,
    powerKW: 180,
    connector: 'CCS2 · DC',
    pricePerKwh: 0.55,
    rating: 4.3,
    reviews: 988,
    amenities: ['Food', 'Restroom', 'Lounge', 'Coffee'],
    queueMinutes: 8,
  },
  {
    id: 'station-005',
    name: 'Marina EV Point',
    network: 'BlueCharge',
    district: 'Marina District',
    address: '3 Marina Road',
    nodeId: 'MR_MARINA',
    offset: [0, 20],
    chargers: 4,
    availableChargers: 2,
    powerKW: 50,
    connector: 'CCS2 · DC',
    pricePerKwh: 0.32,
    rating: 4.5,
    reviews: 311,
    amenities: ['Coffee', 'Beach', 'Restroom'],
    queueMinutes: 12,
  },
  {
    id: 'station-006',
    name: 'Central Mall Charging',
    network: 'MallPower',
    district: 'Central Mall',
    address: 'Central Mall, Level B2',
    nodeId: 'GS_MALL',
    offset: [16, -12],
    chargers: 20,
    availableChargers: 11,
    powerKW: 100,
    connector: 'CCS2 · DC',
    pricePerKwh: 0.29,
    rating: 4.7,
    reviews: 1766,
    amenities: ['Shopping', 'Food', 'Cinema', 'Restroom', 'WiFi', 'Coffee'],
    queueMinutes: 4,
  },
  {
    id: 'station-007',
    name: 'Business Bay PowerHub',
    network: 'Volt',
    district: 'Business Bay',
    address: '77 Bay Avenue',
    nodeId: 'BB_STN',
    offset: [20, 0],
    chargers: 8,
    availableChargers: 3,
    powerKW: 200,
    connector: 'CCS2 · DC',
    pricePerKwh: 0.49,
    rating: 4.5,
    reviews: 875,
    amenities: ['Coffee', 'WiFi', 'Workspace', 'Restroom'],
    queueMinutes: 7,
  },
  {
    id: 'station-008',
    name: 'Green Valley Eco Charge',
    network: 'GreenGrid',
    district: 'Green Valley',
    address: '15 Valley Road',
    nodeId: 'GV_STN',
    offset: [-20, 0],
    chargers: 6,
    availableChargers: 6,
    powerKW: 75,
    connector: 'CCS2 · DC',
    pricePerKwh: 0.35,
    rating: 4.6,
    reviews: 402,
    amenities: ['Park', 'Coffee', 'Restroom'],
    queueMinutes: 3,
    solar: true,
  },
  {
    id: 'station-009',
    name: 'Harbor Point Quick Charge',
    network: 'BlueCharge',
    district: 'Harbor Point',
    address: '2 Gulf Crescent',
    nodeId: 'HP_QC',
    offset: [20, 0],
    chargers: 4,
    availableChargers: 1,
    powerKW: 60,
    connector: 'CCS2 · DC',
    pricePerKwh: 0.4,
    rating: 4.1,
    reviews: 219,
    amenities: ['Restroom', 'Food'],
    queueMinutes: 14,
  },
  {
    id: 'station-010',
    name: 'Sheikh Avenue Ultra',
    network: 'Ionix',
    district: 'Business Bay',
    address: 'Sheikh Avenue, Exit 42',
    nodeId: 'SA_ULTRA',
    offset: [0, -20],
    chargers: 16,
    availableChargers: 9,
    powerKW: 350,
    connector: 'CCS2 · DC',
    pricePerKwh: 0.69,
    rating: 4.4,
    reviews: 3120,
    amenities: ['Restroom', 'Convenience', 'Food'],
    queueMinutes: 5,
  },
  {
    id: 'station-011',
    name: 'Nova Creek Charge',
    network: 'Volt',
    district: 'Downtown',
    address: 'Creek Road & Garden Street',
    nodeId: 'CR_STN',
    offset: [20, 0],
    chargers: 6,
    availableChargers: 0,
    powerKW: 150,
    connector: 'CCS2 · DC',
    pricePerKwh: 0.44,
    rating: 4.2,
    reviews: 530,
    amenities: ['Coffee', 'Restroom'],
    queueMinutes: 15,
  },
];

export const chargingStations: ChargingStation[] = seeds.map(({ offset, ...s }) => {
  const node = roadNodes[s.nodeId];
  const position = { x: node.x + offset[0], y: node.y + offset[1] };
  return { ...s, position, location: toLatLng(position) };
});

export const stationById = (id: string) => chargingStations.find((s) => s.id === id);

export const FEATURED_STATION_ID = 'station-001';
