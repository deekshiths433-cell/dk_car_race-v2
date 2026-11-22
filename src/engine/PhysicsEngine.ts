import * as THREE from 'three';
import { getCarDisplayName } from '../data/brandConfig';
import { CAR_SPECS, TIRE_STYLES } from '../data/cars';
import { AiSkillProfile, DIFFICULTY_CURVE_CONFIG } from '../data/difficulty';
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
  steer: number; // -1..1
  handbrake: boolean;
  nitro: boolean;
}

export type AiDrivingStyle = 'aggressive' | 'balanced' | 'careful';
export type AiRaceState =
  | 'racing'
  | 'slipstreaming'
  | 'overtaking'
  | 'defending'
  | 'recovering'
  | 'finished';

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
  // Braking & Reverse state
  brakePressTime: number;
  reverseHoldTimer: number;
  // AI properties & 25 Hz brain buffers
  aiColor: string;
  aiTargetOffset: number;
  aiSpeedFactor: number;
  aiStyle: AiDrivingStyle;
  aiState: AiRaceState;
  aiMatchedMaxSpeedMs?: number;
  aiMatchedBaseAccelMs2?: number;
  aiMatchedAccelMult?: number;
  aiMatchedGripMult?: number;
  aiRubberBandMult?: number;
  aiPackMult: number;
  aiMistakePenalty: number;
  aiMistakeTimer: number;
  aiSkill?: AiSkillProfile;
  aiUpdateAccum: number;
  aiCachedInput: VehicleInput;
  aiAppliedInput: VehicleInput;
  // Stuck detector & recovery fade
  stuckCheckTimer: number;
  stuckOriginPos: THREE.Vector3;
  wrongWayTimer: number;
  recoverFadeTimer: number;
  carHitCooldown: number;
}

const NEUTRAL_INPUT: VehicleInput = {
  throttle: 0,
  brake: 0,
  steer: 0,
  handbrake: false,
  nitro: false,
};

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
    aiColor?: string;
    matchedMaxSpeedMs?: number;
    matchedBaseAccelMs2?: number;
    matchedAccelMult?: number;
    matchedGripMult?: number;
    aiStyle?: AiDrivingStyle;
    aiSkill?: AiSkillProfile;
    initialAiAccum?: number;
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
      ? Math.round(aiConfig.matchedMaxSpeedMs * 3.6 * aiSpeedFactor)
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
    brakePressTime: 0,
    reverseHoldTimer: 0,
    aiColor: aiConfig?.aiColor ?? (isPlayer ? '#f59e0b' : '#38bdf8'),
    aiTargetOffset: 0,
    aiSpeedFactor,
    aiStyle: aiConfig?.aiStyle ?? 'balanced',
    aiState: 'racing',
    aiMatchedMaxSpeedMs: aiConfig?.matchedMaxSpeedMs,
    aiMatchedBaseAccelMs2: aiConfig?.matchedBaseAccelMs2,
    aiMatchedAccelMult: aiConfig?.matchedAccelMult,
    aiMatchedGripMult: aiConfig?.matchedGripMult,
    aiRubberBandMult: 1,
    aiPackMult: 1,
    aiMistakePenalty: 1,
    aiMistakeTimer: 0,
    aiSkill: aiConfig?.aiSkill,
    aiUpdateAccum: aiConfig?.initialAiAccum ?? 0,
    aiCachedInput: { ...NEUTRAL_INPUT },
    aiAppliedInput: { ...NEUTRAL_INPUT },
    stuckCheckTimer: 0,
    stuckOriginPos: startPos.clone(),
    wrongWayTimer: 0,
    recoverFadeTimer: 0,
    carHitCooldown: 0,
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
  if (v.carHitCooldown > 0) {
    v.carHitCooldown = Math.max(0, v.carHitCooldown - dt);
  }

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

  // Slipstream aero draft boost (on straights; AI top speed stays fixed at its calculated constant)
  const slipstreamSpeedMult = 1 + v.slipstreamAmount * 0.08;
  const slipstreamAccelMult = 1 + v.slipstreamAmount * 0.14;

  // Rivals maintain their steady calculated pace (`referenceSpeed * factor * variation`)
  const topSpeedBonus = 1 + engLvl * 0.018 + turboLvl * 0.012;
  const aiConstantTopSpeedMs =
    !v.isPlayer && v.aiMatchedMaxSpeedMs
      ? v.aiMatchedMaxSpeedMs * v.aiSpeedFactor
      : null;

  const baseMaxSpeedMs =
    aiConstantTopSpeedMs !== null
      ? aiConstantTopSpeedMs * v.aiMistakePenalty
      : (stats.topSpeedKmh / 3.6) * topSpeedBonus * engineDamagePenalty;

  const maxSpeedMs =
    aiConstantTopSpeedMs !== null
      ? Math.min(aiConstantTopSpeedMs, baseMaxSpeedMs)
      : baseMaxSpeedMs * slipstreamSpeedMult;

  // Acceleration calibrated from 0-100 km/h benchmark
  const baseZeroTo100Accel =
    !v.isPlayer && v.aiMatchedBaseAccelMs2
      ? v.aiMatchedBaseAccelMs2
      : (100 / 3.6) / Math.max(1.8, stats.zeroToHundredSec);
  const accelUpgrade =
    !v.isPlayer && v.aiMatchedAccelMult
      ? v.aiMatchedAccelMult * v.aiSpeedFactor * v.aiMistakePenalty
      : 1 + engLvl * 0.035 + turboLvl * 0.04;
  let peakDriveAccel =
    baseZeroTo100Accel * 1.16 * accelUpgrade * engineDamagePenalty * slipstreamAccelMult;

  // Nitro boosts acceleration smoothly (never raises an AI rival above its fixed calculated top speed)
  if (input.nitro && v.nitro > 1 && input.throttle > 0.1) {
    v.nitroActive = true;
    v.nitro = Math.max(0, v.nitro - dt * 22);
    peakDriveAccel *= stats.nitroPower;
  } else {
    v.nitroActive = false;
    v.nitro = Math.min(100, v.nitro + dt * (v.drifting ? 9.5 : 3.2));
  }

  const effectiveMaxSpeed =
    v.isPlayer && v.nitroActive ? maxSpeedMs * 1.12 : maxSpeedMs;

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
  const speedRatio = Math.min(1, Math.abs(forwardSpeed) / 78);
  const steerAuthority = THREE.MathUtils.lerp(1.0, 0.36, speedRatio);

  // Aero & rolling coast resistance calibrated so cars reliably reach 100% real top speed
  const aeroDragCoeff = 0.00045;
  const rollingCoeff = 0.28;
  const aeroDrag = aeroDragCoeff * forwardSpeed * Math.abs(forwardSpeed);
  const rollingDrag = rollingCoeff * Math.sign(forwardSpeed);

  // Longitudinal forces
  let longAccel = 0;
  if (input.throttle > 0.01) {
    const speedFrac = THREE.MathUtils.clamp(forwardSpeed / effectiveMaxSpeed, 0, 1.02);
    // Strong launch matching 0-100 km/h + realistic high-speed taper canceling drag cleanly at 100% top speed
    const tractiveCurve = Math.max(0, 1 - Math.pow(Math.min(1, speedFrac), 1.45));
    const dragCompensation =
      forwardSpeed > 0
        ? (aeroDrag + rollingDrag) * THREE.MathUtils.clamp(speedFrac * 1.1, 0, 1)
        : 0;
    longAccel += input.throttle * (peakDriveAccel * tractiveCurve + dragCompensation);
  }

  // Progressive braking & 0.5s hold delay at full stop before engaging reverse
  if (input.brake > 0.01) {
    v.brakePressTime = Math.min(0.45, v.brakePressTime + dt);
    const pedalRamp = THREE.MathUtils.clamp(v.brakePressTime / 0.24, 0.35, 1.0);

    if (forwardSpeed > 0.65) {
      v.reverseHoldTimer = 0;
      // ~8.5-9.2 m/s^2 progressive braking => 100 -> 0 km/h in ~3.1-3.4 seconds
      const brakePower =
        (6.75 + (stats.braking / 100) * 2.15) *
        (1 + brakesLvl * 0.04) *
        weatherGrip *
        pedalRamp;
      longAccel -= input.brake * brakePower;
    } else {
      // Stop smoothly first, then require 0.5s sustained brake hold before reversing
      if (forwardSpeed > 0.02) {
        longAccel -= Math.min(9.5, forwardSpeed * 12);
      }
      if (input.brake > 0.12 && input.throttle < 0.05) {
        v.reverseHoldTimer += dt;
        if (v.reverseHoldTimer >= DIFFICULTY_CURVE_CONFIG.reverseHoldDelaySec) {
          const revMax = 18;
          if (forwardSpeed > -revMax) {
            longAccel -= input.brake * 10.5;
          }
        } else if (Math.abs(forwardSpeed) <= 0.65) {
          v.velocity.addScaledVector(_fwd, -forwardSpeed * 0.65);
        }
      }
    }
  } else {
    v.brakePressTime = 0;
    if (forwardSpeed >= 0) {
      v.reverseHoldTimer = 0;
    }
  }

  if (Math.abs(forwardSpeed) > 0.08 || input.throttle > 0.01 || input.brake > 0.01) {
    longAccel -= aeroDrag + (input.throttle < 0.05 ? rollingDrag : 0);
  }

  // Lateral grip & drift dynamics
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

  // Steering Assist (light or full) gently stabilizes player car along track tangent
  const nearest = track.getNearestSample(v.position, v.trackHintIndex);
  v.trackHintIndex = nearest.index;

  if (v.isPlayer && settings.steeringAssist !== 'off' && forwardSpeed > 12) {
    const tangentYaw = Math.atan2(nearest.sample.tangent.x, nearest.sample.tangent.z);
    let yawDiff = tangentYaw - v.yaw;
    while (yawDiff > Math.PI) yawDiff -= Math.PI * 2;
    while (yawDiff < -Math.PI) yawDiff += Math.PI * 2;
    const assistStrength = settings.steeringAssist === 'full' ? 1.9 : 0.72;
    if (Math.abs(yawDiff) < 0.9) {
      v.yaw += yawDiff * assistStrength * dt;
    }
    if (settings.steeringAssist === 'full' && Math.abs(nearest.lateralOffset) > track.roadWidth * 0.35) {
      const pull = -Math.sign(nearest.lateralOffset) * 1.4;
      v.velocity.addScaledVector(nearest.sample.right, pull * dt);
    }
  }

  // Clamp total speed cleanly to effective top speed
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
    if (outSpeed > 1.2) {
      const impact = Math.min(1, outSpeed / 24);
      v.velocity.addScaledVector(postNearest.sample.right, -sign * outSpeed * 1.25);
      v.velocity.multiplyScalar(0.91 - impact * 0.07);
      if (v.isPlayer) {
        v.damage.body = Math.min(100, v.damage.body + impact * 4.5 * dmgMult);
        v.damage.tires = Math.min(100, v.damage.tires + impact * 2.2 * dmgMult);
        v.damage.engine = Math.min(100, v.damage.engine + impact * 2.6 * dmgMult);
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
    if (dx * dx + dz * dz < (obs.radius + 1.05) * (obs.radius + 1.05)) {
      obs.hit = true;
      obs.mesh.visible = false;
      v.velocity.multiplyScalar(0.84);
      if (v.isPlayer) {
        v.damage.body = Math.min(100, v.damage.body + 4.0 * dmgMult);
        v.damage.tires = Math.min(100, v.damage.tires + 2.5 * dmgMult);
      }
      callbacks.onCollision?.(0.55, v.position);
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

  // Track Progress, Checkpoints & Lap Crossing (locked once finished)
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
        v.aiState = 'finished';
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

/**
 * Signed curvature helper between two track samples (radians turned divided by chord distance).
 */
function sampleSignedCurvature(
  a: GeneratedTrack['samples'][number],
  b: GeneratedTrack['samples'][number]
): { signedKappa: number; absKappa: number } {
  const crossY = a.tangent.z * b.tangent.x - a.tangent.x * b.tangent.z;
  const dot = THREE.MathUtils.clamp(a.tangent.dot(b.tangent), -1, 1);
  const angle = Math.atan2(crossY, dot);
  const chord = Math.max(4, a.point.distanceTo(b.point));
  const signedKappa = angle / chord;
  return { signedKappa, absKappa: Math.abs(signedKappa) };
}

/**
 * Skilled AI Driver Brain (runs at 25 Hz and smoothly interpolates per frame):
 * - Out-in-out racing line (wide entry, clip apex, wide exit)
 * - Physics-based corner braking point calculation from track curvature
 * - Slipstreaming, inside-line/straight overtaking, defending, and side-by-side clearance
 * - Smart nitro & corner-exit stability with distinct human-like personalities
 */
export function computeAiInput(
  ai: VehicleBody,
  track: GeneratedTrack,
  level: LevelConfig,
  allVehicles: VehicleBody[] = []
): VehicleInput {
  const skill = ai.aiSkill;
  const samples = track.samples;
  const len = Math.max(1, samples.length);
  const sampleDist = Math.max(1.5, track.totalLength / len);
  const curIdx = ai.trackHintIndex;

  // Personality modifiers
  const styleAggression =
    ai.aiStyle === 'aggressive' ? 1.12 : ai.aiStyle === 'careful' ? 0.88 : 1.0;
  const styleCornerMult =
    ai.aiStyle === 'aggressive' ? 1.04 : ai.aiStyle === 'careful' ? 0.95 : 1.0;

  const slipstreamSkill = skill?.slipstreamSkill ?? 0.55;
  const blockingChance =
    ai.aiStyle === 'careful'
      ? 0.08
      : skill?.blockingChance ?? (level.levelNumber >= 3 ? 0.45 : 0);
  const overtakeAgg = (skill?.overtakeAggression ?? 0.65) * styleAggression;
  const cornerSkill = (skill?.cornerSpeedFactor ?? 1.0) * styleCornerMult;

  // 1. Speed-proportional spline steering lookahead (~11m on hairpins, ~24m on straights) so AI never cuts walls
  const steerAheadMeters = THREE.MathUtils.clamp(Math.max(10.5, ai.speedMs * 0.44), 10.5, 25);
  const steerSamples = Math.max(2, Math.round(steerAheadMeters / sampleDist));
  const steerIdx = (curIdx + steerSamples) % len;
  const steerSample = samples[steerIdx];

  // 2. Scan upcoming corner curvature at entry (~20m), apex (~40m), and braking horizon (~30..105m)
  const localSpan = Math.max(3, Math.round(18 / sampleDist));
  const nearA = samples[(curIdx + Math.round(6 / sampleDist)) % len];
  const nearB = samples[(curIdx + Math.round(24 / sampleDist)) % len];
  const localCurv = sampleSignedCurvature(nearA, nearB);

  const entryA = samples[(curIdx + Math.round(20 / sampleDist)) % len];
  const entryB = samples[(curIdx + Math.round(44 / sampleDist)) % len];
  const upcomingCurv = sampleSignedCurvature(entryA, entryB);

  const prevA = samples[(curIdx - Math.round(14 / sampleDist) + len) % len];
  const prevB = samples[(curIdx + Math.round(4 / sampleDist)) % len];
  const exitCurv = sampleSignedCurvature(prevA, prevB);

  // Determine physical braking horizon speed limit along the upcoming 22m..110m window
  const weatherGrip = level.weather === 'snow' ? 0.72 : level.weather === 'rain' ? 0.85 : 1.0;
  const lateralGripAccel = (ai.aiMatchedGripMult ?? 1.08) * weatherGrip * 19.2 * cornerSkill;
  const brakeHorizonM = THREE.MathUtils.clamp(
    18 + (ai.speedMs * ai.speedMs) / 14.5,
    24,
    115
  );
  const brakeWindowSteps = Math.max(3, Math.round(brakeHorizonM / sampleDist));

  let maxFutureKappa = localCurv.absKappa;
  let desiredSafeSpeedMs = 999;

  for (let step = 2; step <= brakeWindowSteps; step += 2) {
    const sA = samples[(curIdx + step) % len];
    const sB = samples[(curIdx + step + localSpan) % len];
    const { absKappa } = sampleSignedCurvature(sA, sB);
    if (absKappa > maxFutureKappa) maxFutureKappa = absKappa;

    if (absKappa > 0.0045) {
      const distAheadM = step * sampleDist;
      const apexSpeedMs = Math.sqrt(lateralGripAccel / absKappa);
      // Kinematic braking envelope: v_now <= sqrt(v_apex^2 + 2 * comfortDecel * distAhead)
      const comfortDecel = 8.4 * weatherGrip;
      const entryAllowMs = Math.sqrt(apexSpeedMs * apexSpeedMs + 2 * comfortDecel * distAheadM);
      if (entryAllowMs < desiredSafeSpeedMs) {
        desiredSafeSpeedMs = entryAllowMs;
      }
    }
  }

  // 3. Out-In-Out Racing Line
  const safeHalfWidth = track.roadWidth * 0.5 - 1.55;
  let racingLineLat = 0;

  if (localCurv.absKappa > 0.0075) {
    // Currently rounding corner: clip the inside apex!
    const apexAmt = THREE.MathUtils.clamp(localCurv.absKappa * 26, 0.35, 0.88);
    racingLineLat = Math.sign(localCurv.signedKappa) * safeHalfWidth * apexAmt;
  } else if (upcomingCurv.absKappa > 0.008) {
    // Approaching corner ahead: swing wide to the outside for late braking & wide entry!
    const entryAmt = THREE.MathUtils.clamp(upcomingCurv.absKappa * 22, 0.35, 0.82);
    racingLineLat = -Math.sign(upcomingCurv.signedKappa) * safeHalfWidth * entryAmt;
  } else if (exitCurv.absKappa > 0.008) {
    // Exiting a corner: run wide smoothly onto exit curb to carry exit speed!
    const exitAmt = THREE.MathUtils.clamp(exitCurv.absKappa * 18, 0.25, 0.7);
    racingLineLat = -Math.sign(exitCurv.signedKappa) * safeHalfWidth * exitAmt;
  }

  // Blend in slight individual preference on dead straights
  let desiredLatOffset = racingLineLat + ai.aiTargetOffset * 0.15;
  let nextState: AiRaceState = 'racing';

  // 4. Traffic Racecraft: Slipstream, Inside Overtake, Side-by-Side Room, and Defense
  const myNearest = track.getNearestSample(ai.position, curIdx);
  const myLat = myNearest.lateralOffset;

  let carAheadToDraft: { fwdDist: number; lat: number } | null = null;
  let carAheadToPass: { fwdDist: number; lat: number; speedDiff: number } | null = null;
  let sideBySideCar: { lat: number } | null = null;
  let chaserBehind: { fwdDist: number; lat: number } | null = null;

  for (let i = 0; i < allVehicles.length; i++) {
    const other = allVehicles[i];
    if (other.id === ai.id || other.finished) continue;

    const dx = other.position.x - ai.position.x;
    const dz = other.position.z - ai.position.z;
    const distSq = dx * dx + dz * dz;
    if (distSq > 1225) continue; // > 35m

    const fwdDot = dx * steerSample.tangent.x + dz * steerSample.tangent.z;
    const otherNearest = track.getNearestSample(other.position, other.trackHintIndex);
    const otherLat = otherNearest.lateralOffset;
    const latGap = Math.abs(otherLat - myLat);

    // Side-by-side car check (must leave clean room so AI never drives into a car alongside!)
    if (Math.abs(fwdDot) < 6.8 && latGap < 4.5) {
      sideBySideCar = { lat: otherLat };
    }

    // Traffic ahead in same corridor
    if (fwdDot > 2.2 && fwdDot < 30 && latGap < 5.0) {
      const speedDiff = ai.speedMs - other.speedMs;
      if (fwdDot < 13.5 || speedDiff > 2.0) {
        if (!carAheadToPass || fwdDot < carAheadToPass.fwdDist) {
          carAheadToPass = { fwdDist: fwdDot, lat: otherLat, speedDiff };
        }
      } else if (
        maxFutureKappa < 0.0045 &&
        fwdDot >= 11 &&
        fwdDot < 30 &&
        slipstreamSkill > 0.25
      ) {
        if (!carAheadToDraft || fwdDot < carAheadToDraft.fwdDist) {
          carAheadToDraft = { fwdDist: fwdDot, lat: otherLat };
        }
      }
    }

    // Charging opponent close behind on approach
    if (fwdDot < -2.8 && fwdDot > -15 && other.speedMs > ai.speedMs - 1.5) {
      if (!chaserBehind || fwdDot > chaserBehind.fwdDist) {
        chaserBehind = { fwdDist: fwdDot, lat: otherLat };
      }
    }
  }

  if (carAheadToPass && !ai.finished) {
    // Pick clear inside line when approaching a turn, otherwise widest clear lane
    const preferRight =
      upcomingCurv.absKappa > 0.005
        ? Math.sign(upcomingCurv.signedKappa) > 0
        : carAheadToPass.lat <= 0;
    const passDir =
      Math.abs(carAheadToPass.lat) > safeHalfWidth * 0.45
        ? -Math.sign(carAheadToPass.lat)
        : preferRight
          ? 1
          : -1;
    const passLane = THREE.MathUtils.clamp(
      carAheadToPass.lat + passDir * (3.25 + overtakeAgg * 0.65),
      -safeHalfWidth,
      safeHalfWidth
    );
    desiredLatOffset = passLane;
    nextState = 'overtaking';
  } else if (carAheadToDraft && !ai.finished) {
    desiredLatOffset = THREE.MathUtils.lerp(
      desiredLatOffset,
      carAheadToDraft.lat,
      0.65 + slipstreamSkill * 0.3
    );
    nextState = 'slipstreaming';
  } else if (
    chaserBehind &&
    !ai.finished &&
    level.levelNumber >= 3 &&
    blockingChance > 0.25 &&
    maxFutureKappa < 0.006
  ) {
    // Move cleanly once toward inside defensive line while always leaving space outside
    const insideDir =
      upcomingCurv.absKappa > 0.004
        ? Math.sign(upcomingCurv.signedKappa)
        : Math.sign(chaserBehind.lat || 1);
    const defLat = THREE.MathUtils.clamp(
      insideDir * safeHalfWidth * 0.52,
      -safeHalfWidth,
      safeHalfWidth
    );
    desiredLatOffset = THREE.MathUtils.lerp(desiredLatOffset, defLat, 0.72);
    nextState = 'defending';
  }

  // Enforce side-by-side racing space so cars battle wheel-to-wheel without colliding intentionally
  if (sideBySideCar) {
    const minSideClearance = 3.15;
    if (Math.abs(desiredLatOffset - sideBySideCar.lat) < minSideClearance) {
      const pushSide = myLat >= sideBySideCar.lat ? 1 : -1;
      desiredLatOffset = THREE.MathUtils.clamp(
        sideBySideCar.lat + pushSide * minSideClearance,
        -safeHalfWidth,
        safeHalfWidth
      );
    }
  }

  // 5. Dodge track obstacles cleanly
  for (let i = 0; i < track.obstacles.length; i++) {
    const obs = track.obstacles[i];
    if (obs.hit) continue;
    const dx = obs.position.x - ai.position.x;
    const dz = obs.position.z - ai.position.z;
    if (dx * dx + dz * dz > 625) continue;
    const fwdDist = dx * steerSample.tangent.x + dz * steerSample.tangent.z;
    const obsLat =
      (obs.position.x - samples[curIdx].point.x) * samples[curIdx].right.x +
      (obs.position.z - samples[curIdx].point.z) * samples[curIdx].right.z;
    if (fwdDist > 1.5 && fwdDist < 26 && Math.abs(desiredLatOffset - obsLat) < 2.6) {
      const dodgeSide = obsLat >= 0 ? -1 : 1;
      desiredLatOffset = THREE.MathUtils.clamp(
        obsLat + dodgeSide * 3.1,
        -safeHalfWidth,
        safeHalfWidth
      );
    }
  }

  // Subtle corner wobble ONLY during rare low-level mistakes
  if (ai.aiMistakePenalty < 0.99) {
    desiredLatOffset += Math.sin(ai.trackDistanceMeters * 0.14) * 0.95;
  }

  desiredLatOffset = THREE.MathUtils.clamp(desiredLatOffset, -safeHalfWidth, safeHalfWidth);

  if (ai.finished) {
    nextState = 'finished';
  } else if (ai.recoverFadeTimer > 0) {
    nextState = 'recovering';
  }
  ai.aiState = nextState;

  // 6. Compute world target & steering angle
  const targetPos = _steerVec
    .copy(steerSample.point)
    .addScaledVector(steerSample.right, desiredLatOffset);

  const dx = targetPos.x - ai.position.x;
  const dz = targetPos.z - ai.position.z;
  const desiredYaw = Math.atan2(dx, dz);

  let yawDiff = desiredYaw - ai.yaw;
  while (yawDiff > Math.PI) yawDiff -= Math.PI * 2;
  while (yawDiff < -Math.PI) yawDiff += Math.PI * 2;

  const steerGain = 1.85 + (skill?.skillNorm ?? 0.35) * 0.3;
  const steer = THREE.MathUtils.clamp(-yawDiff * steerGain, -1, 1);

  // 7. Smooth Throttle, Progressive Braking & Corner-Exit Handbrake Feathering
  const speedExcessMs = ai.speedMs - desiredSafeSpeedMs;
  let brake = 0;
  let throttle = 1.0;

  if (speedExcessMs > 1.0) {
    brake = THREE.MathUtils.clamp(speedExcessMs / 9.5, 0.18, 0.88);
    throttle = 0.08;
  } else if (speedExcessMs > -2.5 && localCurv.absKappa > 0.014) {
    // Trail-feather throttle through apex so tires maintain lateral grip cleanly
    throttle = ai.aiStyle === 'aggressive' ? 0.82 : 0.72;
  } else {
    throttle = THREE.MathUtils.clamp(
      (skill?.throttleMastery ?? 0.98) * ai.aiMistakePenalty,
      0.92,
      1.0
    );
  }

  // Helpful subtle drift rotation only on sharp hairpins when rotating into the apex
  const useDriftHelp =
    localCurv.absKappa > 0.024 &&
    Math.abs(yawDiff) > 0.36 &&
    ai.speedMs > desiredSafeSpeedMs * 0.92 &&
    ai.aiStyle === 'aggressive';

  // Smart nitro usage on straights or exits (AI speed strictly remains capped at calculated constant!)
  const useNitro =
    !ai.finished &&
    brake < 0.05 &&
    maxFutureKappa < 0.0038 &&
    ai.nitro > 32 &&
    (nextState === 'overtaking' ||
      nextState === 'slipstreaming' ||
      ai.speedKmh < ai.topSpeedKmh * 0.88);

  return {
    throttle,
    brake,
    steer,
    handbrake: useDriftHelp,
    nitro: useNitro,
  };
}

/**
 * Oriented two-sphere (front axle + rear axle) bumper collision resolver:
 * Realistic bumper nudges and side-by-side rubbing without flipping, sticking, or overlapping.
 */
export function resolveCarToCarCollisions(
  vehicles: VehicleBody[],
  onCarHit?: (intensity: number, pos: THREE.Vector3, involvesPlayer: boolean) => void,
  collisionDamageMult = 1
): void {
  const sphereRadius = 1.02;
  const minDist = sphereRadius * 2;
  const minDistSq = minDist * minDist;
  const axleOffset = 1.15;

  for (let i = 0; i < vehicles.length; i++) {
    const a = vehicles[i];
    if (a.finished) continue;
    const aFwdX = Math.sin(a.yaw);
    const aFwdZ = Math.cos(a.yaw);

    for (let j = i + 1; j < vehicles.length; j++) {
      const b = vehicles[j];
      if (b.finished) continue;

      // Quick center-distance broadphase (< 5.2m)
      const cdx = b.position.x - a.position.x;
      const cdz = b.position.z - a.position.z;
      if (cdx * cdx + cdz * cdz > 27.04) continue;

      const bFwdX = Math.sin(b.yaw);
      const bFwdZ = Math.cos(b.yaw);

      let deepestPen = 0;
      let bestNx = 0;
      let bestNz = 0;
      let bestCx = (a.position.x + b.position.x) * 0.5;
      let bestCz = (a.position.z + b.position.z) * 0.5;

      // Test front & rear bumper spheres of both cars
      for (const sa of [-axleOffset, axleOffset]) {
        const ax = a.position.x + aFwdX * sa;
        const az = a.position.z + aFwdZ * sa;
        for (const sb of [-axleOffset, axleOffset]) {
          const bx = b.position.x + bFwdX * sb;
          const bz = b.position.z + bFwdZ * sb;
          const dx = bx - ax;
          const dz = bz - az;
          const dSq = dx * dx + dz * dz;
          if (dSq < minDistSq && dSq > 0.0001) {
            const d = Math.sqrt(dSq);
            const pen = minDist - d;
            if (pen > deepestPen) {
              deepestPen = pen;
              bestNx = dx / d;
              bestNz = dz / d;
              bestCx = (ax + bx) * 0.5;
              bestCz = (az + bz) * 0.5;
            }
          }
        }
      }

      if (deepestPen > 0.001) {
        const push = deepestPen * 0.52;
        a.position.x -= bestNx * push;
        a.position.z -= bestNz * push;
        b.position.x += bestNx * push;
        b.position.z += bestNz * push;

        const rvx = b.velocity.x - a.velocity.x;
        const rvz = b.velocity.z - a.velocity.z;
        const relVelAlongNormal = rvx * bestNx + rvz * bestNz;

        if (relVelAlongNormal < 0) {
          // Mild bumper impulse (keeps wheel-to-wheel racing physical & never flings cars)
          const impulse = -relVelAlongNormal * 0.62;
          a.velocity.x -= bestNx * impulse;
          a.velocity.z -= bestNz * impulse;
          b.velocity.x += bestNx * impulse;
          b.velocity.z += bestNz * impulse;

          const intensity = Math.min(1, Math.abs(relVelAlongNormal) / 20);
          if (intensity > 0.12 && (a.carHitCooldown <= 0 || b.carHitCooldown <= 0)) {
            a.carHitCooldown = 0.25;
            b.carHitCooldown = 0.25;

            const contactPos = _steerVec.set(
              bestCx,
              (a.position.y + b.position.y) * 0.5 + 0.45,
              bestCz
            );

            // Realistic small 1-3% damage per contact
            const bodyDmg = THREE.MathUtils.clamp(1.0 + intensity * 2.0, 1.0, 3.0) * collisionDamageMult;
            if (a.isPlayer) {
              a.damage.body = Math.min(100, a.damage.body + bodyDmg);
              a.damage.engine = Math.min(100, a.damage.engine + bodyDmg * 0.45);
            }
            if (b.isPlayer) {
              b.damage.body = Math.min(100, b.damage.body + bodyDmg);
              b.damage.engine = Math.min(100, b.damage.engine + bodyDmg * 0.45);
            }

            onCarHit?.(intensity, contactPos, a.isPlayer || b.isPlayer);
          }
        }
      }
    }
  }
}
