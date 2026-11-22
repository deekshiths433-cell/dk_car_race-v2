import * as THREE from 'three';
import { getCarDisplayName } from '../data/brandConfig';
import { CAR_ORDER, CAR_SPECS } from '../data/cars';
import { TrackSample } from '../engine/TrackGenerator';
import {
  CarId,
  GhostConfig,
  GhostSample,
  LevelConfig,
  SaveState,
} from '../types/game';

/**
 * Resolves the player's personal best record for the current level from the leaderboard
 * (and bestTimesByLevel fallback), along with any recorded telemetry keyframes.
 */
export function getPersonalBestGhostConfig(
  save: SaveState,
  level: LevelConfig
): GhostConfig | null {
  const playerEntries = save.leaderboard.filter(
    (entry) =>
      entry.levelNumber === level.levelNumber &&
      entry.driverName.toLowerCase() === 'you' &&
      Number.isFinite(entry.bestTimeSec) &&
      entry.bestTimeSec > 0
  );

  let bestEntry = playerEntries[0] ?? null;
  for (const e of playerEntries) {
    if (!bestEntry || e.bestTimeSec < bestEntry.bestTimeSec) {
      bestEntry = e;
    }
  }

  const savedBestTime = save.bestTimesByLevel[level.levelNumber];
  const storedGhost = save.ghostsByLevel?.[level.levelNumber];

  let bestTimeSec: number | null = null;
  if (bestEntry && Number.isFinite(savedBestTime) && savedBestTime > 0) {
    bestTimeSec = Math.min(bestEntry.bestTimeSec, savedBestTime);
  } else if (bestEntry) {
    bestTimeSec = bestEntry.bestTimeSec;
  } else if (Number.isFinite(savedBestTime) && savedBestTime > 0) {
    bestTimeSec = savedBestTime;
  } else if (storedGhost && Number.isFinite(storedGhost.bestTimeSec) && storedGhost.bestTimeSec > 0) {
    bestTimeSec = storedGhost.bestTimeSec;
  }

  if (bestTimeSec === null) return null;

  // Resolve CarId from best entry, stored ghost, carName lookup, or current selected car
  let carId: CarId = save.selectedCarId;
  if (bestEntry?.carId && CAR_SPECS[bestEntry.carId]) {
    carId = bestEntry.carId;
  } else if (bestEntry?.carName) {
    const matched = CAR_ORDER.find(
      (id) =>
        `${CAR_SPECS[id].brand} ${CAR_SPECS[id].name}` === bestEntry.carName ||
        getCarDisplayName(CAR_SPECS[id]) === bestEntry.carName
    );
    if (matched) carId = matched;
  } else if (storedGhost?.carId && CAR_SPECS[storedGhost.carId]) {
    carId = storedGhost.carId;
  }

  const spec = CAR_SPECS[carId];
  const samples =
    storedGhost &&
    storedGhost.samples.length >= 2 &&
    Math.abs(storedGhost.bestTimeSec - bestTimeSec) <= 0.25
      ? storedGhost.samples
      : undefined;

  return {
    bestTimeSec,
    carId,
    carName: bestEntry?.carName ?? getCarDisplayName(spec),
    samples,
  };
}

/**
 * Downsamples recorded ghost frames uniformly while preserving first & last samples.
 */
export function downsampleGhostSamples(
  samples: GhostSample[],
  maxCount = 220
): GhostSample[] {
  if (samples.length <= maxCount) return samples;
  const out: GhostSample[] = [samples[0]];
  const step = (samples.length - 1) / (maxCount - 1);
  for (let i = 1; i < maxCount - 1; i++) {
    out.push(samples[Math.round(i * step)]);
  }
  out.push(samples[samples.length - 1]);
  return out;
}

/**
 * Generates a curvature-aware synthetic ghost timeline along the track
 * that completes `totalLaps` at exact `targetTimeSec`. Used when a leaderboard PB
 * exists without recorded telemetry keyframes.
 */
export function buildProceduralGhostSamples(
  trackSamples: TrackSample[],
  totalLengthMeters: number,
  totalLaps: number,
  targetTimeSec: number
): GhostSample[] {
  const safeTarget = Math.max(5, targetTimeSec);
  const stepsPerLap = 60;
  const totalSteps = Math.max(24, totalLaps * stepsPerLap);
  const sampleCount = trackSamples.length;

  const rawTimes: number[] = [0];
  const progresses: number[] = [0];
  const speeds: number[] = [];

  for (let i = 0; i < totalSteps; i++) {
    const p0 = (i / totalSteps) * totalLaps;
    const p1 = ((i + 1) / totalSteps) * totalLaps;
    const t0 = p0 % 1;
    const idx0 = Math.floor(t0 * sampleCount) % sampleCount;
    const idxNext = (idx0 + 8) % sampleCount;
    const dot = trackSamples[idx0].tangent.dot(trackSamples[idxNext].tangent);
    const curvature = Math.max(0, 1 - dot);

    // Launch ramp + corner slowdown factor
    const launchFactor = i < 3 ? 0.52 + i * 0.16 : 1.0;
    const relSpeed = Math.max(0.55, (1 - curvature * 0.55) * launchFactor);
    speeds.push(relSpeed);
    const segDist = ((p1 - p0) * totalLengthMeters);
    rawTimes.push(rawTimes[rawTimes.length - 1] + segDist / relSpeed);
    progresses.push(p1);
  }

  const rawTotal = rawTimes[rawTimes.length - 1] || 1;
  const timeScale = safeTarget / rawTotal;
  const avgSpeedMs = (totalLaps * totalLengthMeters) / safeTarget;

  const result: GhostSample[] = [];
  for (let i = 0; i <= totalSteps; i++) {
    const tSec = rawTimes[i] * timeScale;
    const relSpd = speeds[Math.min(i, speeds.length - 1)] ?? 1;
    result.push({
      tSec,
      progress: progresses[i],
      lat: Math.sin((i / stepsPerLap) * Math.PI * 2) * 1.1,
      yawOffset: 0,
      pitch: 0,
      roll: 0,
      speedMs: avgSpeedMs * relSpd,
      nitro: relSpd > 0.96 && i > 4 && i % 19 < 4,
    });
  }

  return result;
}

export interface EvaluatedGhostPose {
  progress: number;
  yaw: number;
  pitch: number;
  roll: number;
  speedMs: number;
  nitroActive: boolean;
  finished: boolean;
  opacityScale: number;
}

function wrapAngleDiff(diff: number): number {
  let d = diff;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

function sampleTrackAtProgress(
  trackSamples: TrackSample[],
  progress: number,
  outPoint: THREE.Vector3,
  outTangent: THREE.Vector3,
  outRight: THREE.Vector3
): void {
  const count = trackSamples.length;
  if (count === 0) return;
  const wrapped = ((progress % 1) + 1) % 1;
  const fIdx = wrapped * count;
  const i0 = Math.floor(fIdx) % count;
  const i1 = (i0 + 1) % count;
  const alpha = fIdx - Math.floor(fIdx);

  const s0 = trackSamples[i0];
  const s1 = trackSamples[i1];

  outPoint.copy(s0.point).lerp(s1.point, alpha);
  outTangent.copy(s0.tangent).lerp(s1.tangent, alpha).normalize();
  outRight.copy(s0.right).lerp(s1.right, alpha).normalize();
}

const _tmpPt = new THREE.Vector3();
const _tmpTan = new THREE.Vector3();
const _tmpRight = new THREE.Vector3();

/**
 * Evaluates the ghost car's interpolated world transform and state at `raceTimeSec`.
 * Writes position into `outPos` with zero heap allocations.
 */
export function evaluateGhostPose(
  samples: GhostSample[],
  trackSamples: TrackSample[],
  raceTimeSec: number,
  totalLaps: number,
  outPos: THREE.Vector3
): EvaluatedGhostPose {
  if (samples.length === 0 || trackSamples.length === 0) {
    outPos.set(0, 0, 0);
    return {
      progress: 0,
      yaw: 0,
      pitch: 0,
      roll: 0,
      speedMs: 0,
      nitroActive: false,
      finished: false,
      opacityScale: 1,
    };
  }

  const last = samples[samples.length - 1];
  const finished = raceTimeSec >= last.tSec;

  let progress = last.progress;
  let lat = last.lat;
  let yawOffset = last.yawOffset;
  let pitch = last.pitch;
  let roll = last.roll;
  let speedMs = 0;
  let nitroActive = false;

  if (raceTimeSec <= samples[0].tSec) {
    const s0 = samples[0];
    progress = s0.progress;
    lat = s0.lat;
    yawOffset = s0.yawOffset;
    pitch = s0.pitch;
    roll = s0.roll;
    speedMs = s0.speedMs;
    nitroActive = s0.nitro;
  } else if (finished) {
    progress = totalLaps;
    lat = last.lat;
    yawOffset = last.yawOffset;
    pitch = 0;
    roll = 0;
    speedMs = 0;
    nitroActive = false;
  } else {
    // Binary search for bracketing keyframes
    let lo = 0;
    let hi = samples.length - 1;
    while (lo + 1 < hi) {
      const mid = (lo + hi) >> 1;
      if (samples[mid].tSec <= raceTimeSec) lo = mid;
      else hi = mid;
    }
    const a = samples[lo];
    const b = samples[hi];
    const span = Math.max(0.0001, b.tSec - a.tSec);
    const alpha = THREE.MathUtils.clamp((raceTimeSec - a.tSec) / span, 0, 1);

    progress = THREE.MathUtils.lerp(a.progress, b.progress, alpha);
    lat = THREE.MathUtils.lerp(a.lat, b.lat, alpha);
    yawOffset = a.yawOffset + wrapAngleDiff(b.yawOffset - a.yawOffset) * alpha;
    pitch = THREE.MathUtils.lerp(a.pitch, b.pitch, alpha);
    roll = THREE.MathUtils.lerp(a.roll, b.roll, alpha);
    speedMs = THREE.MathUtils.lerp(a.speedMs, b.speedMs, alpha);
    nitroActive = alpha < 0.5 ? a.nitro : b.nitro;
  }

  sampleTrackAtProgress(trackSamples, progress, _tmpPt, _tmpTan, _tmpRight);
  outPos.copy(_tmpPt).addScaledVector(_tmpRight, lat);
  const trackYaw = Math.atan2(_tmpTan.x, _tmpTan.z);

  // Fade ghost gently after crossing finish line
  const postFinishElapsed = finished ? raceTimeSec - last.tSec : 0;
  const opacityScale = finished
    ? Math.max(0.28, 1 - postFinishElapsed * 0.45)
    : 1;

  return {
    progress,
    yaw: trackYaw + yawOffset,
    pitch,
    roll,
    speedMs,
    nitroActive,
    finished,
    opacityScale,
  };
}

/**
 * Returns the ghost's elapsed time when it was at `playerProgress`, so
 * `deltaSec = raceTimeSec - ghostTimeAtPlayerProgress` (< 0 means player is ahead of PB!).
 */
export function estimateGhostTimeAtProgress(
  samples: GhostSample[],
  targetProgress: number
): number | null {
  if (samples.length < 2) return null;
  if (targetProgress <= samples[0].progress) return samples[0].tSec;
  const last = samples[samples.length - 1];
  if (targetProgress >= last.progress) return last.tSec;

  for (let i = 0; i < samples.length - 1; i++) {
    const a = samples[i];
    const b = samples[i + 1];
    if (targetProgress >= a.progress && targetProgress <= b.progress) {
      const span = Math.max(1e-5, b.progress - a.progress);
      const alpha = THREE.MathUtils.clamp((targetProgress - a.progress) / span, 0, 1);
      return THREE.MathUtils.lerp(a.tSec, b.tSec, alpha);
    }
  }
  return last.tSec;
}
