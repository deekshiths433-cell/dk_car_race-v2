import {
  CarSpec,
  DifficultySetting,
  DifficultyTierName,
  OwnedCarState,
} from '../types/game';
import { TIRE_STYLES } from './cars';

/**
 * Base AI difficulty curve by level:
 * Lv1=0.80, Lv2=0.85, Lv3=0.92, Lv4=0.97, Lv5=1.00,
 * Lv6+ increases by +0.025 per level and caps at 1.15 (Normal preset).
 */
export const DIFFICULTY_LEVEL_BASE: number[] = [0.8, 0.85, 0.92, 0.97, 1.0];
export const DIFFICULTY_STEP_AFTER_5 = 0.025;
export const DIFFICULTY_FACTOR_CAP = 1.15;

export const DIFFICULTY_PRESET_OFFSET: Record<DifficultySetting, number> = {
  easy: -0.06,
  normal: 0,
  hard: 0.05,
};

/**
 * Only 50% of player upgrade gains are passed to matched AI rivals,
 * guaranteeing that Garage upgrades always produce a tangible competitive advantage.
 */
export const RIVAL_UPGRADE_PASS_THROUGH = 0.5;

export const AI_RIVAL_VARIATION_RANGE = 0.03; // +-3% per rival

export function computeDifficultyFactor(
  levelNumber: number,
  setting: DifficultySetting = 'normal'
): number {
  const lvl = Math.max(1, Math.floor(levelNumber));
  let base: number;
  if (lvl <= DIFFICULTY_LEVEL_BASE.length) {
    base = DIFFICULTY_LEVEL_BASE[lvl - 1];
  } else {
    base = 1.0 + (lvl - DIFFICULTY_LEVEL_BASE.length) * DIFFICULTY_STEP_AFTER_5;
  }
  const offset = DIFFICULTY_PRESET_OFFSET[setting] ?? 0;
  const maxCap = setting === 'hard' ? 1.18 : setting === 'easy' ? 1.08 : DIFFICULTY_FACTOR_CAP;
  return Number(Math.max(0.72, Math.min(maxCap, base + offset)).toFixed(3));
}

export function getDifficultyTierName(factor: number): DifficultyTierName {
  if (factor < 0.86) return 'Easy';
  if (factor < 0.95) return 'Medium';
  if (factor < 1.02) return 'Hard';
  if (factor < 1.1) return 'Extreme';
  return 'Insane';
}

export function getLevelRaceParameters(
  levelNumber: number,
  setting: DifficultySetting = 'normal'
) {
  const lvl = Math.max(1, Math.floor(levelNumber));
  const idx = lvl - 1;
  const factor = computeDifficultyFactor(lvl, setting);
  const difficultyName = getDifficultyTierName(factor);

  const rivalCount = Math.min(7, 2 + Math.floor(idx * 0.65));
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
  const rivalUpgradeSpeedMult = 1 + (engLvl * 0.018 + turboLvl * 0.012) * RIVAL_UPGRADE_PASS_THROUGH;

  const playerUpgradeAccelMult = 1 + engLvl * 0.035 + turboLvl * 0.04;
  const rivalUpgradeAccelMult = 1 + (engLvl * 0.035 + turboLvl * 0.04) * RIVAL_UPGRADE_PASS_THROUGH;

  const playerTireBonus =
    TIRE_STYLES.find((t) => t.id === ownedState?.customization.tireStyle)?.gripBonus ?? 0;
  const playerGripUpgrade = tiresLvl * 0.03 + playerTireBonus;
  const rivalGripUpgrade = playerGripUpgrade * RIVAL_UPGRADE_PASS_THROUGH;

  const engineDamagePenalty = 1 - (dmgEngine / 100) * 0.28;
  const playerEffectiveTopSpeedKmh = Math.round(
    playerSpec.stats.topSpeedKmh * playerUpgradeSpeedMult * engineDamagePenalty
  );

  // Rivals match the player's chassis speed * difficulty factor * 50% of player's upgrades
  const rivalTargetTopSpeedKmh = Math.max(
    140,
    Math.round(playerSpec.stats.topSpeedKmh * rivalUpgradeSpeedMult * factor)
  );

  const rivalAccelScale = Number(
    (rivalUpgradeAccelMult * (0.94 + factor * 0.06)).toFixed(3)
  );
  const rivalGripScale = Number(
    (
      (0.88 + (playerSpec.stats.handling / 100) * 0.42 + rivalGripUpgrade) *
      (0.92 + factor * 0.08)
    ).toFixed(3)
  );

  // Recommended top speed benchmark for advisory warnings on Race Intro
  const recommendedTopSpeedKmh = Math.min(
    450,
    250 + Math.max(0, levelNumber - 2) * 18
  );

  let isUnderpowered = false;
  let underpoweredReason: string | null = null;
  if (avgDmgPct >= 25) {
    isUnderpowered = true;
    underpoweredReason = `Your car has ${avgDmgPct}% damage reducing speed and grip. Repair or swap rides before starting.`;
  } else if (
    levelNumber >= 4 &&
    playerEffectiveTopSpeedKmh < rivalTargetTopSpeedKmh &&
    engLvl + turboLvl < 2
  ) {
    isUnderpowered = true;
    underpoweredReason = `Rivals reach ${rivalTargetTopSpeedKmh} km/h (${difficultyName}) while your ${playerEffectiveTopSpeedKmh} km/h tune has minimal upgrades. Upgrade in Garage or unlock a faster supercar!`;
  } else if (levelNumber >= 4 && playerEffectiveTopSpeedKmh < recommendedTopSpeedKmh - 28) {
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
    rivalAccelScale,
    rivalGripScale,
    recommendedTopSpeedKmh,
    isUnderpowered,
    underpoweredReason,
  };
}
