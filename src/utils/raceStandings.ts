import { RaceStanding } from '../types/game';

export interface StandingCandidate {
  id: string;
  driverName: string;
  carName: string;
  isPlayer: boolean;
  finished: boolean;
  finishTimeSec: number;
  lapsCompleted: number;
  totalProgress: number;
  trackDistanceMeters: number;
  speedMs: number;
  aiSpeedFactor: number;
  topSpeedKmh: number;
}

/**
 * Returns true if `other` is strictly ahead of `target`:
 * - `other` has finished while `target` has not, OR
 * - both finished and `other` crossed the finish line earlier (`finishTimeSec` smaller), OR
 * - neither finished and `other` has more laps completed, or equal laps and greater distance along the track.
 */
export function isRacerAhead(other: StandingCandidate, target: StandingCandidate): boolean {
  if (other.id === target.id) return false;
  if (other.finished !== target.finished) {
    return other.finished;
  }
  if (other.finished && target.finished) {
    if (Math.abs(other.finishTimeSec - target.finishTimeSec) > 1e-6) {
      return other.finishTimeSec < target.finishTimeSec;
    }
    return other.id.localeCompare(target.id) < 0;
  }
  if (other.lapsCompleted !== target.lapsCompleted) {
    return other.lapsCompleted > target.lapsCompleted;
  }
  if (Math.abs(other.trackDistanceMeters - target.trackDistanceMeters) > 1e-4) {
    return other.trackDistanceMeters > target.trackDistanceMeters;
  }
  if (Math.abs(other.totalProgress - target.totalProgress) > 1e-6) {
    return other.totalProgress > target.totalProgress;
  }
  return other.id.localeCompare(target.id) < 0;
}

/**
 * Deterministic race standings comparator built from `isRacerAhead` so
 * live HUD positions, results position, and full standings list are always 100% consistent.
 */
export function compareStandings(a: StandingCandidate, b: StandingCandidate): number {
  if (a.id === b.id) return 0;
  return isRacerAhead(a, b) ? -1 : 1;
}

/**
 * Unified position calculation used identically by BOTH live HUD and final results screen:
 * playerPosition = 1 + number of rivals who finished earlier or are ahead (more laps / distance).
 */
export function calculatePlayerPosition(vehicles: StandingCandidate[]): number {
  const player = vehicles.find((v) => v.isPlayer);
  if (!player) return 1;
  let aheadCount = 0;
  for (let i = 0; i < vehicles.length; i++) {
    const rival = vehicles[i];
    if (!rival.isPlayer && isRacerAhead(rival, player)) {
      aheadCount++;
    }
  }
  return 1 + aheadCount;
}

/**
 * Computes position points strictly decreasing from 1st (highest) down to last place (minimum).
 */
export function computePositionPoints(
  baseReward: number,
  position: number,
  totalCars: number
): number {
  if (totalCars <= 1 || position <= 1) {
    return Math.round(baseReward * 1.5);
  }

  const clampedPos = Math.min(totalCars, Math.max(1, position));
  const minLastPoints = Math.max(40, Math.round(baseReward * 0.22));

  if (clampedPos >= totalCars) {
    return minLastPoints;
  }

  if (clampedPos === 2) {
    return Math.round(baseReward * 1.0);
  }
  if (clampedPos === 3) {
    return Math.round(baseReward * 0.72);
  }

  // Positions 4 .. totalCars - 1 scale smoothly down toward minLastPoints
  const midSpan = Math.max(1, totalCars - 4);
  const t = (clampedPos - 4) / midSpan;
  const mult = 0.54 - t * 0.24;
  return Math.max(minLastPoints + 25, Math.round(baseReward * mult));
}

/**
 * Builds the sorted RaceStanding list for all racers.
 * Can be called both at player finish AND whenever remaining AI rivals cross the finish line afterward.
 */
export function buildRaceStandings(
  candidates: StandingCandidate[],
  totalLaps: number,
  trackLengthMeters: number,
  rivalSkill: number,
  referenceTimeSec: number
): RaceStanding[] {
  const sorted = [...candidates].sort(compareStandings);
  let lastEstimatedSec = referenceTimeSec;

  return sorted.map((c, idx) => {
    let estimatedTimeSec: number;
    if (c.finished) {
      estimatedTimeSec = c.finishTimeSec;
      lastEstimatedSec = Math.max(lastEstimatedSec, estimatedTimeSec);
    } else {
      const remainingProgress = Math.max(0.002, totalLaps - c.totalProgress);
      const remainingMeters = remainingProgress * trackLengthMeters;
      const estimatedPaceMs = Math.max(
        20,
        c.speedMs,
        (c.topSpeedKmh / 3.6) * 0.65 * rivalSkill * c.aiSpeedFactor
      );
      const rawEst = referenceTimeSec + remainingMeters / estimatedPaceMs;
      estimatedTimeSec = Math.max(lastEstimatedSec + 0.08, rawEst);
      lastEstimatedSec = estimatedTimeSec;
    }

    return {
      id: c.id,
      name: c.driverName,
      carName: c.carName,
      isPlayer: c.isPlayer,
      position: idx + 1,
      finished: c.finished,
      finishTimeSec: c.finished ? c.finishTimeSec : null,
      estimatedTimeSec,
      lapsCompleted: c.finished ? totalLaps : c.lapsCompleted,
      totalLaps,
      trackDistanceMeters: Math.max(0, c.trackDistanceMeters),
    };
  });
}

export function getResultsHeadline(position: number): 'VICTORY' | 'PODIUM' | 'RACE FINISHED' {
  if (position === 1) return 'VICTORY';
  if (position === 2 || position === 3) return 'PODIUM';
  return 'RACE FINISHED';
}
