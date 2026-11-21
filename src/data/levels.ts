import { BiomeType, LevelConfig, TimeOfDay, WeatherType } from '../types/game';

export const BIOME_META: Record<
  BiomeType,
  { label: string; skyHex: string; accent: string; summary: string }
> = {
  city: {
    label: 'Metro Downtown',
    skyHex: '#60a5fa',
    accent: '#3b82f6',
    summary: 'High-rise avenues, sweeping overpasses, and stadium grandstands.',
  },
  desert: {
    label: 'Desert Highway',
    skyHex: '#f59e0b',
    accent: '#ea580c',
    summary: 'Sun-baked asphalt cutting through sandstone canyons at golden hour.',
  },
  mountain: {
    label: 'Alpine Mountain Pass',
    skyHex: '#38bdf8',
    accent: '#0ea5e9',
    summary: 'Technical switchbacks, elevation climbs, and granite cliff drops.',
  },
  coastal: {
    label: 'Pacific Coastal Road',
    skyHex: '#0284c7',
    accent: '#06b6d4',
    summary: 'Oceanfront cliffside corners lined with palms and sea mist.',
  },
  snow: {
    label: 'Snowy Pine Forest',
    skyHex: '#94a3b8',
    accent: '#cbd5e1',
    summary: 'Icy forest straights with snowfall, reduced traction, and alpine fog.',
  },
  night_neon: {
    label: 'Night Neon City',
    skyHex: '#090b1a',
    accent: '#22d3ee',
    summary: 'Rain-slicked midnight boulevards reflecting neon towers and tail lights.',
  },
};

const BIOME_CYCLE: BiomeType[] = [
  'city',
  'desert',
  'mountain',
  'coastal',
  'snow',
  'night_neon',
];

const LEVEL_TITLES: Record<BiomeType, string[]> = {
  city: ['Downtown Sprint', 'Metro Apex Circuit', 'Skyline Grand Prix'],
  desert: ['Red Rock Straight', 'Canyon Mirage Run', 'Sunstroke Endurance'],
  mountain: ['Timberline Hairpins', 'Summit Switchback', 'Granite Peak Trial'],
  coastal: ['Bayshore Drive', 'Ocean Cliff Run', 'Sunset Horizon Loop'],
  snow: ['Frostbite Valley', 'Glacier Pine Circuit', 'Blizzard Ridge'],
  night_neon: ['Midnight Wet Run', 'Neon District Sprint', 'Hypernova Nocturne'],
};

/**
 * Generates deterministic yet fresh level parameters for any level index >= 1,
 * scaling turns, speed of AI rivals, obstacle count, and rewards as levels progress.
 */
export function getLevelConfig(levelNumber: number, raceRunSalt = 0): LevelConfig {
  const idx = Math.max(0, levelNumber - 1);
  const biome = BIOME_CYCLE[idx % BIOME_CYCLE.length];
  const tier = Math.floor(idx / BIOME_CYCLE.length);

  let weather: WeatherType = 'clear';
  let timeOfDay: TimeOfDay = 'day';

  if (biome === 'desert') timeOfDay = 'sunset';
  if (biome === 'coastal' && tier % 2 === 1) timeOfDay = 'sunset';
  if (biome === 'night_neon') {
    timeOfDay = 'night';
    weather = 'rain';
  } else if (biome === 'snow') {
    weather = 'snow';
    timeOfDay = tier % 2 === 1 ? 'sunset' : 'day';
  } else if (biome === 'mountain' && tier > 0) {
    weather = 'fog';
  } else if (biome === 'city' && tier > 0) {
    weather = tier % 2 === 1 ? 'rain' : 'clear';
  }

  const names = LEVEL_TITLES[biome];
  const name =
    tier === 0
      ? names[0]
      : `${names[tier % names.length]} ${tier > 2 ? `Tier ${tier + 1}` : 'Pro'}`;

  const rivalCount = Math.min(7, 2 + Math.floor(idx * 0.65));
  const rivalSkill = Math.min(1.14, 0.72 + idx * 0.04);
  const trackCurviness = Math.min(1.0, 0.35 + idx * 0.06);
  const laps = levelNumber <= 2 ? 2 : levelNumber <= 6 ? 2 : 3;
  const trackLengthMeters = 1550 + Math.min(1200, idx * 140);
  const obstacleCount = Math.min(22, 3 + idx * 2);
  const baseReward = 450 + idx * 180;

  return {
    levelNumber,
    name,
    biome,
    weather,
    timeOfDay,
    laps,
    trackLengthMeters,
    trackCurviness,
    rivalCount,
    rivalSkill,
    obstacleCount,
    seed: levelNumber * 9301 + raceRunSalt * 49297 + 1337,
    baseReward,
    description: `${BIOME_META[biome].summary} ${laps} laps · ${rivalCount} AI rivals.`,
  };
}

export const PRESET_LEVEL_COUNT = 12;
