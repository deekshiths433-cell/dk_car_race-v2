import * as THREE from 'three';
import { getCarDisplayName } from '../data/brandConfig';
import { CAR_SPECS, TIRE_STYLES } from '../data/cars';
import { AiSkillProfile } from '../data/difficulty';
import {
  CarDamage,
  CarId,
  CarSpec,
  GameSettings,
  LevelConfig,
  OwnedCarState,
} from '../types/game';
import { GeneratedTrack } from './TrackGenerator';

export interface VehicleInput {
  throttle: number; // 0..1
  brake: number; // 0..1
  steer: number; // -1..1 (left = +1 in Three.js Y-up right-handed yaw, or handled consistently)
  handbrake: boolean;
  nitro: boolean;
}

export type AiDrivingStyle = 'clean' | 'aggressive' | 'blocker';

export interface VehicleBody {
  id: string;
  driverName: string;
  carName: string;
  topSpeedKmh: number;
  isPlayer: boolean;
  carId: CarId;
  spec: CarSpec;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  yaw: number;
  angularVel: number;
  steerAngle: number;
  wheelSpinAngle: number;
  speedMs: number;
  speedKmh: number;
  rpm: number;
  gear: number; // 0=R, 1..7
  nitro: number; // 0..100
  nitroActive: boolean;
  drifting: boolean;
  slipRatio: number;
  slipstreamAmount: number; // 0..1 drafting boost factor
  bodyPitch: number;
  bodyRoll: number;
  damage: CarDamage;
  trackHintIndex: number;
  lap: number;
  lapsCompleted: number;
  hasCrossedStart: boolean;
  lastT: number;
  totalProgress: number; // lapsCompleted + t (negative behind start line before race start)
  trackDistanceMeters: number;
  finished: boolean;
  finishTimeSec: number;
  bestLapSec: number | null;
  currentLapStartSec: number;
  passedCheckpoints: Set<number>;
  aiTargetOffset: number;
  aiSpeedFactor: number;
  aiStyle: AiDrivingStyle;
  aiMatchedMaxSpeedMs?: number;
  aiMatchedBaseAccelMs2?: number;
  aiMatchedAccelMult?: number;
  aiMatchedGripMult?: number;
  aiRubberBandMult?: number;
  aiWarmupMult: number;
  aiPackMult: number;
  aiMistakePenalty: number;
  aiMistakeTimer: number;
  aiSkill?: AiSkillProfile;
}

export function createVehicleBody(
  id: string,
  carId: CarId,
  isPlayer: boolean,
  startPos: THREE.Vector3,
  startYaw: number,
  ownedState?: OwnedCarState,
  aiSpeedFactor = 1,
  driverName?: string,
  track?: GeneratedTrack,
  aiConfig?: {
    matchedMaxSpeedMs?: number;
    matchedBaseAccelMs2?: number;
    matchedAccelMult?: number;
    matchedGripMult?: number;
    aiStyle?: AiDrivingStyle;
    aiSkill?: AiSkillProfile;
  }
): VehicleBody {
  const spec = CAR_SPECS[carId];
  const initialNearest = track ? track.getNearestSample(startPos) : null;
  const initialT = initialNearest ? initialNearest.sample.t : 0;
  const hasCrossedStart = initialT <= 0.5;
  const initialProgress = hasCrossedStart ? initialT : initialT - 1;
  const carName = getCarDisplayName(spec);

  return {
    id,
    driverName: driverName ?? (isPlayer ? 'You' : id.toUpperCase()),
    carName,
    topSpeedKmh: aiConfig?.matchedMaxSpeedMs
      ? Math.round(aiConfig.matchedMaxSpeedMs * 3.6)
      : spec.stats.topSpeedKmh,
    isPlayer,
    carId,
    spec,
    position: startPos.clone(),
    velocity: new THREE.Vector3(),
    yaw: startYaw,
    angularVel: 0,
    steerAngle: 0,
    wheelSpinAngle: 0,
    speedMs: 0,
    speedKmh: 0,
    rpm: spec.stats.idleRpm,
    gear: 1,
    nitro: 100,
    nitroActive: false,
    drifting: false,
    slipRatio: 0,
    slipstreamAmount: 0,
    bodyPitch: 0,
    bodyRoll: 0,
    damage: ownedState ? { ...ownedState.damage } : { body: 0, engine: 0, tires: 0 },
    trackHintIndex: initialNearest ? initialNearest.index : 0,
    lap: 1,
    lapsCompleted: 0,
    hasCrossedStart,
    lastT: initialT,
    totalProgress: initialProgress,
    trackDistanceMeters: initialProgress * (track?.totalLength ?? 1600),
    finished: false,
    finishTimeSec: 0,
    bestLapSec: null,
    currentLapStartSec: 0,
    passedCheckpoints: new Set<number>(),
    aiTargetOffset: (Math.random() - 0.5) * 5.2,
    aiSpeedFactor,
    aiStyle: aiConfig?.aiStyle ?? 'clean',
    aiMatchedMaxSpeedMs: aiConfig?.matchedMaxSpeedMs,
    aiMatchedBaseAccelMs2: aiConfig?.matchedBaseAccelMs2,
    aiMatchedAccelMult: aiConfig?.matchedAccelMult,
    aiMatchedGripMult: aiConfig?.matchedGripMult,
    aiRubberBandMult: 1,
    aiWarmupMult: 1,
    aiPackMult: 1,
    aiMistakePenalty: 1,
    aiMistakeTimer: 0,
    aiSkill: aiConfig?.aiSkill,
  };
}

const _fwd = new THREE.Vector3();
const _right = new THREE.Vector3();
const _steerVec = new THREE.Vector3();

export function stepVehiclePhysics(
  v: VehicleBody,
  input: VehicleInput,
  dt: number,
  track: GeneratedTrack,
  level: LevelConfig,
  settings: GameSettings,
  ownedState: OwnedCarState | undefined,
  raceTimeSec: number,
  callbacks: {
    onCollision?: (intensity: number, pos: THREE.Vector3) => void;
    onCheckpoint?: (cpIndex: number) => void;
    onLapComplete?: (lapTime: number) => void;
    onFinish?: () => void;
    onDriftMeters?: (meters: number) => void;
  }
): void {
  const stats = v.spec.stats;
  const dmgMult = level.collisionDamageMult ?? 1;

  // Upgrades & Damage multipliers
  const engLvl = ownedState ? ownedState.upgrades.engineLevel : 0;
  const turboLvl = ownedState ? ownedState.upgrades.turboLevel : 0;
  const tiresLvl = ownedState ? ownedState.upgrades.tiresLevel : 0;
  const brakesLvl = ownedState ? ownedState.upgrades.brakesLevel : 0;
  const tireStyleObj = ownedState
    ? TIRE_STYLES.find((t) => t.id === ownedState.customization.tireStyle)
    : undefined;
  const tireStyleGrip = tireStyleObj ? tireStyleObj.gripBonus : 0;

  const engineDamagePenalty = 1 - (v.damage.engine / 100) * 0.28;
  const tireDamagePenalty = 1 - (v.damage.tires / 100) * 0.32;
  const weatherGrip =
    level.weather === 'snow' ? 0.72 : level.weather === 'rain' ? 0.85 : 1.0;

  // Slipstream aero draft boost (up to +9% top speed, +14% drive acceleration)
  const slipstreamSpeedMult = 1 + v.slipstreamAmount * 0.09;
  const slipstreamAccelMult = 1 + v.slipstreamAmount * 0.14;

  // Real-world top speed in m/s (rivals use matched ceiling + warm-up + pack control + +-2% variation + fair rubber-band)
  const aiPaceCombinedMult =
    v.aiSpeedFactor *
    v.aiWarmupMult *
    v.aiPackMult *
    (v.aiRubberBandMult ?? 1) *
    v.aiMistakePenalty;

  const topSpeedBonus = 1 + engLvl * 0.018 + turboLvl * 0.012;
  const baseMaxSpeedMs =
    !v.isPlayer && v.aiMatchedMaxSpeedMs
      ? v.aiMatchedMaxSpeedMs * aiPaceCombinedMult
      : (stats.topSpeedKmh / 3.6) * topSpeedBonus * engineDamagePenalty;

  const maxSpeedMs = baseMaxSpeedMs * slipstreamSpeedMult;

  // Acceleration calibrated from player's 0-100 km/h benchmark for AI rivals so launches match difficulty curve
  const baseZeroTo100Accel =
    !v.isPlayer && v.aiMatchedBaseAccelMs2
      ? v.aiMatchedBaseAccelMs2
      : (100 / 3.6) / Math.max(1.8, stats.zeroToHundredSec);
  const accelUpgrade =
    !v.isPlayer && v.aiMatchedAccelMult
      ? v.aiMatchedAccelMult * aiPaceCombinedMult
      : 1 + engLvl * 0.035 + turboLvl * 0.04;
  let peakDriveAccel =
    baseZeroTo100Accel * 1.18 * accelUpgrade * engineDamagePenalty * slipstreamAccelMult;

  // Nitro
  if (input.nitro && v.nitro > 1 && input.throttle > 0.1) {
    v.nitroActive = true;
    v.nitro = Math.max(0, v.nitro - dt * 22);
    peakDriveAccel *= stats.nitroPower;
  } else {
    v.nitroActive = false;
    v.nitro = Math.min(100, v.nitro + dt * (v.drifting ? 9.5 : 2.8));
  }

  const effectiveMaxSpeed = v.nitroActive ? maxSpeedMs * 1.14 : maxSpeedMs;

  // Forward & Right vectors (Three.js: yaw=0 faces +Z)
  _fwd.set(Math.sin(v.yaw), 0, Math.cos(v.yaw));
  _right.set(Math.cos(v.yaw), 0, -Math.sin(v.yaw));

  const forwardSpeed = v.velocity.dot(_fwd);
  const lateralSpeed = v.velocity.dot(_right);

  // Steering smoothing + sensitivity + return speed
  const maxSteer = 0.54;
  const targetSteer = -input.steer * maxSteer * (v.isPlayer ? settings.steeringSensitivity : 1.0);
  const clampedTargetSteer = THREE.MathUtils.clamp(targetSteer, -maxSteer, maxSteer);
  const steerLerpRate =
    Math.abs(clampedTargetSteer) > Math.abs(v.steerAngle)
      ? 10.5
      : 10.5 * (v.isPlayer ? settings.steeringReturnSpeed : 1.0);
  v.steerAngle = THREE.MathUtils.damp(v.steerAngle, clampedTargetSteer, steerLerpRate, dt);

  // Speed-dependent steering reduction for high-speed stability
  const speedRatio = Math.min(1, Math.abs(forwardSpeed) / 75);
  const steerAuthority = THREE.MathUtils.lerp(1.0, 0.36, speedRatio);

  // Longitudinal forces
  let longAccel = 0;
  if (input.throttle > 0.01) {
    const speedFrac = Math.max(0, forwardSpeed / effectiveMaxSpeed);
    const torqueCurve = Math.max(0.05, 1 - Math.pow(speedFrac, 1.85));
    longAccel += input.throttle * peakDriveAccel * torqueCurve;
  }

  if (input.brake > 0.01) {
    if (forwardSpeed > 1.2) {
      const brakePower = (16.5 + (stats.braking / 100) * 14) * (1 + brakesLvl * 0.05) * weatherGrip;
      longAccel -= input.brake * brakePower;
    } else {
      const revMax = 18;
      if (forwardSpeed > -revMax) {
        longAccel -= input.brake * 11.5;
      }
    }
  }

  // Rolling resistance + quadratic aerodynamic drag
  const aeroDrag = 0.0022 * forwardSpeed * Math.abs(forwardSpeed);
  const rollingDrag = 0.35 * Math.sign(forwardSpeed);
  if (Math.abs(forwardSpeed) > 0.1 || input.throttle > 0.01 || input.brake > 0.01) {
    longAccel -= aeroDrag + (input.throttle < 0.05 ? rollingDrag : 0);
  }

  // Lateral grip & drift dynamics (AI gets matched grip so corners feel competitive)
  const rawGrip =
    !v.isPlayer && v.aiMatchedGripMult
      ? v.aiMatchedGripMult * weatherGrip
      : (0.88 + (stats.handling / 100) * 0.42 + tiresLvl * 0.03 + tireStyleGrip) *
        tireDamagePenalty *
        weatherGrip;

  const gripStrength = input.handbrake ? rawGrip * 0.34 : rawGrip;
  const latFriction = -lateralSpeed * gripStrength * 7.2;

  // Apply accelerations
  v.velocity.addScaledVector(_fwd, longAccel * dt);
  v.velocity.addScaledVector(_right, latFriction * dt);

  // Steering yaw rate based on bicycle model
  if (Math.abs(forwardSpeed) > 0.4) {
    const dirSign = forwardSpeed >= 0 ? 1 : -1;
    const yawRate =
      (forwardSpeed / Math.max(2.2, stats.wheelbase)) *
      Math.tan(v.steerAngle * steerAuthority) *
      (input.handbrake ? 1.38 : 1.0) *
      dirSign;
    v.yaw += yawRate * dt * 1.35;
  }

  // Steering Assist (light or full) gently stabilizes car along track tangent
  const nearest = track.getNearestSample(v.position, v.trackHintIndex);
  v.trackHintIndex = nearest.index;

  if (v.isPlayer && settings.steeringAssist !== 'off' && forwardSpeed > 12) {
    const tangentYaw = Math.atan2(nearest.sample.tangent.x, nearest.sample.tangent.z);
    let yawDiff = tangentYaw - v.yaw;
    while (yawDiff > Math.PI) yawDiff -= Math.PI * 2;
    while (yawDiff < -Math.PI) yawDiff += Math.PI * 2;
    const assistStrength = settings.steeringAssist === 'full' ? 1.9 : 0.75;
    if (Math.abs(yawDiff) < 0.9) {
      v.yaw += yawDiff * assistStrength * dt;
    }
    if (settings.steeringAssist === 'full' && Math.abs(nearest.lateralOffset) > track.roadWidth * 0.35) {
      const pull = -Math.sign(nearest.lateralOffset) * 1.4;
      v.velocity.addScaledVector(nearest.sample.right, pull * dt);
    }
  }

  // Clamp total speed
  const curSpeed = v.velocity.length();
  if (curSpeed > effectiveMaxSpeed) {
    v.velocity.multiplyScalar(effectiveMaxSpeed / curSpeed);
  }
  if (input.throttle < 0.01 && input.brake < 0.01 && curSpeed < 0.25) {
    v.velocity.set(0, 0, 0);
  }

  // Integrate position
  v.position.addScaledVector(v.velocity, dt);

  // Project vertical Y to track elevation smoothly
  const postNearest = track.getNearestSample(v.position, v.trackHintIndex);
  v.trackHintIndex = postNearest.index;
  v.position.y = THREE.MathUtils.damp(v.position.y, postNearest.sample.point.y, 18, dt);

  // Guardrail / track boundary collision
  const maxOffset = track.roadWidth * 0.5 + 0.35;
  if (Math.abs(postNearest.lateralOffset) > maxOffset) {
    const sign = Math.sign(postNearest.lateralOffset);
    const penetration = Math.abs(postNearest.lateralOffset) - maxOffset;
    v.position.addScaledVector(postNearest.sample.right, -sign * penetration);

    const outSpeed = v.velocity.dot(postNearest.sample.right) * sign;
    if (outSpeed > 1.5) {
      const impact = Math.min(1, outSpeed / 22);
      v.velocity.addScaledVector(postNearest.sample.right, -sign * outSpeed * 1.35);
      v.velocity.multiplyScalar(0.84);
      if (v.isPlayer) {
        v.damage.body = Math.min(100, v.damage.body + impact * 5.2 * dmgMult);
        v.damage.tires = Math.min(100, v.damage.tires + impact * 2.5 * dmgMult);
        v.damage.engine = Math.min(100, v.damage.engine + impact * 3.1 * dmgMult);
      }
      callbacks.onCollision?.(impact, v.position);
    }
  }

  // Obstacle collisions
  for (let i = 0; i < track.obstacles.length; i++) {
    const obs = track.obstacles[i];
    if (obs.hit) continue;
    const dx = v.position.x - obs.position.x;
    const dz = v.position.z - obs.position.z;
    if (dx * dx + dz * dz < (obs.radius + 1.1) * (obs.radius + 1.1)) {
      obs.hit = true;
      obs.mesh.visible = false;
      v.velocity.multiplyScalar(0.82);
      if (v.isPlayer) {
        v.damage.body = Math.min(100, v.damage.body + 4.5 * dmgMult);
        v.damage.tires = Math.min(100, v.damage.tires + 3.0 * dmgMult);
      }
      callbacks.onCollision?.(0.6, v.position);
    }
  }

  // Telemetry & Gear/RPM calculation
  v.speedMs = v.velocity.dot(_fwd);
  v.speedKmh = Math.abs(v.speedMs) * 3.6;
  v.wheelSpinAngle += (v.speedMs / stats.wheelRadius) * dt;

  // Drift & slip calculation
  const slipAngle = Math.abs(lateralSpeed) / Math.max(4, Math.abs(forwardSpeed));
  v.slipRatio = THREE.MathUtils.clamp(
    (slipAngle - 0.14) * 2.4 + (input.handbrake && Math.abs(forwardSpeed) > 8 ? 0.55 : 0),
    0,
    1
  );
  v.drifting = v.slipRatio > 0.22 && Math.abs(forwardSpeed) > 10;
  if (v.drifting && v.isPlayer) {
    callbacks.onDriftMeters?.(Math.abs(forwardSpeed) * dt * 0.65);
  }

  // Suspension Pitch & Roll
  const targetRoll = THREE.MathUtils.clamp(-lateralSpeed * 0.0085, -0.065, 0.065);
  const targetPitch = THREE.MathUtils.clamp(-longAccel * 0.0022, -0.045, 0.045);
  v.bodyRoll = THREE.MathUtils.damp(v.bodyRoll, targetRoll, 10, dt);
  v.bodyPitch = THREE.MathUtils.damp(v.bodyPitch, targetPitch, 10, dt);

  // Automatic Gearbox + Realistic RPM
  if (v.speedMs < -0.5) {
    v.gear = 0; // Reverse
    v.rpm = THREE.MathUtils.clamp(
      stats.idleRpm + (Math.abs(v.speedMs) / 18) * (stats.redlineRpm * 0.6),
      stats.idleRpm,
      stats.redlineRpm
    );
  } else {
    const wheelRpm = (Math.abs(v.speedMs) / (2 * Math.PI * stats.wheelRadius)) * 60;
    const gearCount = stats.gearRatios.length;
    let chosenGear = Math.max(1, Math.min(gearCount, v.gear));
    const calcRpm = (g: number) =>
      Math.max(stats.idleRpm, wheelRpm * stats.gearRatios[g - 1] * stats.finalDrive * 1.85);

    let rpm = calcRpm(chosenGear);
    if (rpm > stats.redlineRpm * 0.94 && chosenGear < gearCount) {
      chosenGear++;
      rpm = calcRpm(chosenGear);
    } else if (rpm < stats.redlineRpm * 0.42 && chosenGear > 1) {
      chosenGear--;
      rpm = calcRpm(chosenGear);
    }
    v.gear = chosenGear;
    v.rpm = THREE.MathUtils.clamp(rpm + input.throttle * 380, stats.idleRpm, stats.redlineRpm);
  }

  // Track Progress, Checkpoints & Lap Crossing (locked once finished so finishTimeSec & distance stay exact)
  if (!v.finished) {
    const t = postNearest.sample.t;

    if (!v.hasCrossedStart) {
      if (v.lastT > 0.85 && t < 0.15) {
        v.hasCrossedStart = true;
      } else if (t <= 0.5 && v.lastT <= 0.5) {
        v.hasCrossedStart = true;
      }
    }

    if (v.hasCrossedStart) {
      for (const cp of track.checkpoints) {
        if (!v.passedCheckpoints.has(cp.index)) {
          const diff = Math.abs(t - cp.t);
          if (diff < 0.045) {
            v.passedCheckpoints.add(cp.index);
            if (v.isPlayer) callbacks.onCheckpoint?.(cp.index);
          }
        }
      }
    }

    if (v.hasCrossedStart && v.lastT > 0.85 && t < 0.15 && v.passedCheckpoints.size >= 2) {
      const wrapSpan = 1 - v.lastT + t;
      const crossFrac =
        wrapSpan > 0.0001 ? THREE.MathUtils.clamp((1 - v.lastT) / wrapSpan, 0, 1) : 1;
      const exactCrossTime = Math.max(0, raceTimeSec - dt + dt * crossFrac);

      const lapTime = exactCrossTime - v.currentLapStartSec;
      v.currentLapStartSec = exactCrossTime;
      if (v.bestLapSec === null || lapTime < v.bestLapSec) {
        v.bestLapSec = lapTime;
      }
      v.passedCheckpoints.clear();
      v.lapsCompleted++;
      if (v.isPlayer) callbacks.onLapComplete?.(lapTime);

      if (v.lapsCompleted >= level.laps) {
        v.finished = true;
        v.finishTimeSec = exactCrossTime;
        v.totalProgress = level.laps;
        v.trackDistanceMeters = level.laps * track.totalLength;
        v.lastT = t;
        callbacks.onFinish?.();
        return;
      } else {
        v.lap = v.lapsCompleted + 1;
      }
    }

    let lapFraction: number;
    if (!v.hasCrossedStart) {
      lapFraction = t > 0.5 ? t - 1 : t;
    } else if (v.lastT < 0.15 && t > 0.85) {
      lapFraction = t - 1;
    } else if (v.lapsCompleted === 0 && v.passedCheckpoints.size === 0 && t > 0.85) {
      lapFraction = t - 1;
    } else {
      lapFraction = t;
    }

    v.lastT = t;
    v.totalProgress = v.lapsCompleted + lapFraction;
    v.trackDistanceMeters = v.totalProgress * track.totalLength;
  }
}

export function computeAiInput(
  ai: VehicleBody,
  track: GeneratedTrack,
  level: LevelConfig,
  allVehicles: VehicleBody[] = []
): VehicleInput {
  const skill = ai.aiSkill;
  const brakeLook = skill?.brakingLookAhead ?? 22;
  const cornerSkill = skill?.cornerSpeedFactor ?? 1.0;
  const slipstreamSkill = skill?.slipstreamSkill ?? 0.5;
  const blockingChance = skill?.blockingChance ?? (level.rivalSkill >= 0.97 ? 0.5 : 0);
  const overtakeAgg = skill?.overtakeAggression ?? 0.6;
  const throttleMastery = skill?.throttleMastery ?? 0.96;

  const len = Math.max(1, track.samples.length);
  const lookAheadIdx = (ai.trackHintIndex + 10) % len;
  const futureIdx = (ai.trackHintIndex + brakeLook) % len;
  const apexIdx = (ai.trackHintIndex + 15) % len;
  const targetSample = track.samples[lookAheadIdx];
  const futureSample = track.samples[futureIdx];
  const apexSample = track.samples[apexIdx];

  // Dynamic racing line shift into corners (hugging apex on tight curves)
  const curveVecX = futureSample.tangent.x - targetSample.tangent.x;
  const curveVecZ = futureSample.tangent.z - targetSample.tangent.z;
  const turnSign =
    targetSample.right.x * curveVecX + targetSample.right.z * curveVecZ;
  const cornerCurvature = 1 - targetSample.tangent.dot(futureSample.tangent);
  const roadHalf = track.roadWidth * 0.34;

  let desiredLatOffset = ai.aiTargetOffset * (0.55 - (skill?.skillNorm ?? 0) * 0.25);
  if (cornerCurvature > 0.08) {
    const apexCommitment = 0.35 + (skill?.skillNorm ?? 0.3) * 0.25;
    desiredLatOffset =
      Math.sign(turnSign) * Math.min(roadHalf, roadHalf * (apexCommitment + cornerCurvature * 1.35));
  }

  // Slipstream drafting on straights, overtaking, and defensive blocking
  let draftTargetLat: number | null = null;
  for (let i = 0; i < allVehicles.length; i++) {
    const other = allVehicles[i];
    if (other.id === ai.id || other.finished) continue;

    const dx = other.position.x - ai.position.x;
    const dz = other.position.z - ai.position.z;
    const distSq = dx * dx + dz * dz;
    if (distSq > 1156) continue; // > 34m

    const forwardDot = dx * targetSample.tangent.x + dz * targetSample.tangent.z;
    const latDelta = dx * targetSample.right.x + dz * targetSample.right.z;

    // Smart slipstream seek on straights when slightly behind another car
    if (
      cornerCurvature < 0.07 &&
      slipstreamSkill > 0.25 &&
      forwardDot > 9 &&
      forwardDot < 32 &&
      Math.abs(latDelta) < 6.5 &&
      ai.aiPackMult >= 0.99
    ) {
      const otherNearest = track.getNearestSample(other.position, other.trackHintIndex);
      draftTargetLat = otherNearest.lateralOffset;
    }

    // Overtake slower car directly ahead (decisiveness scales with overtakeAggression)
    if (forwardDot > 2.2 && forwardDot < 23 && Math.abs(latDelta) < 3.1) {
      const avoidDir = latDelta >= 0 ? -1 : 1;
      desiredLatOffset += avoidDir * (2.6 + overtakeAgg * 1.4);
      draftTargetLat = null;
    }

    // Defensive blocking on Level 3+ against charging player behind
    if (
      other.isPlayer &&
      (ai.aiStyle === 'blocker' || blockingChance > 0.2) &&
      forwardDot < -2.8 &&
      forwardDot > -18 &&
      Math.abs(latDelta) < 4.5
    ) {
      const blockStrength = ai.aiStyle === 'blocker' ? 1.55 : 0.75 + blockingChance * 0.95;
      desiredLatOffset = THREE.MathUtils.clamp(
        desiredLatOffset + Math.sign(latDelta) * blockStrength,
        -roadHalf,
        roadHalf
      );
    }
  }

  if (draftTargetLat !== null) {
    desiredLatOffset = THREE.MathUtils.lerp(desiredLatOffset, draftTargetLat, slipstreamSkill * 0.72);
  }

  // Dodge upcoming track obstacles
  for (let i = 0; i < track.obstacles.length; i++) {
    const obs = track.obstacles[i];
    if (obs.hit) continue;
    const dx = obs.position.x - ai.position.x;
    const dz = obs.position.z - ai.position.z;
    const distSq = dx * dx + dz * dz;
    if (distSq > 576) continue;
    const fwdDist = dx * targetSample.tangent.x + dz * targetSample.tangent.z;
    const latDist = dx * targetSample.right.x + dz * targetSample.right.z;
    if (fwdDist > 2 && fwdDist < 22 && Math.abs(latDist) < 2.6) {
      desiredLatOffset += (latDist >= 0 ? -1 : 1) * 3.2;
    }
  }

  // Subtle corner wobble if rival is currently having a minor driving mistake
  if (ai.aiMistakePenalty < 0.99) {
    desiredLatOffset += Math.sin(ai.trackDistanceMeters * 0.15) * 1.1;
  }

  desiredLatOffset = THREE.MathUtils.clamp(desiredLatOffset, -roadHalf, roadHalf);

  const targetPos = _steerVec
    .copy(apexSample.point)
    .addScaledVector(apexSample.right, desiredLatOffset);

  const dx = targetPos.x - ai.position.x;
  const dz = targetPos.z - ai.position.z;
  const desiredYaw = Math.atan2(dx, dz);

  let yawDiff = desiredYaw - ai.yaw;
  while (yawDiff > Math.PI) yawDiff -= Math.PI * 2;
  while (yawDiff < -Math.PI) yawDiff += Math.PI * 2;

  const steerGain = 1.72 + (skill?.skillNorm ?? 0.3) * 0.35;
  const steer = THREE.MathUtils.clamp(-yawDiff * steerGain, -1, 1);

  // Corner braking calibrated to level skill, curvature, and speed
  const baseSafeCornerSpeed =
    cornerCurvature > 0.34 ? 142 : cornerCurvature > 0.2 ? 192 : cornerCurvature > 0.11 ? 245 : 999;
  const safeCornerSpeed = baseSafeCornerSpeed * cornerSkill;
  const cornerBrake =
    ai.speedKmh > safeCornerSpeed
      ? THREE.MathUtils.clamp((ai.speedKmh - safeCornerSpeed) / 55, 0.25, 0.72)
      : 0;
  const throttle = cornerBrake > 0 ? 0.22 : throttleMastery * ai.aiMistakePenalty;

  const useNitro =
    cornerCurvature < 0.045 &&
    ai.nitro > 38 &&
    ai.aiPackMult >= 0.99 &&
    (ai.slipstreamAmount > 0.25 || level.rivalSkill >= 1.0 || ai.aiStyle === 'aggressive');

  return {
    throttle,
    brake: cornerBrake,
    steer,
    handbrake: false,
    nitro: useNitro,
  };
}

export function resolveCarToCarCollisions(
  vehicles: VehicleBody[],
  onPlayerHit?: (intensity: number, pos: THREE.Vector3) => void,
  collisionDamageMult = 1
): void {
  const minDist = 2.65;
  const minDistSq = minDist * minDist;

  for (let i = 0; i < vehicles.length; i++) {
    for (let j = i + 1; j < vehicles.length; j++) {
      const a = vehicles[i];
      const b = vehicles[j];
      if (a.finished || b.finished) continue;
      const dx = b.position.x - a.position.x;
      const dz = b.position.z - a.position.z;
      const dSq = dx * dx + dz * dz;

      if (dSq > 0.001 && dSq < minDistSq) {
        const dist = Math.sqrt(dSq);
        const nx = dx / dist;
        const nz = dz / dist;
        const overlap = (minDist - dist) * 0.5;

        a.position.x -= nx * overlap;
        a.position.z -= nz * overlap;
        b.position.x += nx * overlap;
        b.position.z += nz * overlap;

        const rvx = b.velocity.x - a.velocity.x;
        const rvz = b.velocity.z - a.velocity.z;
        const relVelAlongNormal = rvx * nx + rvz * nz;

        if (relVelAlongNormal < 0) {
          const impulse = -relVelAlongNormal * 0.72;
          a.velocity.x -= nx * impulse;
          a.velocity.z -= nz * impulse;
          b.velocity.x += nx * impulse;
          b.velocity.z += nz * impulse;

          const intensity = Math.min(1, Math.abs(relVelAlongNormal) / 18);
          if ((a.isPlayer || b.isPlayer) && intensity > 0.15) {
            const p = a.isPlayer ? a : b;
            p.damage.body = Math.min(100, p.damage.body + intensity * 4.2 * collisionDamageMult);
            p.damage.engine = Math.min(100, p.damage.engine + intensity * 2.1 * collisionDamageMult);
            onPlayerHit?.(intensity, p.position);
          }
        }
      }
    }
  }
}

