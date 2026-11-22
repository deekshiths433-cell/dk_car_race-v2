import {
  BiomeType,
  DifficultySetting,
  FavoriteMapSeed,
  LevelConfig,
  TimeOfDay,
  TrackArchetype,
  WeatherType,
} from '../types/game';
import { getLevelRaceParameters } from './difficulty';
import { createSeededRng } from '../utils/trackLayout';

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
    summary: 'Sun-baked asphalt cutting through sandstone canyons.',
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

export const BIOME_CYCLE: BiomeType[] = [
  'city',
  'desert',
  'mountain',
  'coastal',
  'snow',
  'night_neon',
];

const ARCHETYPE_POOL: TrackArchetype[] = [
  'sweep',
  'hairpin',
  'chicane',
  'speedway',
  'technical',
];

const BIOME_PREFIXES: Record<BiomeType, string[]> = {
  city: ['Metro', 'Skyline', 'Grand Prix', 'Midtown', 'Harbor', 'Boulevard'],
  desert: ['Red Rock', 'Mirage', 'Mojave', 'Sunburst', 'Sandstone', 'Canyon'],
  mountain: ['Alpine', 'Granite Peak', 'Timberline', 'Summit', 'Eagle Crest', 'Cloudline'],
  coastal: ['Pacific', 'Bayshore', 'Sunset Cliff', 'Oceanic', 'Laguna', 'Coral'],
  snow: ['Glacier', 'Frostbite', 'Nordic Pine', 'Blizzard', 'Iceberg', 'Evergreen'],
  night_neon: ['Neon', 'Hypernova', 'Midnight', 'Cyber', 'Voltage', 'Eclipse'],
};

const ARCHETYPE_SUFFIXES: Record<TrackArchetype, string[]> = {
  sweep: ['Apex Loop', 'Sweeper Circuit', 'Horizon Ring'],
  hairpin: ['Switchback', 'Hairpin Pass', 'Serpentine GP'],
  chicane: ['Chicane Run', 'S-Curve Sprint', 'Technical Avenue'],
  speedway: ['Velocity Oval', 'Superstraight', 'Autobahn Loop'],
  technical: ['Pro Circuit', 'Apex Gauntlet', 'Mastery Track'],
};

function buildStatsFromDifficulty(
  levelNumber: number,
  difficultySetting: DifficultySetting = 'normal'
) {
  const params = getLevelRaceParameters(levelNumber, difficultySetting);
  return {
    rivalCount: params.rivalCount,
    rivalSkill: params.factor,
    difficultyName: params.difficultyName,
    trackCurviness: params.trackCurviness,
    roadWidth: params.roadWidth,
    laps: params.laps,
    trackLengthMeters: params.trackLengthMeters,
    obstacleCount: params.obstacleCount,
    collisionDamageMult: params.collisionDamageMult,
    checkpointTimeLimitSec: params.checkpointTimeLimitSec,
    baseReward: params.baseReward,
  };
}

/**
 * Picks a distinct random 31-bit seed guaranteed never to equal `lastSeed`.
 */
export function generateFreshMapSeed(lastSeed?: number): number {
  let seed = Math.floor(Math.random() * 2147480000) + 1;
  if (lastSeed !== undefined && seed === lastSeed) {
    seed = ((seed + 7919) % 2147480000) + 1;
  }
  return seed;
}

/**
 * Generates a brand-new procedural race configuration for any infinite level (1..1000+),
 * rotating themes (never repeating the same biome or map seed twice in a row), varying time of day
 * & weather, and scaling all difficulty curves from `difficulty.ts`.
 */
export function generateRaceLevelConfig(
  levelNumber: number,
  options?: {
    lastSeed?: number;
    lastBiome?: BiomeType;
    lastTimeOfDay?: TimeOfDay;
    lastWeather?: WeatherType;
    favorite?: FavoriteMapSeed;
    difficultySetting?: DifficultySetting;
  }
): LevelConfig {
  const safeLevel = Math.max(1, Math.floor(levelNumber));
  const stats = buildStatsFromDifficulty(safeLevel, options?.difficultySetting ?? 'normal');

  if (options?.favorite) {
    const fav = options.favorite;
    return {
      levelNumber: safeLevel,
      name: fav.name,
      biome: fav.biome,
      weather: fav.weather,
      timeOfDay: fav.timeOfDay,
      ...stats,
      seed: fav.seed,
      layoutArchetype: fav.layoutArchetype,
      isFavoriteReplay: true,
      description: `${BIOME_META[fav.biome].summary} ${stats.laps} laps · ${stats.rivalCount} AI rivals.`,
    };
  }

  const seed = generateFreshMapSeed(options?.lastSeed);
  const rng = createSeededRng(seed);

  let biome: BiomeType;
  if (options?.lastBiome) {
    const prevIdx = BIOME_CYCLE.indexOf(options.lastBiome);
    const offset = 1 + Math.floor(rng() * (BIOME_CYCLE.length - 1));
    biome = BIOME_CYCLE[(Math.max(0, prevIdx) + offset) % BIOME_CYCLE.length];
  } else {
    biome =
      BIOME_CYCLE[(Math.max(0, safeLevel - 1) + Math.floor(rng() * BIOME_CYCLE.length)) % BIOME_CYCLE.length];
  }

  const timeOptions: Record<BiomeType, TimeOfDay[]> = {
    city: ['day', 'sunset', 'night'],
    desert: ['sunset', 'day', 'night'],
    mountain: ['day', 'sunset', 'night'],
    coastal: ['day', 'sunset', 'night'],
    snow: ['day', 'sunset', 'night'],
    night_neon: ['night'],
  };
  const weatherOptions: Record<BiomeType, WeatherType[]> = {
    city: ['clear', 'rain', 'fog'],
    desert: ['clear', 'fog'],
    mountain: ['clear', 'fog', 'rain'],
    coastal: ['clear', 'rain', 'fog'],
    snow: ['snow', 'fog', 'clear'],
    night_neon: ['rain', 'clear', 'fog'],
  };

  const tChoices = timeOptions[biome];
  const wChoices = weatherOptions[biome];
  let timeOfDay = tChoices[Math.floor(rng() * tChoices.length)];
  let weather = wChoices[Math.floor(rng() * wChoices.length)];

  if (
    timeOfDay === options?.lastTimeOfDay &&
    weather === options?.lastWeather &&
    (tChoices.length > 1 || wChoices.length > 1)
  ) {
    if (wChoices.length > 1) {
      weather = wChoices[(wChoices.indexOf(weather) + 1) % wChoices.length];
    }
    if (tChoices.length > 1) {
      timeOfDay = tChoices[(tChoices.indexOf(timeOfDay) + 1) % tChoices.length];
    }
  }

  const layoutArchetype = ARCHETYPE_POOL[Math.floor(rng() * ARCHETYPE_POOL.length)];
  const prefixes = BIOME_PREFIXES[biome];
  const suffixes = ARCHETYPE_SUFFIXES[layoutArchetype];
  const name = `${prefixes[Math.floor(rng() * prefixes.length)]} ${
    suffixes[Math.floor(rng() * suffixes.length)]
  }`;

  return {
    levelNumber: safeLevel,
    name,
    biome,
    weather,
    timeOfDay,
    ...stats,
    seed,
    layoutArchetype,
    isFavoriteReplay: false,
    description: `${BIOME_META[biome].summary} ${stats.laps} laps · ${stats.rivalCount} AI rivals.`,
  };
}

/**
 * Deterministic preview config for Level Select & Home screen summary (supports infinite levels).
 */
export function getLevelConfig(
  levelNumber: number,
  raceRunSalt = 0,
  difficultySetting: DifficultySetting = 'normal'
): LevelConfig {
  const safeLevel = Math.max(1, Math.floor(levelNumber));
  const idx = safeLevel - 1;
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

  const stats = buildStatsFromDifficulty(safeLevel, difficultySetting);
  const layoutArchetype = ARCHETYPE_POOL[idx % ARCHETYPE_POOL.length];
  const prefixes = BIOME_PREFIXES[biome];
  const suffixes = ARCHETYPE_SUFFIXES[layoutArchetype];
  const name = `${prefixes[idx % prefixes.length]} ${suffixes[tier % suffixes.length]}`;

  return {
    levelNumber: safeLevel,
    name,
    biome,
    weather,
    timeOfDay,
    ...stats,
    seed: safeLevel * 9301 + raceRunSalt * 49297 + 1337,
    layoutArchetype,
    description: `${BIOME_META[biome].summary} ${stats.laps} laps · ${stats.rivalCount} AI rivals.`,
  };
}

export const PRESET_LEVEL_COUNT = 18;
