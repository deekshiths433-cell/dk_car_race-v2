import {
  CarSpec,
  DifficultySetting,
  DifficultyTierName,
  OwnedCarState,
} from '../types/game';
import { TIRE_STYLES } from './cars';

/**
 * Centralized Difficulty & AI Balancing Config (single source of truth).
 * All level scaling, rival count, pack-following, warm-up, rubber-banding,
 * skill progression, and upgrade pass-through constants live here.
 */
export const DIFFICULTY_CURVE_CONFIG = {
  // Levels 1..6 explicit pace factors relative to player's car
  levelBase: [0.98, 0.99, 1.0, 1.01, 1.02, 1.03] as readonly number[],
  // Level 7+ step per level & absolute ceiling
  stepAfterLevel6: 0.01,
  factorCap: 1.2,
  factorFloor: 0.9,

  // Settings preset offsets
  presetOffsets: {
    easy: -0.04,
    normal: 0,
    hard: 0.03,
  } as Record<DifficultySetting, number>,

  // Tier display thresholds ("Hard" starts right at Level 1 on Normal: 0.98)
  tierThresholds: {
    easyMax: 0.92,
    mediumMax: 0.97,
    hardMax: 1.05,
    extremeMax: 1.13,
  },

  // Only 50% of player upgrade gains transfer to rivals so Garage upgrades always reward the player
  upgradePassThrough: 0.5,

  // Per-rival randomized pace spread (+-2%)
  variationRange: 0.02,

  // Rival grid count: 3 at Level 1, +1 every 2 levels, capped at 7
  rivalCountBase: 3,
  rivalCountLevelsPerStep: 2,
  rivalCountMax: 7,

  // In-race warm-up: rivals start at ~95% pace on Lap 1 and ramp to 100% by final lap
  warmupMinStart: 0.95,
  warmupPerLevelGain: 0.004,
  warmupMaxStart: 0.995,

  // Early-level pack discipline (Levels 1 & 2): stay close behind a clean driver unless they make a mistake
  packMaxLevel: 2,
  packTargetGapMinM: 10,
  packTargetGapMaxM: 26,
  packCatchupAssistGapM: 34,
  packHoldbackFloor: 0.89,
  playerMistakeDurationSec: 2.5,

  // Light fair rubber-banding (never teleports or breaks realistic top speed bounds)
  rubberBandBehindStartM: 44,
  rubberBandBehindSlope: 0.0009,
  rubberBandMaxBoost: 1.07,
  rubberBandAheadSlowM: 90,
  rubberBandMinMult: 0.975,
} as const;

export const DIFFICULTY_LEVEL_BASE: number[] = [...DIFFICULTY_CURVE_CONFIG.levelBase];
export const DIFFICULTY_STEP_AFTER_5 = DIFFICULTY_CURVE_CONFIG.stepAfterLevel6;
export const DIFFICULTY_FACTOR_CAP = DIFFICULTY_CURVE_CONFIG.factorCap;

export const DIFFICULTY_PRESET_OFFSET: Record<DifficultySetting, number> =
  DIFFICULTY_CURVE_CONFIG.presetOffsets;

export const RIVAL_UPGRADE_PASS_THROUGH = DIFFICULTY_CURVE_CONFIG.upgradePassThrough;
export const AI_RIVAL_VARIATION_RANGE = DIFFICULTY_CURVE_CONFIG.variationRange;

export interface AiSkillProfile {
  skillNorm: number; // 0 (Lv1) .. 1 (high championship)
  cornerSpeedFactor: number; // multiplier on safe corner entry/apex speeds
  brakingLookAhead: number; // track samples ahead to scan upcoming turn curvature
  slipstreamSkill: number; // 0..1 tendency to draft behind cars ahead on straights
  blockingChance: number; // 0..1 defensive lane coverage when approached from behind
  overtakeAggression: number; // 0..1 decisiveness passing slower traffic
  mistakeRate: number; // probability scale for slight driving bobbles (high early, tiny later)
  throttleMastery: number; // base full-throttle consistency (0.93..1.0)
}

export function computeDifficultyFactor(
  levelNumber: number,
  setting: DifficultySetting = 'normal'
): number {
  const lvl = Math.max(1, Math.floor(levelNumber));
  const { levelBase, stepAfterLevel6, factorCap, factorFloor, presetOffsets } =
    DIFFICULTY_CURVE_CONFIG;

  let base: number;
  if (lvl <= levelBase.length) {
    base = levelBase[lvl - 1];
  } else {
    const baseAt6 = levelBase[levelBase.length - 1];
    base = baseAt6 + (lvl - levelBase.length) * stepAfterLevel6;
  }

  const offset = presetOffsets[setting] ?? 0;
  const maxCap = setting === 'easy' ? Math.min(1.14, factorCap) : factorCap;
  return Number(Math.max(factorFloor, Math.min(maxCap, base + offset)).toFixed(3));
}

export function getDifficultyTierName(factor: number): DifficultyTierName {
  const { easyMax, mediumMax, hardMax, extremeMax } = DIFFICULTY_CURVE_CONFIG.tierThresholds;
  if (factor < easyMax) return 'Easy';
  if (factor < mediumMax) return 'Medium';
  if (factor < hardMax) return 'Hard';
  if (factor < extremeMax) return 'Extreme';
  return 'Insane';
}

export function computeRivalWarmupFactor(
  levelNumber: number,
  totalProgress: number,
  totalLaps: number
): number {
  const lvl = Math.max(1, Math.floor(levelNumber));
  const { warmupMinStart, warmupPerLevelGain, warmupMaxStart } = DIFFICULTY_CURVE_CONFIG;
  const startMult = Math.min(warmupMaxStart, warmupMinStart + (lvl - 1) * warmupPerLevelGain);
  // Ramp smoothly from Lap 1 start up to 1.00 by the time the racer enters the final lap
  const rampSpan = Math.max(1, totalLaps - 1);
  const progressNorm = Math.max(0, Math.min(1, totalProgress / rampSpan));
  return Number((startMult + (1 - startMult) * progressNorm).toFixed(4));
}

export function computeAiSkillProfile(
  levelNumber: number,
  setting: DifficultySetting = 'normal'
): AiSkillProfile {
  const lvl = Math.max(1, Math.floor(levelNumber));
  const settingBonus = setting === 'hard' ? 0.14 : setting === 'easy' ? -0.1 : 0;
  const skillNorm = Math.max(0, Math.min(1, (lvl - 1) / 18 + settingBonus));

  return {
    skillNorm: Number(skillNorm.toFixed(3)),
    cornerSpeedFactor: Number((0.88 + skillNorm * 0.16).toFixed(3)),
    brakingLookAhead: Math.round(14 + skillNorm * 12),
    slipstreamSkill: Number((0.18 + skillNorm * 0.77).toFixed(3)),
    blockingChance: lvl < 3 && setting !== 'hard' ? 0 : Number((0.15 + skillNorm * 0.7).toFixed(3)),
    overtakeAggression: Number((0.35 + skillNorm * 0.6).toFixed(3)),
    mistakeRate: Number(Math.max(0.015, 0.2 - skillNorm * 0.185).toFixed(3)),
    throttleMastery: Number((0.93 + skillNorm * 0.07).toFixed(3)),
  };
}

export function getLevelRaceParameters(
  levelNumber: number,
  setting: DifficultySetting = 'normal'
) {
  const lvl = Math.max(1, Math.floor(levelNumber));
  const idx = lvl - 1;
  const factor = computeDifficultyFactor(lvl, setting);
  const difficultyName = getDifficultyTierName(factor);

  const { rivalCountBase, rivalCountLevelsPerStep, rivalCountMax } = DIFFICULTY_CURVE_CONFIG;
  const rivalCount = Math.min(
    rivalCountMax,
    rivalCountBase + Math.floor(idx / rivalCountLevelsPerStep)
  );
  const laps = lvl <= 2 ? 2 : lvl <= 6 ? 2 : lvl <= 12 ? 3 : lvl <= 22 ? 4 : 5;
  const trackLengthMeters = 1520 + Math.min(1800, idx * 125);
  const trackCurviness = Math.min(1.0, 0.34 + idx * 0.048);

  // Roads narrow smoothly at higher championships while staying wide enough for fair passes
  const roadWidth = Number(Math.max(12.8, 16.0 - Math.min(3.2, idx * 0.22)).toFixed(2));

  // Levels 1 & 2 stay clean to onboard new players; traffic/cones appear from Level 3+
  const obstacleCount = lvl < 3 ? 0 : Math.min(24, 3 + (lvl - 2) * 2);

  // Stronger collision damage penalty on higher championships
  const collisionDamageMult = Number(Math.min(1.85, 0.9 + idx * 0.065).toFixed(2));

  // Optional checkpoint countdown timer activates on milestone / higher levels (Level 6+ or Hard Lv4+)
  const hasCheckpointTimer =
    (setting === 'hard' && lvl >= 4) || lvl >= 6;
  const checkpointTimeLimitSec = hasCheckpointTimer
    ? Math.max(18, Math.round(trackLengthMeters / 54))
    : null;

  // Progressive rewards scaled with level and difficulty (~3 to 6 races per next car tier)
  const settingRewardMult = setting === 'hard' ? 1.25 : setting === 'easy' ? 0.9 : 1.0;
  const rawBaseReward = 450 * Math.pow(1.22, Math.min(18, idx)) + idx * 140;
  const baseReward = Math.round((rawBaseReward * settingRewardMult) / 25) * 25;

  return {
    factor,
    difficultyName,
    rivalCount,
    laps,
    trackLengthMeters,
    trackCurviness,
    roadWidth,
    obstacleCount,
    collisionDamageMult,
    checkpointTimeLimitSec,
    baseReward,
  };
}

/**
 * Estimates typical points earned per race (1st-2nd finish + standard driving bonuses)
 * for a given level and difficulty preset.
 */
export function estimatePointsPerRace(
  levelNumber: number,
  setting: DifficultySetting = 'normal'
): number {
  const params = getLevelRaceParameters(levelNumber, setting);
  const avgDrivingBonuses = 180 + Math.min(260, Math.max(0, levelNumber - 1) * 18);
  return Math.round(params.baseReward * 1.18 + avgDrivingBonuses);
}

export interface MatchedPerformanceSummary {
  difficultyFactor: number;
  difficultyName: DifficultyTierName;
  playerBaseTopSpeedKmh: number;
  playerEffectiveTopSpeedKmh: number;
  playerDamagePenaltyPct: number;
  rivalTargetTopSpeedKmh: number;
  rivalBaseAccelMs2: number;
  rivalAccelScale: number;
  rivalGripScale: number;
  recommendedTopSpeedKmh: number;
  isUnderpowered: boolean;
  underpoweredReason: string | null;
}

/**
 * Matches rivals' speed, acceleration, and grip directly to the player's current car
 * scaled by `difficultyFactor(level)` — with only 50% of player upgrade bonuses passed
 * through to rivals so upgrading in the Garage gives a real edge.
 */
export function computeMatchedRivalStats(
  playerSpec: CarSpec,
  ownedState: OwnedCarState | undefined,
  levelNumber: number,
  setting: DifficultySetting = 'normal'
): MatchedPerformanceSummary {
  const factor = computeDifficultyFactor(levelNumber, setting);
  const difficultyName = getDifficultyTierName(factor);

  const engLvl = ownedState?.upgrades.engineLevel ?? 0;
  const turboLvl = ownedState?.upgrades.turboLevel ?? 0;
  const tiresLvl = ownedState?.upgrades.tiresLevel ?? 0;
  const dmgEngine = ownedState?.damage.engine ?? 0;
  const dmgTires = ownedState?.damage.tires ?? 0;
  const dmgBody = ownedState?.damage.body ?? 0;
  const avgDmgPct = Math.round((dmgEngine + dmgTires + dmgBody) / 3);

  const playerUpgradeSpeedMult = 1 + engLvl * 0.018 + turboLvl * 0.012;
  const rivalUpgradeSpeedMult =
    1 + (engLvl * 0.018 + turboLvl * 0.012) * RIVAL_UPGRADE_PASS_THROUGH;

  const playerUpgradeAccelMult = 1 + engLvl * 0.035 + turboLvl * 0.04;
  const rivalUpgradeAccelMult =
    1 + (engLvl * 0.035 + turboLvl * 0.04) * RIVAL_UPGRADE_PASS_THROUGH;

  const playerTireBonus =
    TIRE_STYLES.find((t) => t.id === ownedState?.customization.tireStyle)?.gripBonus ?? 0;
  const playerGripUpgrade = tiresLvl * 0.03 + playerTireBonus;
  const rivalGripUpgrade = playerGripUpgrade * RIVAL_UPGRADE_PASS_THROUGH;

  const engineDamagePenalty = 1 - (dmgEngine / 100) * 0.28;
  const playerEffectiveTopSpeedKmh = Math.round(
    playerSpec.stats.topSpeedKmh * playerUpgradeSpeedMult * engineDamagePenalty
  );

  // Rivals match the player's car (with 50% of upgrades) * difficulty factor across speed, accel, grip
  const rivalTargetTopSpeedKmh = Math.max(
    140,
    Math.round(playerSpec.stats.topSpeedKmh * rivalUpgradeSpeedMult * factor)
  );

  const playerZeroTo100Ms2 = (100 / 3.6) / Math.max(1.8, playerSpec.stats.zeroToHundredSec);
  const rivalBaseAccelMs2 = Number(playerZeroTo100Ms2.toFixed(4));
  const rivalAccelScale = Number((rivalUpgradeAccelMult * factor).toFixed(3));

  const playerBaseHandlingGrip = 0.88 + (playerSpec.stats.handling / 100) * 0.42;
  const rivalGripScale = Number(((playerBaseHandlingGrip + rivalGripUpgrade) * factor).toFixed(3));

  // Recommended top speed benchmark for advisory warnings on Race Intro
  const recommendedTopSpeedKmh = Math.min(
    450,
    250 + Math.max(0, levelNumber - 3) * 18
  );

  let isUnderpowered = false;
  let underpoweredReason: string | null = null;
  if (avgDmgPct >= 25) {
    isUnderpowered = true;
    underpoweredReason = `Your car has ${avgDmgPct}% damage reducing speed and grip. Repair or swap rides before starting.`;
  } else if (
    levelNumber >= 5 &&
    playerEffectiveTopSpeedKmh < rivalTargetTopSpeedKmh &&
    engLvl + turboLvl < 2
  ) {
    isUnderpowered = true;
    underpoweredReason = `Rivals reach ${rivalTargetTopSpeedKmh} km/h (${difficultyName}) while your ${playerEffectiveTopSpeedKmh} km/h tune has minimal upgrades. Upgrade in Garage or unlock a faster supercar!`;
  } else if (levelNumber >= 6 && playerEffectiveTopSpeedKmh < recommendedTopSpeedKmh - 28) {
    isUnderpowered = true;
    underpoweredReason = `${difficultyName} Level ${levelNumber} favors ${recommendedTopSpeedKmh}+ km/h pace — upgrading in Garage or picking a faster Car Shop ride will boost your edge.`;
  }

  return {
    difficultyFactor: factor,
    difficultyName,
    playerBaseTopSpeedKmh: playerSpec.stats.topSpeedKmh,
    playerEffectiveTopSpeedKmh,
    playerDamagePenaltyPct: Math.round((1 - engineDamagePenalty) * 100),
    rivalTargetTopSpeedKmh,
    rivalBaseAccelMs2,
    rivalAccelScale,
    rivalGripScale,
    recommendedTopSpeedKmh,
    isUnderpowered,
    underpoweredReason,
  };
}

