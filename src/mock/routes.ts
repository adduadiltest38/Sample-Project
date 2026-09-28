import type { Point, Road, RoadNode } from '../types';

// ─────────────────────────────────────────────────────────────
// Nova City road network (fictional).
// 1 map unit = 10 m. Nodes are intersections or access points,
// roads are ordered node lists. Routing runs on this graph.
// ─────────────────────────────────────────────────────────────

const N: Record<string, [number, number]> = {
  // Tech Park Highway (north ring)
  TPH_W: [60, 300],
  TPH_INNO: [350, 270],
  TPH_MALL: [650, 255],
  TPH_DT: [900, 250],
  TPH_VAL: [1150, 240],
  TPH_CRK: [1340, 245],
  TPH_BAY: [1600, 240],
  TPH_AIR: [1950, 230],
  TPH_E: [2380, 215],

  // Sheikh Avenue (main east–west artery)
  SA_W: [0, 590],
  SA_INNO: [350, 565],
  SA_MALL: [650, 548],
  SA_DT: [900, 540],
  SA_VAL: [1150, 536],
  SA_CRK: [1340, 532],
  SA_BAY: [1600, 530],
  SA_ULTRA: [1780, 528],
  SA_AIR: [1950, 525],
  SA_E: [2400, 512],

  // Central Boulevard
  CB_W: [100, 872],
  CB_MW: [220, 870],
  CB_INNO: [350, 868],
  CB_MALL: [650, 864],
  CB_DT: [900, 860],
  CB_CRK: [1340, 858],
  CB_BAY: [1600, 856],
  CB_AIR: [1950, 852],
  CB_E: [2380, 846],

  // Garden Street
  GS_MALL: [650, 1050],
  DT_S: [900, 1050],
  CR_STN: [1340, 1050],
  BAY_S: [1600, 1050],
  GS_E: [1950, 1050],

  // Marina Road (coastal)
  MR_W: [40, 1240],
  MR_MW: [220, 1238],
  MR_MARINA: [350, 1236],
  MR_MALL: [650, 1236],
  MR_DT: [900, 1238],
  MR_CRK: [1340, 1236],
  MR_HUB: [1470, 1235],
  MR_BAY: [1600, 1234],
  MR_HS: [1800, 1232],
  MR_AIR: [1950, 1230],

  // Harbor Street & Gulf Crescent (Harbor Point)
  HS_1: [1862, 1298],
  HS_2: [1952, 1368],
  HP_DEST: [2040, 1424],
  GC_1: [2070, 1268],
  HP_QC: [2130, 1336],
  GC_2: [2112, 1404],
  GC_E: [2300, 1250],

  // North–south roads
  INNO_N: [350, 120],
  TECH_START: [350, 385],
  TP_STN: [350, 460],
  DT_VOLT: [900, 700],
  VR_N: [1150, 100],
  GV_STN: [1150, 390],
  LD_N: [1340, 400],
  BB_STN: [1600, 700],
  AIR_T: [1950, 110],
  AIR_STN: [1950, 385],
};

export const roadNodes: Record<string, RoadNode> = Object.fromEntries(
  Object.entries(N).map(([id, [x, y]]) => [id, { id, x, y }]),
);

export const roads: Road[] = [
  {
    id: 'tech-park-highway',
    name: 'Tech Park Highway',
    class: 'highway',
    speedKmh: 100,
    traffic: 0.9,
    nodes: ['TPH_W', 'TPH_INNO', 'TPH_MALL', 'TPH_DT', 'TPH_VAL', 'TPH_CRK', 'TPH_BAY', 'TPH_AIR', 'TPH_E'],
  },
  {
    id: 'sheikh-avenue',
    name: 'Sheikh Avenue',
    class: 'highway',
    speedKmh: 100,
    traffic: 0.8,
    nodes: ['SA_W', 'SA_INNO', 'SA_MALL', 'SA_DT', 'SA_VAL', 'SA_CRK', 'SA_BAY', 'SA_ULTRA', 'SA_AIR', 'SA_E'],
  },
  {
    id: 'central-boulevard',
    name: 'Central Boulevard',
    class: 'avenue',
    speedKmh: 70,
    traffic: 0.85,
    nodes: ['CB_W', 'CB_MW', 'CB_INNO', 'CB_MALL', 'CB_DT', 'CB_CRK', 'CB_BAY', 'CB_AIR', 'CB_E'],
  },
  {
    id: 'garden-street',
    name: 'Garden Street',
    class: 'street',
    speedKmh: 45,
    traffic: 0.8,
    nodes: ['GS_MALL', 'DT_S', 'CR_STN', 'BAY_S', 'GS_E'],
  },
  {
    id: 'marina-road',
    name: 'Marina Road',
    class: 'avenue',
    speedKmh: 70,
    traffic: 0.9,
    nodes: ['MR_W', 'MR_MW', 'MR_MARINA', 'MR_MALL', 'MR_DT', 'MR_CRK', 'MR_HUB', 'MR_BAY', 'MR_HS', 'MR_AIR'],
  },
  {
    id: 'harbor-street',
    name: 'Harbor Street',
    class: 'street',
    speedKmh: 50,
    nodes: ['MR_HS', 'HS_1', 'HS_2', 'HP_DEST'],
  },
  {
    id: 'gulf-crescent',
    name: 'Gulf Crescent',
    class: 'street',
    speedKmh: 40,
    traffic: 0.85,
    nodes: ['MR_AIR', 'GC_1', 'HP_QC', 'GC_2', 'HP_DEST'],
  },
  {
    id: 'harbor-link',
    name: 'Harbor Link',
    class: 'street',
    speedKmh: 50,
    nodes: ['CB_E', 'GC_E', 'GC_1'],
  },
  {
    id: 'innovation-drive',
    name: 'Innovation Drive',
    class: 'avenue',
    speedKmh: 60,
    traffic: 0.9,
    nodes: ['INNO_N', 'TPH_INNO', 'TECH_START', 'TP_STN', 'SA_INNO', 'CB_INNO'],
  },
  {
    id: 'mall-street',
    name: 'Mall Street',
    class: 'avenue',
    speedKmh: 50,
    traffic: 0.75,
    nodes: ['TPH_MALL', 'SA_MALL', 'CB_MALL', 'GS_MALL', 'MR_MALL'],
  },
  {
    id: 'downtown-avenue',
    name: 'Downtown Avenue',
    class: 'avenue',
    speedKmh: 60,
    traffic: 0.8,
    nodes: ['TPH_DT', 'SA_DT', 'DT_VOLT', 'CB_DT', 'DT_S', 'MR_DT'],
  },
  {
    id: 'valley-road',
    name: 'Valley Road',
    class: 'street',
    speedKmh: 50,
    nodes: ['VR_N', 'TPH_VAL', 'GV_STN', 'SA_VAL'],
  },
  {
    id: 'lagoon-drive',
    name: 'Lagoon Drive',
    class: 'street',
    speedKmh: 40,
    nodes: ['TPH_CRK', 'LD_N', 'SA_CRK'],
  },
  {
    id: 'creek-road',
    name: 'Creek Road',
    class: 'avenue',
    speedKmh: 60,
    nodes: ['CB_CRK', 'CR_STN', 'MR_CRK'],
  },
  {
    id: 'bay-avenue',
    name: 'Bay Avenue',
    class: 'avenue',
    speedKmh: 60,
    traffic: 0.7,
    nodes: ['TPH_BAY', 'SA_BAY', 'BB_STN', 'CB_BAY', 'BAY_S', 'MR_BAY'],
  },
  {
    id: 'airport-road',
    name: 'Airport Road',
    class: 'highway',
    speedKmh: 90,
    traffic: 0.85,
    nodes: ['AIR_T', 'TPH_AIR', 'AIR_STN', 'SA_AIR', 'CB_AIR', 'GS_E', 'MR_AIR'],
  },
  {
    id: 'marina-walk',
    name: 'Marina Walk',
    class: 'street',
    speedKmh: 40,
    nodes: ['CB_MW', 'MR_MW'],
  },
];

/** Decorative local street grids, per block. [x0, y0, x1, y1, spacing]. */
export const localGrids: [number, number, number, number, number][] = [
  [920, 560, 1225, 840, 64], // Downtown core
  [920, 880, 1225, 1220, 78], // Downtown south
  [1360, 550, 1930, 840, 72], // Business Bay
  [1620, 880, 1930, 1210, 80],
  [1360, 880, 1590, 1030, 75],
  [370, 885, 630, 1220, 84], // Central Mall
  [670, 885, 880, 1030, 70],
  [40, 290, 330, 540, 84], // Tech Park west
  [560, 280, 880, 520, 80],
  [40, 600, 330, 850, 82], // Marina north
  [370, 590, 880, 850, 86],
  [40, 890, 200, 1220, 80],
  [1360, 260, 1930, 510, 86], // Green Valley east
  [1970, 210, 2380, 500, 90], // Airport district
  [1970, 550, 2380, 1230, 92], // Harbor Point
  [60, 40, 1900, 225, 96], // North
];

export interface TripPreset {
  id: string;
  label: string;
  start: { nodeId: string; label: string; district: string };
  destination: { nodeId: string; label: string; district: string; address: string };
  /** Onward driving planned after the destination (km). */
  onwardKm: number;
  onwardLabel: string;
}

export const demoTrip: TripPreset = {
  id: 'trip-harbor-point',
  label: 'Tech Park → Harbor Point',
  start: { nodeId: 'TECH_START', label: 'Innovation Drive', district: 'Tech Park' },
  destination: {
    nodeId: 'HP_DEST',
    label: 'Harbor Point',
    district: 'Harbor Point',
    address: 'Waterfront Terminal, Harbor Street',
  },
  onwardKm: 215,
  onwardLabel: 'Coastal Highway to Al Noor',
};

export const destinations = [
  demoTrip.destination,
  { nodeId: 'AIR_T', label: 'Nova International Airport', district: 'Airport District', address: 'Terminal 1, Airport Road' },
  { nodeId: 'MR_W', label: 'Marina Yacht Club', district: 'Marina District', address: 'Marina Road West' },
];

/** Fictional lat/lng projection so data "looks" geographic. */
export function toLatLng(p: Point) {
  return {
    lat: +(25.32 - p.y * 0.00009).toFixed(5),
    lng: +(55.12 + p.x * 0.0001).toFixed(5),
  };
}
