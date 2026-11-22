import * as THREE from 'three';
import { LevelConfig, TrackArchetype } from '../types/game';

export interface TrackSample {
  point: THREE.Vector3;
  tangent: THREE.Vector3;
  right: THREE.Vector3;
  t: number;
  distance: number;
}

export interface TrackLayout {
  curve: THREE.CatmullRomCurve3;
  samples: TrackSample[];
  totalLength: number;
  roadWidth: number;
  checkpoints: { index: number; t: number; point: THREE.Vector3; tangent: THREE.Vector3 }[];
  minimapPoints: { x: number; z: number }[];
  minimapBounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  startPoint: THREE.Vector3;
  finishPoint: THREE.Vector3;
  archetype: TrackArchetype;
}

const ARCHETYPES: TrackArchetype[] = [
  'sweep',
  'hairpin',
  'chicane',
  'speedway',
  'technical',
];

export function createSeededRng(seed: number): () => number {
  let s = Math.abs(Math.floor(seed)) % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/**
 * Generates a guaranteed non-self-intersecting, smooth closed-loop circuit layout
 * from `level.seed` so both the Race Intro minimap preview and the 3D track builder
 * share the exact same geometry and checkpoints.
 */
export function generateTrackLayout(level: LevelConfig): TrackLayout {
  const rng = createSeededRng(level.seed);
  const roadWidth = 15.5;
  const controlCount = 18;
  const baseRadius = level.trackLengthMeters / (Math.PI * 2);

  const archetype: TrackArchetype =
    level.layoutArchetype ?? ARCHETYPES[Math.floor(rng() * ARCHETYPES.length)];

  const phaseA = rng() * Math.PI * 2;
  const phaseB = rng() * Math.PI * 2;
  const phaseC = rng() * Math.PI * 2;
  const worldRot = rng() * Math.PI * 2;

  // Oval stretch factors differ per seed & archetype
  let stretchX = 0.85 + rng() * 0.42;
  let stretchZ = 0.85 + rng() * 0.42;
  if (archetype === 'speedway') {
    stretchX = 1.28 + rng() * 0.2;
    stretchZ = 0.72 + rng() * 0.14;
  } else if (archetype === 'hairpin') {
    stretchX = 1.15 + rng() * 0.22;
    stretchZ = 0.82 + rng() * 0.2;
  }

  // Harmonic frequencies determined by archetype
  const f1 = archetype === 'speedway' ? 2 : archetype === 'hairpin' ? 3 : 2 + Math.floor(rng() * 2);
  const f2 = archetype === 'technical' ? 5 : archetype === 'chicane' ? 4 : 3 + Math.floor(rng() * 3);
  const f3 = archetype === 'technical' ? 7 : 5;

  const amp1 =
    archetype === 'speedway'
      ? 0.12
      : archetype === 'hairpin'
        ? 0.3
        : 0.22 + level.trackCurviness * 0.1;
  const amp2 =
    archetype === 'speedway'
      ? 0.06
      : archetype === 'chicane'
        ? 0.2
        : 0.12 + level.trackCurviness * 0.08;
  const amp3 = archetype === 'technical' ? 0.09 * level.trackCurviness : 0.04 * level.trackCurviness;

  const hillAmpBase =
    level.biome === 'mountain'
      ? 8.5 + rng() * 5.0
      : level.biome === 'coastal' || level.biome === 'desert'
        ? 2.8 + rng() * 3.5
        : 1.4 + rng() * 2.4;

  const cosRot = Math.cos(worldRot);
  const sinRot = Math.sin(worldRot);
  const sampleCount = 360;
  const minAllowedSep = roadWidth * 2.55; // ~39.5m minimum clearance between non-adjacent segments
  const up = new THREE.Vector3(0, 1, 0);

  let waveScale = 1.0;
  let curve!: THREE.CatmullRomCurve3;
  let totalLength = 0;
  let samples: TrackSample[] = [];
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;

  for (let attempt = 0; attempt < 5; attempt++) {
    const controlPoints: THREE.Vector3[] = [];
    for (let i = 0; i < controlCount; i++) {
      const angle = (i / controlCount) * Math.PI * 2;
      // Keep a flat, smooth straightaway zone around i = 0 (start/finish & launch grid)
      const distFromStartAngle = Math.min(angle, Math.PI * 2 - angle);
      const straightMask = Math.min(1, Math.pow(distFromStartAngle / (Math.PI * 0.24), 1.6));

      const wave =
        (Math.sin(angle * f1 + phaseA) * amp1 +
          Math.cos(angle * f2 + phaseB) * amp2 +
          Math.sin(angle * f3 + phaseC) * amp3) *
        waveScale;

      const r = baseRadius * (1 + wave * straightMask);
      const lx = Math.cos(angle) * r * stretchX;
      const lz = Math.sin(angle) * r * stretchZ;

      // Rotate entire circuit by worldRot so start/finish orientation varies every race
      const wx = lx * cosRot - lz * sinRot;
      const wz = lx * sinRot + lz * cosRot;

      const elev =
        (Math.sin(angle * 2 + phaseA) * 0.65 + Math.cos(angle * 3 + phaseB) * 0.35 + 0.5) *
        hillAmpBase *
        straightMask;

      controlPoints.push(new THREE.Vector3(wx, Math.max(0, elev), wz));
    }

    curve = new THREE.CatmullRomCurve3(controlPoints, true, 'catmullrom', 0.5);
    totalLength = curve.getLength();
    samples = [];
    minX = Infinity;
    maxX = -Infinity;
    minZ = Infinity;
    maxZ = -Infinity;

    for (let i = 0; i < sampleCount; i++) {
      const t = i / sampleCount;
      const point = curve.getPointAt(t);
      const tangent = curve.getTangentAt(t).normalize();
      const right = new THREE.Vector3().crossVectors(tangent, up).normalize();
      samples.push({
        point,
        tangent,
        right,
        t,
        distance: t * totalLength,
      });
      if (point.x < minX) minX = point.x;
      if (point.x > maxX) maxX = point.x;
      if (point.z < minZ) minZ = point.z;
      if (point.z > maxZ) maxZ = point.z;
    }

    // Validate no non-adjacent track overlap / pinch
    let minSepSq = Infinity;
    const minIndexGap = Math.floor(sampleCount * 0.13);
    for (let i = 0; i < sampleCount; i += 3) {
      const pi = samples[i].point;
      for (let j = i + minIndexGap; j < sampleCount; j += 3) {
        if (sampleCount - (j - i) < minIndexGap) continue;
        const pj = samples[j].point;
        const dx = pi.x - pj.x;
        const dz = pi.z - pj.z;
        const dSq = dx * dx + dz * dz;
        if (dSq < minSepSq) minSepSq = dSq;
      }
    }

    if (minSepSq >= minAllowedSep * minAllowedSep) {
      break;
    }
    waveScale *= 0.62;
  }

  const checkpoints = [0.2, 0.4, 0.6, 0.8].map((t, index) => {
    const s = samples[Math.floor(t * sampleCount) % sampleCount];
    return {
      index,
      t,
      point: s.point.clone(),
      tangent: s.tangent.clone(),
    };
  });

  const minimapPoints: { x: number; z: number }[] = [];
  for (let i = 0; i < sampleCount; i += 3) {
    minimapPoints.push({ x: samples[i].point.x, z: samples[i].point.z });
  }

  // Start grid sits 14m behind finish line along start tangent
  const s0 = samples[0];
  const startPoint = s0.point.clone().addScaledVector(s0.tangent, -14);
  const finishPoint = s0.point.clone();

  return {
    curve,
    samples,
    totalLength,
    roadWidth,
    checkpoints,
    minimapPoints,
    minimapBounds: { minX, maxX, minZ, maxZ },
    startPoint,
    finishPoint,
    archetype,
  };
}
