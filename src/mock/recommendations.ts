import type { ActivityTag, InCarActivity } from '../types';

export interface CompanionCategory {
  id: ActivityTag;
  label: string;
  emoji: string;
}

export const companionCategories: CompanionCategory[] = [
  { id: 'coffee', label: 'Coffee', emoji: '☕' },
  { id: 'food', label: 'Food', emoji: '🍔' },
  { id: 'entertainment', label: 'Entertainment', emoji: '🎬' },
  { id: 'shopping', label: 'Shopping', emoji: '🛍️' },
  { id: 'relax', label: 'Relax', emoji: '🌳' },
  { id: 'work', label: 'Work', emoji: '💼' },
  { id: 'music', label: 'Music', emoji: '🎧' },
  { id: 'games', label: 'Games', emoji: '🎮' },
];

/** Things you can do without leaving the car. */
export const inCarActivities: InCarActivity[] = [
  { id: 'incar-lofi', name: 'Charging Chill playlist', emoji: '🎧', tags: ['music', 'relax'], minutes: 20, blurb: 'Lo-fi mix sized to your charging window, on the car speakers.' },
  { id: 'incar-arcade', name: 'In-car Arcade', emoji: '🕹️', tags: ['games'], minutes: 15, blurb: 'Play on the centre screen with a Bluetooth controller.' },
  { id: 'incar-focus', name: 'Focus mode', emoji: '💻', tags: ['work'], minutes: 20, blurb: 'Seat reclined, climate on, hotspot active — take that call.' },
  { id: 'incar-cinema', name: 'Screen time', emoji: '🍿', tags: ['entertainment'], minutes: 22, blurb: 'Catch an episode on the in-car display.' },
];

/** Quick prompts shown when the AI assistant opens. */
export const aiQuickPrompts = [
  'Find coffee nearby',
  'Find food',
  'What can I do in 15 minutes?',
  'Which charger is best?',
  'Is my car ready?',
];

/** Weights used by the deterministic RecommendationEngine. */
export const rankingWeights = {
  timeFit: { perfect: 40, plenty: 34, shortened: 18, 'no-fit': -40, closed: -80 },
  walkPerMinute: -1.6,
  ratingAbove4: 14,
  preference: 10,
  categoryMatch: 12,
};

/** Weights used to pick the AI-recommended charging route. */
export const routeWeights = {
  totalMinutes: -1.0,
  costPerDollar: -1.2,
  amenity: 3.2,
  lowWait: 6,
  fastCharger: 6,
  rating: 5,
  reserveBufferPerPercent: 0.15,
};
