import type { District } from '../types';

// Visual geography for the Nova City map (1 unit = 10 m).

export const WORLD = { width: 2400, height: 1600 };

/** The sea to the south (Nova Bay). */
export const seaPolygon: [number, number][] = [
  [0, 1320], [110, 1318], [128, 1290], [180, 1282], [300, 1282], [318, 1304], [420, 1328],
  [600, 1344], [800, 1352], [1000, 1360], [1200, 1362], [1300, 1362], [1500, 1360],
  [1700, 1352], [1830, 1362], [1880, 1422], [1960, 1482], [2060, 1502], [2170, 1482],
  [2262, 1432], [2322, 1362], [2400, 1342], [2400, 1600], [0, 1600],
];

/** Nova Creek centre line — drawn as a wide, smoothed stroke. */
export const creekPoints: [number, number][] = [
  [1262, 1380], [1252, 1300], [1270, 1200], [1276, 1120], [1262, 1050], [1244, 960],
  [1250, 860], [1266, 760], [1282, 660], [1276, 560], [1250, 470],
];
export const creekWidth = 34;
export const lagoon = { cx: 1245, cy: 440, rx: 70, ry: 44 };

export interface ParkArea {
  id: string;
  name: string;
  points: [number, number][];
  kind?: 'park' | 'beach' | 'garden';
}

export const parks: ParkArea[] = [
  { id: 'central-park', name: 'Central Park', points: [[1362, 1090], [1575, 1088], [1578, 1204], [1364, 1206]] },
  { id: 'tech-park-green', name: 'Tech Park Green', points: [[378, 296], [540, 290], [548, 428], [384, 432]] },
  { id: 'green-valley-park', name: 'Green Valley Park', points: [[930, 285], [1120, 272], [1128, 500], [1060, 512], [938, 505]] },
  { id: 'harbor-gardens', name: 'Harbor Point Gardens', points: [[2156, 1268], [2262, 1262], [2290, 1360], [2170, 1396]] },
  { id: 'creek-park', name: 'Creekside Park', points: [[1190, 900], [1236, 900], [1236, 1020], [1190, 1020]] },
  { id: 'dt-square', name: 'Unity Square', points: [[1004, 628], [1080, 628], [1080, 690], [1004, 690]] },
  { id: 'bay-park', name: 'Bay Gardens', points: [[1700, 590], [1760, 590], [1760, 650], [1700, 650]] },
  { id: 'marina-beach', name: 'Marina Beach', kind: 'beach', points: [[420, 1282], [880, 1296], [880, 1342], [600, 1336], [420, 1320]] },
  { id: 'harbor-beach', name: 'Harbor Beach', kind: 'beach', points: [[1560, 1300], [1800, 1300], [1822, 1350], [1560, 1352]] },
];

export const lakes = [{ cx: 1030, cy: 400, rx: 44, ry: 26 }];

/** Airport apron & runways (NE corner). */
export const airport = {
  zone: [[1990, 30], [2400, 30], [2400, 190], [1990, 190]] as [number, number][],
  runways: [
    { x: 2030, y: 62, w: 350, h: 16 },
    { x: 2070, y: 128, w: 300, h: 12 },
  ],
  terminal: { x: 1972, y: 70, w: 50, h: 100 },
};

/** A large mall footprint in the Central Mall district. */
export const landmarks = [
  { id: 'central-mall', name: 'Central Mall', x: 700, y: 1072, w: 170, h: 130, r: 10 },
  { id: 'nova-tower', name: 'Nova Tower', x: 1100, y: 740, w: 34, h: 34, r: 17 },
  { id: 'expo', name: 'Tech Expo', x: 600, y: 360, w: 90, h: 60, r: 8 },
];

export const districtLabels: { name: District; x: number; y: number }[] = [
  { name: 'Tech Park', x: 190, y: 420 },
  { name: 'Green Valley', x: 1030, y: 160 },
  { name: 'Airport District', x: 2180, y: 330 },
  { name: 'Downtown', x: 1090, y: 800 },
  { name: 'Business Bay', x: 1780, y: 760 },
  { name: 'Central Mall', x: 500, y: 980 },
  { name: 'Marina District', x: 180, y: 1080 },
  { name: 'Harbor Point', x: 2190, y: 1120 },
];

export const waterLabels = [
  { name: 'Nova Bay', x: 900, y: 1480, size: 30 },
  { name: 'Nova Creek', x: 1215, y: 1150, size: 13, rotate: -80 },
];
