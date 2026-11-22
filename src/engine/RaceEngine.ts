import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { getCarDisplayName } from '../data/brandConfig';
import { CAR_ORDER, CAR_SPECS } from '../data/cars';
import { AI_RIVAL_VARIATION_RANGE, computeMatchedRivalStats } from '../data/difficulty';
import { BIOME_META } from '../data/levels';
import {
  CameraMode,
  CarId,
  GameSettings,
  GhostConfig,
  GhostSample,
  LevelConfig,
  OwnedCarState,
  QualityPreset,
  RaceResult,
  RaceStanding,
  RaceTelemetry,
} from '../types/game';
import { SoundEngine } from '../audio/SoundEngine';
import { BuiltCarRig, buildSupercarModel } from './CarBuilder';
import { ParticleSystem } from './ParticleSystem';
import {
  AiDrivingStyle,
  computeAiInput,
  createVehicleBody,
  resolveCarToCarCollisions,
  stepVehiclePhysics,
  VehicleBody,
  VehicleInput,
} from './PhysicsEngine';
import { GeneratedTrack, generateProceduralTrack } from './TrackGenerator';
import { createSafeWebGLRenderer, probeWebGL } from './webglSupport';
import {
  buildRaceStandings,
  calculatePlayerPosition,
  computePositionPoints,
} from '../utils/raceStandings';
import {
  buildProceduralGhostSamples,
  downsampleGhostSamples,
  estimateGhostTimeAtProgress,
  evaluateGhostPose,
} from '../utils/ghost';

export interface ExternalControlInput {
  throttle: number;
  brake: number;
  steer: number;
  handbrake: boolean;
  nitro: boolean;
  horn: boolean;
}

export function detectSoftwareGl(): boolean {
  return probeWebGL().isSoftwareGl;
}

export function resolveQualityPreset(preset: QualityPreset, isSoftwareGl: boolean): 'low' | 'medium' | 'high' | 'ultra' {
  if (isSoftwareGl) return 'low';
  if (preset !== 'auto') return preset;
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || window.innerWidth <= 920;
  return isMobile ? 'medium' : 'high';
}

export class RaceEngine {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer | null = null;
  private fallback2dCanvas: HTMLCanvasElement | null = null;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private rearMirrorCamera: THREE.PerspectiveCamera;
  private composer: EffectComposer | null = null;
  private bloomPass: UnrealBloomPass | null = null;

  private isSoftwareGl: boolean;
  private resolvedQuality: 'low' | 'medium' | 'high' | 'ultra';
  private frameId = 0;
  private disposed = false;

  private level: LevelConfig;
  private track: GeneratedTrack;
  private particles: ParticleSystem;
  private vehicles: VehicleBody[] = [];
  private rigs = new Map<string, BuiltCarRig>();
  private playerBody!: VehicleBody;
  private playerRig!: BuiltCarRig;
  private ownedCarState: OwnedCarState;

  private settings: GameSettings;
  private sound: SoundEngine;
  private onTelemetry: (t: RaceTelemetry) => void;
  private onFinish: (res: RaceResult) => void;
  private onStandingsUpdate?: (standings: RaceStanding[]) => void;
  private onPauseRequested: () => void;

  private cameraMode: CameraMode = 'chase';
  private headlightsMode: 0 | 1 | 2 = 1;
  private leftIndicator = false;
  private rightIndicator = false;
  private hazardLights = false;
  private paused = false;
  private awaitingIntroStart = false;
  private hitstopTimer = 0;
  private cameraShake = 0;

  private countdown = 3;
  private countdownTimer = 0;
  private raceTimeSec = 0;
  private checkpointTimeLeftSec: number | null = null;
  private playerFinishTimeSec = 0;
  private cleanDrivingScore = 0;
  private driftScore = 0;
  private nitroUses = 0;
  private wasNitroActive = false;
  private checkpointNotice: string | null = null;
  private checkpointNoticeTimer = 0;

  private keyState = new Set<string>();
  private touchInput: ExternalControlInput = {
    throttle: 0,
    brake: 0,
    steer: 0,
    handbrake: false,
    nitro: false,
    horn: false,
  };
  private mouseSteer = 0;
  private smoothedSteer = 0;

  private clock = new THREE.Clock();
  private sunLight!: THREE.DirectionalLight;
  private camTargetPos = new THREE.Vector3();
  private camTargetLook = new THREE.Vector3();
  private _v1 = new THREE.Vector3();
  private _v2 = new THREE.Vector3();
  private _v3 = new THREE.Vector3();

  private fpsSamples: number[] = [];
  private lastBeepStep = 4;
  private raceFinished = false;

  // Personal-best Ghost state (zero-GC during loop)
  private ghostConfig: GhostConfig | null = null;
  private ghostSamples: GhostSample[] = [];
  private ghostRig: BuiltCarRig | null = null;
  private ghostWheelRadius = 0.34;
  private ghostWheelSpinAngle = 0;
  private ghostFinished = false;
  private ghostDeltaSec: number | null = null;
  private _ghostPos = new THREE.Vector3();

  // Player run recording for future ghost playback
  private recordedGhostSamples: GhostSample[] = [];
  private lastGhostRecordTimeSec = -1;

  constructor(params: {
    container: HTMLElement;
    level: LevelConfig;
    carId: CarId;
    ownedCarState: OwnedCarState;
    settings: GameSettings;
    sound: SoundEngine;
    ghostConfig?: GhostConfig | null;
    startPausedForIntro?: boolean;
    onTelemetry: (t: RaceTelemetry) => void;
    onFinish: (res: RaceResult) => void;
    onStandingsUpdate?: (standings: RaceStanding[]) => void;
    onPauseRequested: () => void;
  }) {
    this.container = params.container;
    this.level = params.level;
    this.checkpointTimeLeftSec = params.level.checkpointTimeLimitSec ?? null;
    this.ownedCarState = params.ownedCarState;
    this.settings = params.settings;
    this.sound = params.sound;
    this.ghostConfig = params.ghostConfig ?? null;
    this.awaitingIntroStart = Boolean(params.startPausedForIntro);
    this.onTelemetry = params.onTelemetry;
    this.onFinish = params.onFinish;
    this.onStandingsUpdate = params.onStandingsUpdate;
    this.onPauseRequested = params.onPauseRequested;

    const probe = probeWebGL();
    this.isSoftwareGl = probe.isSoftwareGl;
    this.resolvedQuality = resolveQualityPreset(params.settings.quality, this.isSoftwareGl);

    // 1. Safe Renderer setup with 2D fallback when WebGL is disabled
    const webglRenderer = probe.supported
      ? createSafeWebGLRenderer(this.resolvedQuality !== 'low', this.isSoftwareGl)
      : null;
    this.renderer = webglRenderer;

    this.container.innerHTML = '';
    if (webglRenderer) {
      webglRenderer.outputColorSpace = THREE.SRGBColorSpace;
      webglRenderer.toneMapping = THREE.ACESFilmicToneMapping;
      webglRenderer.toneMappingExposure = this.level.timeOfDay === 'night' ? 1.15 : 1.05;
      const maxPr = this.resolvedQuality === 'ultra' ? 2 : this.resolvedQuality === 'high' ? 1.5 : 1;
      webglRenderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, maxPr));
      webglRenderer.shadowMap.enabled = !this.isSoftwareGl && this.resolvedQuality !== 'low';
      webglRenderer.shadowMap.type = THREE.PCFSoftShadowMap;
      webglRenderer.setSize(this.container.clientWidth, Math.max(1, this.container.clientHeight));
      webglRenderer.domElement.addEventListener('webglcontextlost', this.handleContextLost);
      this.container.appendChild(webglRenderer.domElement);
    } else {
      const c2d = document.createElement('canvas');
      c2d.width = Math.max(320, this.container.clientWidth);
      c2d.height = Math.max(240, this.container.clientHeight);
      c2d.style.width = '100%';
      c2d.style.height = '100%';
      c2d.style.display = 'block';
      this.fallback2dCanvas = c2d;
      this.container.appendChild(c2d);
    }

    // 2. Scene & RoomEnvironment reflections
    this.scene = new THREE.Scene();
    const skyColor = new THREE.Color(BIOME_META[this.level.biome].skyHex);
    this.scene.background = skyColor;
    const fogDensity =
      this.level.weather === 'fog'
        ? 0.014
        : this.level.weather === 'snow'
          ? 0.0085
          : this.level.timeOfDay === 'night'
            ? 0.0055
            : 0.0032;
    this.scene.fog = new THREE.FogExp2(skyColor.getHex(), fogDensity);

    if (webglRenderer) {
      const pmrem = new THREE.PMREMGenerator(webglRenderer);
      this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
      pmrem.dispose();
    }

    // 3. Cameras
    const aspect = Math.max(0.5, this.container.clientWidth / Math.max(1, this.container.clientHeight));
    this.camera = new THREE.PerspectiveCamera(65, aspect, 0.2, 1100);
    this.rearMirrorCamera = new THREE.PerspectiveCamera(58, 2.6, 0.3, 450);

    // 4. Lighting Rig
    this.setupLighting();

    // 5. Track & Particles
    const propBudget =
      this.resolvedQuality === 'ultra'
        ? 1.0
        : this.resolvedQuality === 'high'
          ? 0.85
          : this.resolvedQuality === 'medium'
            ? 0.6
            : 0.45;
    const maxAniso = webglRenderer ? webglRenderer.capabilities.getMaxAnisotropy() : 1;
    this.track = generateProceduralTrack(this.level, propBudget, maxAniso);
    this.scene.add(this.track.group);

    this.particles = new ParticleSystem(this.level.weather, propBudget);
    this.scene.add(this.particles.group);

    // 6. Spawn Player + AI Rivals on Starting Grid & Personal-Best Ghost
    this.spawnGrid(params.carId);
    this.setupGhost();

    // 7. Post-processing Bloom on High / Ultra GPU
    if (webglRenderer && !this.isSoftwareGl && (this.resolvedQuality === 'high' || this.resolvedQuality === 'ultra')) {
      this.composer = new EffectComposer(webglRenderer);
      this.composer.addPass(new RenderPass(this.scene, this.camera));
      this.bloomPass = new UnrealBloomPass(
        new THREE.Vector2(this.container.clientWidth, this.container.clientHeight),
        this.level.timeOfDay === 'night' ? 0.55 : 0.22,
        0.35,
        0.88
      );
      this.composer.addPass(this.bloomPass);
    }

    // Pre-warm shaders on GPU
    if (webglRenderer && !this.isSoftwareGl) {
      webglRenderer.compile(this.scene, this.camera);
    }

    // Bind Listeners
    window.addEventListener('resize', this.handleResize);
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('blur', this.handleBlur);
    window.addEventListener('mousemove', this.handleMouseMove);

    // Start Sound & Countdown (or hold behind Race Intro until Start Race is pressed)
    this.headlightsMode = this.level.timeOfDay === 'night' || this.level.weather === 'fog' ? 2 : 1;
    if (!this.awaitingIntroStart) {
      this.sound.startRaceAudio(this.playerBody.spec.engineType);
    }
    this.clock.start();
    this.tick();
  }

  public beginRaceCountdown(): void {
    if (!this.awaitingIntroStart || this.disposed) return;
    this.awaitingIntroStart = false;
    this.countdown = 3;
    this.countdownTimer = 0;
    this.lastBeepStep = 4;
    this.clock.getDelta();

    const p = this.playerBody;
    const fwd = this._v1.set(Math.sin(p.yaw), 0, Math.cos(p.yaw));
    this.camTargetPos.copy(p.position).addScaledVector(fwd, -7.2).add(new THREE.Vector3(0, 2.7, 0));
    this.camera.position.copy(this.camTargetPos);
    this.camTargetLook.copy(p.position).addScaledVector(fwd, 9);
    this.camera.lookAt(this.camTargetLook);

    this.sound.startRaceAudio(p.spec.engineType);
  }

  private setupLighting(): void {
    const isNight = this.level.timeOfDay === 'night';
    const isSunset = this.level.timeOfDay === 'sunset';

    const hemi = new THREE.HemisphereLight(
      isNight ? 0x1e293b : isSunset ? 0xfdba74 : 0xbae6fd,
      isNight ? 0x090d16 : 0x334155,
      isNight ? 0.65 : 0.9
    );
    this.scene.add(hemi);

    this.sunLight = new THREE.DirectionalLight(
      isNight ? 0x60a5fa : isSunset ? 0xfb923c : 0xfff7ed,
      isNight ? 0.75 : isSunset ? 1.55 : 1.85
    );
    this.sunLight.position.set(45, isSunset ? 28 : 68, 40);
    if (!this.isSoftwareGl && this.resolvedQuality !== 'low') {
      this.sunLight.castShadow = true;
      const sz = this.resolvedQuality === 'ultra' ? 2048 : 1024;
      this.sunLight.shadow.mapSize.set(sz, sz);
      const d = 52;
      this.sunLight.shadow.camera.left = -d;
      this.sunLight.shadow.camera.right = d;
      this.sunLight.shadow.camera.top = d;
      this.sunLight.shadow.camera.bottom = -d;
      this.sunLight.shadow.camera.near = 1;
      this.sunLight.shadow.camera.far = 160;
      this.sunLight.shadow.bias = -0.0005;
      this.sunLight.shadow.normalBias = 0.02;
    }
    this.scene.add(this.sunLight);
    this.scene.add(this.sunLight.target);

    const rimLight = new THREE.DirectionalLight(0x93c5fd, isNight ? 0.45 : 0.35);
    rimLight.position.set(-40, 30, -40);
    this.scene.add(rimLight);
  }

  private spawnGrid(playerCarId: CarId): void {
    const startSample = this.track.samples[0];
    const startYaw = Math.atan2(startSample.tangent.x, startSample.tangent.z);
    const totalCars = 1 + this.level.rivalCount;

    const playerSpec = CAR_SPECS[playerCarId];
    const matched = computeMatchedRivalStats(
      playerSpec,
      this.ownedCarState,
      this.level.levelNumber,
      this.settings.difficultySetting
    );

    // Seeded pseudo-random generator so each race draws fresh rival names, colors, models, and styles
    let rng = (this.level.seed * 1664525 + 1013904223) >>> 0;
    const nextRand = () => {
      rng = (rng * 1664525 + 1013904223) >>> 0;
      return rng / 4294967296;
    };

    const driverNames = [
      'Kaito_R',
      'ElenaGT',
      'Veloce_V12',
      'SiennaApex',
      'Max_K',
      'Dante_RS',
      'NovaEV',
      'RicoTurbo',
      'Zara_X',
      'ViktorGT',
      'Aria_V8',
      'LeonDrift',
    ];
    for (let i = driverNames.length - 1; i > 0; i--) {
      const j = Math.floor(nextRand() * (i + 1));
      [driverNames[i], driverNames[j]] = [driverNames[j], driverNames[i]];
    }

    const aiPalette = [
      '#ef4444',
      '#f59e0b',
      '#0ea5e9',
      '#10b981',
      '#e2e8f0',
      '#8b5cf6',
      '#f97316',
      '#ec4899',
      '#14b8a6',
    ];
    for (let i = aiPalette.length - 1; i > 0; i--) {
      const j = Math.floor(nextRand() * (i + 1));
      [aiPalette[i], aiPalette[j]] = [aiPalette[j], aiPalette[i]];
    }

    const styles: AiDrivingStyle[] = ['clean', 'aggressive', 'blocker'];
    const playerIdx = CAR_ORDER.indexOf(playerCarId);

    for (let slot = 0; slot < totalCars; slot++) {
      const isPlayer = slot === totalCars - 1;
      const row = Math.floor(slot / 2);
      const col = slot % 2 === 0 ? -1 : 1;
      const backDist = 6 + row * 7.5;
      const latDist = col * 3.1;

      const pos = startSample.point
        .clone()
        .addScaledVector(startSample.tangent, -backDist)
        .addScaledVector(startSample.right, latDist);

      // Pick varied supercar models anchored around the player's car tier + surprise faster/slower picks
      const tierOffset = Math.floor(nextRand() * 7) - 3;
      const pickedIdx = Math.max(0, Math.min(CAR_ORDER.length - 1, playerIdx + tierOffset));
      const carId = isPlayer ? playerCarId : CAR_ORDER[pickedIdx];
      const spec = CAR_SPECS[carId];

      const paintHex = aiPalette[slot % aiPalette.length];
      const customization = isPlayer
        ? this.ownedCarState.customization
        : {
            paintColor: paintHex,
            paintFinish: (nextRand() > 0.65 ? 'gloss' : 'metallic') as 'gloss' | 'metallic',
            rimStyle: spec.defaultRim,
            rimColor: nextRand() > 0.5 ? '#cbd5e1' : '#0f172a',
            tireStyle: 'semi_slick' as const,
            caliperColor: paintHex === '#ef4444' ? '#facc15' : '#ef4444',
            spoilerStyle: (nextRand() > 0.35 ? 'gt_wing' : 'lip') as 'gt_wing' | 'lip',
            bodyKit: (nextRand() > 0.5 ? 'sport' : 'stock') as 'sport' | 'stock',
            windowTint: 0.55,
            underglowEnabled: this.level.timeOfDay === 'night',
            underglowColor: paintHex,
            unlockedItems: [],
          };

      const variation = 1 + (nextRand() * 2 - 1) * AI_RIVAL_VARIATION_RANGE;
      const aiStyle =
        this.level.levelNumber >= 4
          ? styles[slot % styles.length]
          : nextRand() > 0.45
            ? 'clean'
            : 'aggressive';

      const body = createVehicleBody(
        isPlayer ? 'player' : `ai_${slot}`,
        carId,
        isPlayer,
        pos,
        startYaw,
        isPlayer ? this.ownedCarState : undefined,
        variation,
        isPlayer ? 'You' : driverNames[slot % driverNames.length],
        this.track,
        isPlayer
          ? undefined
          : {
              matchedMaxSpeedMs: matched.rivalTargetTopSpeedKmh / 3.6,
              matchedAccelMult: matched.rivalAccelScale,
              matchedGripMult: matched.rivalGripScale,
              aiStyle,
            }
      );

      const rig = buildSupercarModel(carId, customization, {
        enableSpotLights: isPlayer && !this.isSoftwareGl,
        isPlayer,
        useLod: !isPlayer,
      });
      rig.root.position.copy(pos);
      rig.root.rotation.y = startYaw;
      this.scene.add(rig.root);

      this.vehicles.push(body);
      this.rigs.set(body.id, rig);
      if (isPlayer) {
        this.playerBody = body;
        this.playerRig = rig;
      }
    }

    // Snap initial camera behind player
    const fwd = new THREE.Vector3(Math.sin(startYaw), 0, Math.cos(startYaw));
    this.camTargetPos.copy(this.playerBody.position).addScaledVector(fwd, -7.2).add(new THREE.Vector3(0, 2.7, 0));
    this.camera.position.copy(this.camTargetPos);
    this.camTargetLook.copy(this.playerBody.position).addScaledVector(fwd, 9);
    this.camera.lookAt(this.camTargetLook);
  }

  private setupGhost(): void {
    if (!this.ghostConfig || !Number.isFinite(this.ghostConfig.bestTimeSec) || this.ghostConfig.bestTimeSec <= 0) {
      return;
    }

    const carId = CAR_SPECS[this.ghostConfig.carId] ? this.ghostConfig.carId : this.playerBody.carId;
    const spec = CAR_SPECS[carId];
    this.ghostWheelRadius = spec.stats.wheelRadius;

    this.ghostSamples =
      this.ghostConfig.samples && this.ghostConfig.samples.length >= 2
        ? this.ghostConfig.samples
        : buildProceduralGhostSamples(
            this.track.samples,
            this.track.totalLength,
            this.level.laps,
            this.ghostConfig.bestTimeSec
          );

    this.ghostRig = buildSupercarModel(
      carId,
      {
        paintColor: '#38bdf8',
        paintFinish: 'metallic',
        rimStyle: spec.defaultRim,
        rimColor: '#bae6fd',
        tireStyle: 'racing_slick',
        caliperColor: '#22d3ee',
        spoilerStyle: carId === 'porsche_gt3' || carId === 'lamborghini_svj' ? 'gt_wing' : 'lip',
        bodyKit: 'sport',
        windowTint: 0.35,
        underglowEnabled: false,
        underglowColor: '#38bdf8',
        unlockedItems: [],
      },
      {
        enableSpotLights: false,
        isPlayer: false,
        isGhost: true,
      }
    );

    // Position ghost at initial start frame
    this.updateGhost(0);
    this.ghostRig.root.visible = this.settings.showGhost !== false;
    this.scene.add(this.ghostRig.root);
    console.log(
      `[DK Car Race][Ghost] Spawned personal best ghost (${getCarDisplayName(spec)}, PB ${this.ghostConfig.bestTimeSec.toFixed(2)}s, ${
        this.ghostConfig.samples ? 'recorded telemetry' : 'procedural pace'
      })`
    );
  }

  private recordPlayerGhostSample(force = false): void {
    if (!force && this.raceTimeSec - this.lastGhostRecordTimeSec < 0.22) {
      return;
    }
    this.lastGhostRecordTimeSec = this.raceTimeSec;

    const p = this.playerBody;
    const nearest = this.track.getNearestSample(p.position, p.trackHintIndex);
    const tangentYaw = Math.atan2(nearest.sample.tangent.x, nearest.sample.tangent.z);
    let yawOffset = p.yaw - tangentYaw;
    while (yawOffset > Math.PI) yawOffset -= Math.PI * 2;
    while (yawOffset < -Math.PI) yawOffset += Math.PI * 2;

    this.recordedGhostSamples.push({
      tSec: Number(this.raceTimeSec.toFixed(3)),
      progress: Number(p.totalProgress.toFixed(5)),
      lat: Number(nearest.lateralOffset.toFixed(3)),
      yawOffset: Number(yawOffset.toFixed(4)),
      pitch: Number(p.bodyPitch.toFixed(4)),
      roll: Number(p.bodyRoll.toFixed(4)),
      speedMs: Number(Math.max(0, p.speedMs).toFixed(2)),
      nitro: p.nitroActive,
    });
  }

  private updateGhost(dt: number): void {
    if (!this.ghostRig || this.ghostSamples.length < 2) return;

    const visible = this.settings.showGhost !== false;
    this.ghostRig.root.visible = visible;

    const evalTime = this.countdown < 0 ? this.raceTimeSec : 0;
    const pose = evaluateGhostPose(
      this.ghostSamples,
      this.track.samples,
      evalTime,
      this.level.laps,
      this._ghostPos
    );

    this.ghostFinished = pose.finished;
    this.ghostRig.root.position.copy(this._ghostPos);
    this.ghostRig.root.rotation.set(pose.pitch, pose.yaw, pose.roll, 'YXZ');

    if (dt > 0 && !pose.finished && this.countdown < 0) {
      this.ghostWheelSpinAngle += (pose.speedMs / this.ghostWheelRadius) * dt;
      for (let i = 0; i < this.ghostRig.wheelSpinGroups.length; i++) {
        this.ghostRig.wheelSpinGroups[i].rotation.x = this.ghostWheelSpinAngle;
      }
    }

    const showFlames = visible && pose.nitroActive && !pose.finished && this.countdown < 0;
    this.ghostRig.nitroFlameLeft.visible = showFlames;
    this.ghostRig.nitroFlameRight.visible = showFlames;
    if (showFlames) {
      const flicker = 0.85 + Math.random() * 0.35;
      this.ghostRig.nitroFlameLeft.scale.set(1, 1, flicker);
      this.ghostRig.nitroFlameRight.scale.set(1, 1, flicker);
    }

    // Subtle holographic shimmer & post-finish fade
    if (this.ghostRig.ghostMaterials) {
      const pulse = 0.94 + Math.sin(performance.now() * 0.0045) * 0.06;
      const factor = pose.opacityScale * pulse;
      for (let i = 0; i < this.ghostRig.ghostMaterials.length; i++) {
        const entry = this.ghostRig.ghostMaterials[i];
        entry.material.opacity = entry.baseOpacity * factor;
      }
    }

    if (this.countdown < 0 && this.raceTimeSec > 0.25) {
      const ghostAtPlayer = estimateGhostTimeAtProgress(
        this.ghostSamples,
        this.playerBody.totalProgress
      );
      this.ghostDeltaSec = ghostAtPlayer !== null ? this.raceTimeSec - ghostAtPlayer : null;
    } else {
      this.ghostDeltaSec = null;
    }
  }

  public setTouchInput(input: Partial<ExternalControlInput>): void {
    Object.assign(this.touchInput, input);
  }

  public setSettings(settings: GameSettings): void {
    this.settings = settings;
    this.sound.updateSettings(settings);
    if (this.ghostRig) {
      this.ghostRig.root.visible = settings.showGhost !== false;
    }
    const newQ = resolveQualityPreset(settings.quality, this.isSoftwareGl);
    if (newQ !== this.resolvedQuality && this.renderer) {
      this.resolvedQuality = newQ;
      const maxPr = newQ === 'ultra' ? 2 : newQ === 'high' ? 1.5 : 1;
      this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, maxPr));
      this.renderer.shadowMap.enabled = !this.isSoftwareGl && newQ !== 'low';
    }
  }

  public setPaused(paused: boolean): void {
    this.paused = paused;
    if (paused) {
      this.sound.stopRaceAudio();
    } else {
      this.clock.getDelta();
      if (!this.awaitingIntroStart && !this.raceFinished) {
        this.sound.startRaceAudio(this.playerBody.spec.engineType);
      }
    }
  }

  public cycleCamera(): void {
    const modes: CameraMode[] = ['chase', 'hood', 'cockpit', 'cinematic'];
    const idx = modes.indexOf(this.cameraMode);
    this.cameraMode = modes[(idx + 1) % modes.length];
  }

  public toggleHeadlights(): void {
    this.headlightsMode = ((this.headlightsMode + 1) % 3) as 0 | 1 | 2;
  }

  public toggleLeftIndicator(): void {
    this.leftIndicator = !this.leftIndicator;
    if (this.leftIndicator) this.rightIndicator = false;
    this.sound.playIndicatorClick(true);
  }

  public toggleRightIndicator(): void {
    this.rightIndicator = !this.rightIndicator;
    if (this.rightIndicator) this.leftIndicator = false;
    this.sound.playIndicatorClick(true);
  }

  public toggleHazardLights(): void {
    this.hazardLights = !this.hazardLights;
    this.sound.playIndicatorClick(this.hazardLights);
  }

  public resetPlayerToTrack(): void {
    const nearest = this.track.getNearestSample(this.playerBody.position, this.playerBody.trackHintIndex);
    this.playerBody.position.copy(nearest.sample.point);
    this.playerBody.yaw = Math.atan2(nearest.sample.tangent.x, nearest.sample.tangent.z);
    this.playerBody.velocity.set(0, 0, 0);
    this.playerBody.angularVel = 0;
  }

  private handleContextLost = (e: Event): void => {
    e.preventDefault();
    if (this.disposed) return;
    this.renderer?.domElement.removeEventListener('webglcontextlost', this.handleContextLost);
    this.renderer = null;
    this.composer = null;
    const c2d = document.createElement('canvas');
    c2d.width = Math.max(320, this.container.clientWidth);
    c2d.height = Math.max(240, this.container.clientHeight);
    c2d.style.width = '100%';
    c2d.style.height = '100%';
    c2d.style.display = 'block';
    this.container.innerHTML = '';
    this.container.appendChild(c2d);
    this.fallback2dCanvas = c2d;
  };

  private handleResize = (): void => {
    if (this.disposed) return;
    const w = this.container.clientWidth;
    const h = Math.max(1, this.container.clientHeight);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    if (this.renderer) {
      this.renderer.setSize(w, h);
    }
    if (this.fallback2dCanvas) {
      this.fallback2dCanvas.width = Math.max(320, w);
      this.fallback2dCanvas.height = Math.max(240, h);
    }
    if (this.composer) {
      this.composer.setSize(w, h);
    }
    if (this.bloomPass) {
      this.bloomPass.resolution.set(w, h);
    }
  };

  private handleKeyDown = (e: KeyboardEvent): void => {
    const code = e.code;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(code)) {
      e.preventDefault();
    }
    if (e.repeat) return;
    this.keyState.add(code);

    if (code === 'KeyC') this.cycleCamera();
    if (code === 'KeyL') this.toggleHeadlights();
    if (code === 'KeyR') this.resetPlayerToTrack();
    if (code === 'KeyQ') this.toggleLeftIndicator();
    if (code === 'KeyE') this.toggleRightIndicator();
    if (code === 'KeyX') this.toggleHazardLights();
    if (code === 'Escape') this.onPauseRequested();
  };

  private handleKeyUp = (e: KeyboardEvent): void => {
    this.keyState.delete(e.code);
  };

  private handleBlur = (): void => {
    this.keyState.clear();
    this.touchInput.horn = false;
    this.sound.setHorn(false);
  };

  private handleMouseMove = (e: MouseEvent): void => {
    if (!this.settings.mouseSteering || this.paused) return;
    const norm = (e.clientX / Math.max(1, window.innerWidth)) * 2 - 1;
    this.mouseSteer = THREE.MathUtils.clamp(norm * 1.35, -1, 1);
  };

  private readCombinedPlayerInput(): VehicleInput & { horn: boolean } {
    let throttle = this.touchInput.throttle;
    let brake = this.touchInput.brake;
    let steer = this.touchInput.steer;
    let handbrake = this.touchInput.handbrake;
    let nitro = this.touchInput.nitro;
    let horn = this.touchInput.horn;

    if (this.keyState.has('KeyW') || this.keyState.has('ArrowUp')) throttle = 1;
    if (this.keyState.has('KeyS') || this.keyState.has('ArrowDown')) brake = 1;
    if (this.keyState.has('KeyA') || this.keyState.has('ArrowLeft')) steer -= 1;
    if (this.keyState.has('KeyD') || this.keyState.has('ArrowRight')) steer += 1;
    if (this.keyState.has('Space')) handbrake = true;
    if (this.keyState.has('ShiftLeft') || this.keyState.has('ShiftRight')) nitro = true;
    if (this.keyState.has('KeyH')) horn = true;

    if (this.settings.mouseSteering && Math.abs(this.mouseSteer) > 0.05) {
      steer += this.mouseSteer;
    }

    // Gamepad API polling
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const gp = pads[0];
    if (gp) {
      const axisX = gp.axes[0] ?? 0;
      if (Math.abs(axisX) > this.settings.steeringDeadZone) {
        steer += axisX;
      }
      if (gp.buttons[7]?.value > 0.1) throttle = Math.max(throttle, gp.buttons[7].value);
      if (gp.buttons[6]?.value > 0.1) brake = Math.max(brake, gp.buttons[6].value);
      if (gp.buttons[0]?.pressed) handbrake = true;
      if (gp.buttons[1]?.pressed || gp.buttons[2]?.pressed) nitro = true;
    }

    // Dead zone & smooth steer
    const clampedSteer = Math.abs(steer) < this.settings.steeringDeadZone ? 0 : THREE.MathUtils.clamp(steer, -1, 1);
    this.smoothedSteer = THREE.MathUtils.damp(this.smoothedSteer, clampedSteer, 14, 0.016);

    return {
      throttle: THREE.MathUtils.clamp(throttle, 0, 1),
      brake: THREE.MathUtils.clamp(brake, 0, 1),
      steer: this.smoothedSteer,
      handbrake,
      nitro,
      horn,
    };
  }

  private tick = (): void => {
    if (this.disposed) return;

    const rawDt = this.clock.getDelta();
    const dt = Math.min(rawDt, 0.05);

    if (!this.paused) {
      this.updateSimulation(dt, rawDt);
    }

    this.renderFrame();

    if (this.renderer && this.isSoftwareGl) {
      this.afterDraw(this.tick);
    } else {
      this.frameId = requestAnimationFrame(this.tick);
    }
  };

  private afterDraw(cb: () => void): void {
    if (!this.renderer) {
      this.frameId = requestAnimationFrame(cb);
      return;
    }
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    const sync = gl.fenceSync ? gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0) : null;
    gl.flush();
    const poll = () => {
      if (this.disposed) return;
      const state = sync && gl.getSyncParameter ? gl.getSyncParameter(sync, gl.SYNC_STATUS) : 0;
      if (sync && state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  private updateSimulation(dt: number, rawDt: number): void {
    if (this.awaitingIntroStart) {
      const p = this.playerBody;
      const t = performance.now() * 0.00028;
      this.camera.position.set(
        p.position.x + Math.cos(t) * 14,
        p.position.y + 5.6,
        p.position.z + Math.sin(t) * 14
      );
      this.camera.lookAt(p.position.x, p.position.y + 1.0, p.position.z);
      this.particles.update(dt, this.camera.position, p.position);
      this.emitTelemetry();
      return;
    }

    if (this.hitstopTimer > 0) {
      this.hitstopTimer -= dt;
      return;
    }

    this.cameraShake = Math.max(0, this.cameraShake - dt * 2.8);
    if (this.checkpointNoticeTimer > 0) {
      this.checkpointNoticeTimer -= dt;
      if (this.checkpointNoticeTimer <= 0) this.checkpointNotice = null;
    }

    // Countdown sequence (3 -> 2 -> 1 -> GO!)
    if (this.countdown >= 0) {
      this.countdownTimer += dt;
      const nextStep = Math.ceil(3 - this.countdownTimer);
      if (nextStep !== this.lastBeepStep && nextStep >= 0 && nextStep <= 3) {
        this.lastBeepStep = nextStep;
        this.sound.playCountdownBeep(nextStep === 0);
      }
      this.countdown = Math.max(-1, Math.ceil(3 - this.countdownTimer));
      if (this.countdownTimer >= 3.7) {
        this.countdown = -1;
      }
    }

    const input = this.readCombinedPlayerInput();
    this.sound.setHorn(!this.raceFinished && input.horn);

    if (this.countdown < 0) {
      this.raceTimeSec += dt;

      // Update optional checkpoint countdown timer
      if (this.checkpointTimeLeftSec !== null && !this.raceFinished) {
        this.checkpointTimeLeftSec = Math.max(0, this.checkpointTimeLeftSec - dt);
        if (this.checkpointTimeLeftSec <= 0) {
          this.handlePlayerFinish(true);
          return;
        }
      }

      if (!this.raceFinished) {
        // Track nitro activations
        if (this.playerBody.nitroActive && !this.wasNitroActive) {
          this.nitroUses++;
        }
        this.wasNitroActive = this.playerBody.nitroActive;

        // Clean driving accumulation
        if (this.playerBody.speedKmh > 70 && !this.playerBody.drifting) {
          this.cleanDrivingScore += dt * 14;
        }
      }

      // Compute Slipstream aero draft & subtle fair rubber-banding per vehicle
      const playerDist = this.playerBody.trackDistanceMeters;
      for (let i = 0; i < this.vehicles.length; i++) {
        const v = this.vehicles[i];
        const vFwdX = Math.sin(v.yaw);
        const vFwdZ = Math.cos(v.yaw);
        const vRightX = Math.cos(v.yaw);
        const vRightZ = -Math.sin(v.yaw);

        let maxDraft = 0;
        if (!v.finished && v.speedKmh > 55) {
          for (let j = 0; j < this.vehicles.length; j++) {
            if (i === j) continue;
            const lead = this.vehicles[j];
            if (lead.finished) continue;
            const dx = lead.position.x - v.position.x;
            const dz = lead.position.z - v.position.z;
            const fwdDist = dx * vFwdX + dz * vFwdZ;
            const latDist = Math.abs(dx * vRightX + dz * vRightZ);
            if (fwdDist > 2.5 && fwdDist < 22 && latDist < 2.6) {
              const distStrength = 1 - Math.abs(fwdDist - 10) / 14;
              const latStrength = 1 - latDist / 2.6;
              maxDraft = Math.max(maxDraft, THREE.MathUtils.clamp(distStrength * latStrength, 0, 1));
            }
          }
        }
        v.slipstreamAmount = THREE.MathUtils.damp(v.slipstreamAmount, maxDraft, 7, dt);

        if (!v.isPlayer && !v.finished) {
          const gapMeters = playerDist - v.trackDistanceMeters;
          const targetRb =
            gapMeters > 55
              ? Math.min(1.055, 1 + (gapMeters - 55) * 0.0008)
              : gapMeters < -95
                ? 0.985
                : 1.0;
          v.aiRubberBandMult = THREE.MathUtils.damp(v.aiRubberBandMult ?? 1, targetRb, 2.5, dt);
        }
      }

      let playerJustFinished = false;
      let anyRivalJustFinished = false;
      for (const v of this.vehicles) {
        let vInput: VehicleInput;
        if (v.finished) {
          // Coast gently past the finish gantry along the track spline while keeping finish stats locked
          const cruise = computeAiInput(v, this.track, this.level, this.vehicles);
          vInput = {
            throttle: Math.min(0.32, cruise.throttle),
            brake: cruise.brake,
            steer: cruise.steer,
            handbrake: false,
            nitro: false,
          };
        } else {
          vInput = v.isPlayer ? input : computeAiInput(v, this.track, this.level, this.vehicles);
        }

        stepVehiclePhysics(
          v,
          vInput,
          dt,
          this.track,
          this.level,
          this.settings,
          v.isPlayer ? this.ownedCarState : undefined,
          this.raceTimeSec,
          {
            onCollision: (intensity, pos) => {
              if (v.isPlayer && !v.finished) {
                this.triggerImpact(intensity, pos);
              }
            },
            onCheckpoint: () => {
              this.sound.playCheckpointChime();
              if (this.level.checkpointTimeLimitSec !== null) {
                this.checkpointTimeLeftSec = this.level.checkpointTimeLimitSec;
                this.checkpointNotice = 'CHECKPOINT · TIME EXTENDED';
              } else {
                this.checkpointNotice = 'CHECKPOINT';
              }
              this.checkpointNoticeTimer = 1.4;
            },
            onLapComplete: (lapTime) => {
              this.sound.playCheckpointChime();
              if (this.level.checkpointTimeLimitSec !== null) {
                this.checkpointTimeLeftSec = this.level.checkpointTimeLimitSec + 5;
              }
              this.checkpointNotice = `LAP ${v.lap} · ${lapTime.toFixed(2)}s`;
              this.checkpointNoticeTimer = 2.0;
            },
            onFinish: () => {
              if (v.isPlayer) {
                playerJustFinished = true;
              } else {
                anyRivalJustFinished = true;
                console.log(
                  `[DK Car Race] ${v.driverName} (${v.carName}) crossed finish line at ${v.finishTimeSec.toFixed(2)}s`
                );
              }
            },
            onDriftMeters: (m) => {
              if (!this.raceFinished) this.driftScore += m;
            },
          }
        );
      }

      resolveCarToCarCollisions(
        this.vehicles,
        (intensity, pos) => {
          if (!this.raceFinished) this.triggerImpact(intensity, pos);
        },
        this.level.collisionDamageMult ?? 1
      );

      // Record initial and periodic keyframes for future personal-best ghost runs
      if (!this.playerBody.finished) {
        this.recordPlayerGhostSample(this.recordedGhostSamples.length === 0);
      }

      if (playerJustFinished) {
        this.handlePlayerFinish(false);
      } else if (anyRivalJustFinished && this.raceFinished && this.onStandingsUpdate) {
        const updatedStandings = buildRaceStandings(
          this.vehicles,
          this.level.laps,
          this.track.totalLength,
          this.level.rivalSkill,
          this.playerFinishTimeSec
        );
        this.onStandingsUpdate(updatedStandings);
      }
    } else {
      // Allow revving engine on grid during countdown!
      const idle = this.playerBody.spec.stats.idleRpm;
      const red = this.playerBody.spec.stats.redlineRpm;
      const targetRev = idle + input.throttle * (red * 0.72 - idle);
      this.playerBody.rpm = THREE.MathUtils.damp(this.playerBody.rpm, targetRev, 8, dt);
    }

    // Update Personal-Best Ghost car transform, wheels & split delta
    this.updateGhost(dt);

    // Update 3D car rigs, lights, wheels, wipers, and particles
    const blinkOn = Math.floor(performance.now() / 360) % 2 === 0;
    const isRain = this.level.weather === 'rain';
    const wiperAngle = isRain ? Math.sin(performance.now() * 0.008) * 0.52 : 0;

    for (const v of this.vehicles) {
      const rig = this.rigs.get(v.id);
      if (!rig) continue;

      rig.root.position.copy(v.position);
      rig.root.rotation.set(v.bodyPitch, v.yaw, v.bodyRoll, 'YXZ');

      // Spin wheels & steer front knuckles
      rig.frontSteerPivots[0].rotation.y = v.steerAngle;
      rig.frontSteerPivots[1].rotation.y = v.steerAngle;
      rig.wheelSpinGroups.forEach((wg) => {
        wg.rotation.x = v.wheelSpinAngle;
      });
      rig.steeringWheel.rotation.z = -v.steerAngle * 2.4;

      // Wipers in rain
      rig.leftWiper.rotation.z = wiperAngle;
      rig.rightWiper.rotation.z = wiperAngle;

      // Nitro exhaust flames
      rig.nitroFlameLeft.visible = v.nitroActive;
      rig.nitroFlameRight.visible = v.nitroActive;
      if (v.nitroActive) {
        const flicker = 0.85 + Math.random() * 0.4;
        rig.nitroFlameLeft.scale.set(1, 1, flicker);
        rig.nitroFlameRight.scale.set(1, 1, flicker);
      }

      if (v.isPlayer) {
        // Headlights
        const hlIntensity = this.headlightsMode === 2 ? 4.2 : this.headlightsMode === 1 ? 2.1 : 0;
        rig.headlightMat.emissiveIntensity = this.headlightsMode === 2 ? 2.6 : this.headlightsMode === 1 ? 1.5 : 0.15;
        rig.beamConeLeft.visible = this.headlightsMode > 0 && (this.level.timeOfDay === 'night' || this.level.weather === 'fog');
        rig.beamConeRight.visible = rig.beamConeLeft.visible;
        if (rig.headlightSpotLeft && rig.headlightSpotRight) {
          rig.headlightSpotLeft.intensity = hlIntensity * 12;
          rig.headlightSpotRight.intensity = hlIntensity * 12;
        }

        // Brake lights
        const braking = input.brake > 0.1 || input.handbrake;
        rig.taillightMat.emissiveIntensity = braking ? 3.8 : this.headlightsMode > 0 ? 1.5 : 0.6;

        // Indicators & Hazards
        const leftOn = (this.leftIndicator || this.hazardLights) && blinkOn;
        const rightOn = (this.rightIndicator || this.hazardLights) && blinkOn;
        rig.leftIndicatorMat.emissiveIntensity = leftOn ? 2.8 : 0.05;
        rig.rightIndicatorMat.emissiveIntensity = rightOn ? 2.8 : 0.05;

        // Damage visual scratches & engine smoke
        const dmgMat = rig.damageOverlayMesh.material as THREE.MeshBasicMaterial;
        dmgMat.opacity = Math.min(0.85, (v.damage.body / 100) * 0.85);
        if (v.damage.engine > 42 && Math.random() < 0.35) {
          rig.hoodSmokeOrigin.getWorldPosition(this._v1);
          this.particles.spawnSmoke(this._v1.x, this._v1.y, this._v1.z, true, 0.55);
        }
      }

      // Tire smoke & skid marks when drifting
      if (v.drifting) {
        if (Math.random() < 0.65) {
          rig.exhaustOrigins[0].getWorldPosition(this._v1);
          rig.exhaustOrigins[1].getWorldPosition(this._v2);
          this.particles.spawnSmoke(this._v1.x, this._v1.y, this._v1.z, false, 0.72);
          this.particles.spawnSmoke(this._v2.x, this._v2.y, this._v2.z, false, 0.72);
          this.particles.spawnSkidMark(this._v1.x, v.position.y, this._v1.z, v.yaw);
          this.particles.spawnSkidMark(this._v2.x, v.position.y, this._v2.z, v.yaw);
        }
      }
    }

    // Update Shadow Light to follow player tightly
    this.sunLight.position.set(
      this.playerBody.position.x + 38,
      this.playerBody.position.y + (this.level.timeOfDay === 'sunset' ? 24 : 58),
      this.playerBody.position.z + 32
    );
    this.sunLight.target.position.copy(this.playerBody.position);

    // Update Camera
    this.updateCamera(dt);

    // Update Particles
    this.particles.update(dt, this.camera.position, this.playerBody.position);

    // Update Sound Engine
    if (!this.raceFinished) {
      this.sound.updateTelemetry({
        rpm: this.playerBody.rpm,
        idleRpm: this.playerBody.spec.stats.idleRpm,
        redlineRpm: this.playerBody.spec.stats.redlineRpm,
        gear: this.playerBody.gear,
        throttle: input.throttle,
        speedKmh: this.playerBody.speedKmh,
        slipRatio: this.playerBody.slipRatio,
        nitroActive: this.playerBody.nitroActive,
      });
    }

    // Emit HUD telemetry every frame so live race position & speed update immediately
    this.fpsSamples.push(1 / Math.max(0.001, rawDt));
    if (this.fpsSamples.length > 20) this.fpsSamples.shift();
    this.emitTelemetry();
  }

  private triggerImpact(intensity: number, pos: THREE.Vector3): void {
    this.sound.playCollision(intensity);
    this.particles.spawnSparkBurst(pos.x, pos.y + 0.5, pos.z, Math.floor(10 + intensity * 14));
    this.cameraShake = Math.min(0.65, this.cameraShake + intensity * 0.45);
    if (intensity > 0.55) {
      this.hitstopTimer = 0.035;
    }
    if (this.settings.vibrationFeedback && navigator.vibrate) {
      navigator.vibrate(Math.floor(30 + intensity * 70));
    }
  }

  private updateCamera(dt: number): void {
    const p = this.playerBody;
    const fwd = this._v1.set(Math.sin(p.yaw), 0, Math.cos(p.yaw));
    const right = this._v2.set(Math.cos(p.yaw), 0, -Math.sin(p.yaw));

    // Speed-responsive FOV widening
    const speedNorm = Math.min(1, p.speedKmh / 380);
    const targetFov =
      (this.cameraMode === 'cockpit' ? 72 : 62) + speedNorm * 14 + (p.nitroActive ? 7 : 0);
    this.camera.fov = THREE.MathUtils.damp(this.camera.fov, targetFov, 7, dt);
    this.camera.updateProjectionMatrix();

    if (this.cameraMode === 'chase') {
      const distBack = 6.8 + speedNorm * 1.1 + (p.nitroActive ? 0.6 : 0);
      this._v3
        .copy(p.position)
        .addScaledVector(fwd, -distBack)
        .addScaledVector(right, p.steerAngle * 0.9)
        .add(new THREE.Vector3(0, 2.55, 0));
      this.camTargetPos.lerp(this._v3, 1 - Math.exp(-11 * dt));
      this.camera.position.copy(this.camTargetPos);

      this._v3.copy(p.position).addScaledVector(fwd, 9.5).add(new THREE.Vector3(0, 0.9, 0));
      this.camTargetLook.lerp(this._v3, 1 - Math.exp(-14 * dt));
      this.camera.lookAt(this.camTargetLook);
    } else if (this.cameraMode === 'hood') {
      this.playerRig.hoodCameraAnchor.getWorldPosition(this.camera.position);
      this._v3.copy(p.position).addScaledVector(fwd, 20).add(new THREE.Vector3(0, 0.75, 0));
      this.camera.lookAt(this._v3);
    } else if (this.cameraMode === 'cockpit') {
      this.playerRig.cockpitCameraAnchor.getWorldPosition(this.camera.position);
      this._v3.copy(p.position).addScaledVector(fwd, 18).add(new THREE.Vector3(0, 0.9, 0));
      this.camera.lookAt(this._v3);
    } else {
      // Cinematic orbit sweep
      const t = performance.now() * 0.00055;
      this._v3
        .copy(p.position)
        .add(new THREE.Vector3(Math.cos(t) * 8.2, 3.2, Math.sin(t) * 8.2));
      this.camera.position.lerp(this._v3, 1 - Math.exp(-6 * dt));
      this.camera.lookAt(p.position.x, p.position.y + 0.7, p.position.z);
    }

    if (this.cameraShake > 0.01) {
      this.camera.position.x += (Math.random() - 0.5) * this.cameraShake;
      this.camera.position.y += (Math.random() - 0.5) * this.cameraShake * 0.7;
    }
  }

  private renderFrame(): void {
    if (!this.renderer) {
      this.renderFallback2D();
      return;
    }

    const w = this.container.clientWidth;
    const h = Math.max(1, this.container.clientHeight);

    this.renderer.setScissorTest(false);
    this.renderer.setViewport(0, 0, w, h);

    if (this.composer && !this.isSoftwareGl) {
      this.composer.render();
    } else {
      this.renderer.render(this.scene, this.camera);
    }

    // Live Rear-View Mirror Scissor Render at top-center (GPU only, High/Ultra/Medium)
    if (!this.isSoftwareGl && this.resolvedQuality !== 'low' && this.cameraMode !== 'cinematic') {
      const mw = Math.min(220, Math.floor(w * 0.24));
      const mh = Math.min(68, Math.floor(h * 0.12));
      const mx = Math.floor((w - mw) * 0.5);
      const my = h - mh - 14;

      this.playerRig.rearMirrorAnchor.getWorldPosition(this.rearMirrorCamera.position);
      const p = this.playerBody;
      this.rearMirrorCamera.aspect = mw / Math.max(1, mh);
      this.rearMirrorCamera.updateProjectionMatrix();
      this.rearMirrorCamera.lookAt(
        p.position.x - Math.sin(p.yaw) * 24,
        p.position.y + 1.1,
        p.position.z - Math.cos(p.yaw) * 24
      );

      this.renderer.setScissorTest(true);
      this.renderer.setScissor(mx, my, mw, mh);
      this.renderer.setViewport(mx, my, mw, mh);
      this.renderer.clearDepth();
      this.renderer.render(this.scene, this.rearMirrorCamera);
      this.renderer.setScissorTest(false);
    }
  }

  private renderFallback2D(): void {
    const canvas = this.fallback2dCanvas;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const p = this.playerBody;

    // Ground backdrop by biome
    const groundColors: Record<string, string> = {
      city: '#1d2722',
      desert: '#8f5f37',
      mountain: '#2c3c2f',
      coastal: '#1f4e78',
      snow: '#cbd5e1',
      night_neon: '#080b14',
    };
    ctx.fillStyle = groundColors[this.level.biome] ?? '#1a202c';
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.translate(w * 0.5, h * 0.56);
    // Rotate world so player car always points upward on screen
    ctx.rotate(p.yaw + Math.PI);
    const zoom = 7.2;
    ctx.scale(zoom, zoom);
    ctx.translate(-p.position.x, -p.position.z);

    // Track curb & asphalt ribbon
    const samples = this.track.samples;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = this.track.roadWidth + 2.2;
    ctx.beginPath();
    samples.forEach((s, i) => {
      if (i === 0) ctx.moveTo(s.point.x, s.point.z);
      else ctx.lineTo(s.point.x, s.point.z);
    });
    ctx.closePath();
    ctx.stroke();

    ctx.strokeStyle = this.level.biome === 'night_neon' ? '#141923' : '#262b34';
    ctx.lineWidth = this.track.roadWidth;
    ctx.stroke();

    // Dashed centerline
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 0.35;
    ctx.setLineDash([4, 4]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Start/Finish checkered bar
    const s0 = samples[0];
    ctx.save();
    ctx.translate(s0.point.x, s0.point.z);
    ctx.rotate(-Math.atan2(s0.tangent.x, s0.tangent.z));
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(-this.track.roadWidth * 0.5, -1.2, this.track.roadWidth, 2.4);
    ctx.restore();

    // Checkpoints
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 0.8;
    for (const cp of this.track.checkpoints) {
      ctx.save();
      ctx.translate(cp.position.x, cp.position.z);
      ctx.rotate(-Math.atan2(cp.tangent.x, cp.tangent.z));
      ctx.beginPath();
      ctx.moveTo(-this.track.roadWidth * 0.5, 0);
      ctx.lineTo(this.track.roadWidth * 0.5, 0);
      ctx.stroke();
      ctx.restore();
    }

    // Obstacles
    ctx.fillStyle = '#f97316';
    for (const obs of this.track.obstacles) {
      if (obs.hit) continue;
      ctx.beginPath();
      ctx.arc(obs.position.x, obs.position.z, 0.7, 0, Math.PI * 2);
      ctx.fill();
    }

    // Personal-best Ghost car (semi-transparent cyan silhouette in 2D fallback)
    if (this.ghostRig && this.ghostRig.root.visible) {
      ctx.save();
      ctx.globalAlpha = 0.42;
      ctx.translate(this.ghostRig.root.position.x, this.ghostRig.root.position.z);
      ctx.rotate(-this.ghostRig.root.rotation.y);
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(-1.05, -2.35, 2.1, 4.7);
      ctx.strokeStyle = '#e0f2fe';
      ctx.lineWidth = 0.22;
      ctx.strokeRect(-1.05, -2.35, 2.1, 4.7);
      ctx.restore();
    }

    // Vehicles
    for (const v of this.vehicles) {
      ctx.save();
      ctx.translate(v.position.x, v.position.z);
      ctx.rotate(-v.yaw);

      // Headlight beams when active
      if (v.isPlayer && this.headlightsMode > 0) {
        ctx.fillStyle = 'rgba(224, 242, 254, 0.22)';
        ctx.beginPath();
        ctx.moveTo(-0.7, 2.2);
        ctx.lineTo(-3.6, 15);
        ctx.lineTo(3.6, 15);
        ctx.lineTo(0.7, 2.2);
        ctx.closePath();
        ctx.fill();
      }

      // Car body
      ctx.fillStyle = v.isPlayer ? this.ownedCarState.customization.paintColor : '#38bdf8';
      ctx.fillRect(-1.05, -2.35, 2.1, 4.7);
      // Windshield
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-0.8, -0.4, 1.6, 1.4);
      // Nitro flames
      if (v.nitroActive) {
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(-0.55, -3.4, 0.35, 1.1);
        ctx.fillRect(0.2, -3.4, 0.35, 1.1);
      }
      ctx.restore();
    }

    ctx.restore();
  }

  private emitTelemetry(): void {
    const posRank = calculatePlayerPosition(this.vehicles);
    const avgDmg = Math.round(
      (this.playerBody.damage.body + this.playerBody.damage.engine + this.playerBody.damage.tires) / 3
    );

    const nearest = this.track.samples[this.playerBody.trackHintIndex];
    const fwdDot =
      Math.sin(this.playerBody.yaw) * nearest.tangent.x +
      Math.cos(this.playerBody.yaw) * nearest.tangent.z;
    const wrongWay = fwdDot < -0.35 && this.playerBody.speedKmh > 12;

    const avgFps =
      this.fpsSamples.length > 0
        ? Math.round(this.fpsSamples.reduce((a, b) => a + b, 0) / this.fpsSamples.length)
        : 60;

    this.onTelemetry({
      speedKmh: Math.round(this.playerBody.speedKmh),
      rpm: Math.round(this.playerBody.rpm),
      redlineRpm: this.playerBody.spec.stats.redlineRpm,
      gear: this.playerBody.gear,
      nitro: Math.round(this.playerBody.nitro),
      nitroActive: this.playerBody.nitroActive,
      slipstreaming: this.playerBody.slipstreamAmount > 0.12,
      slipstreamBoostPct: Math.round(this.playerBody.slipstreamAmount * 9),
      position: posRank,
      totalCars: this.vehicles.length,
      lap: this.playerBody.lap,
      totalLaps: this.level.laps,
      raceTimeSec: this.raceTimeSec,
      checkpointTimeLeftSec: this.checkpointTimeLeftSec,
      bestLapSec: this.playerBody.bestLapSec,
      countdown: this.countdown,
      headlightsMode: this.headlightsMode,
      leftIndicator: this.leftIndicator,
      rightIndicator: this.rightIndicator,
      hazardLights: this.hazardLights,
      wipersActive: this.level.weather === 'rain',
      handbrakeActive: this.touchInput.handbrake || this.keyState.has('Space'),
      drifting: this.playerBody.drifting,
      driftScore: Math.round(this.driftScore),
      cleanDrivingScore: Math.round(this.cleanDrivingScore),
      nitroUses: this.nitroUses,
      damagePct: avgDmg,
      cameraMode: this.cameraMode,
      wrongWay,
      checkpointNotice: this.checkpointNotice,
      fps: avgFps,
      ghostDeltaSec:
        this.ghostRig && this.ghostRig.root.visible ? this.ghostDeltaSec : null,
      ghostBestTimeSec:
        this.ghostRig && this.ghostRig.root.visible && this.ghostConfig
          ? this.ghostConfig.bestTimeSec
          : null,
      ghostFinished: this.ghostFinished,
      minimapData: {
        trackPoints: this.track.minimapPoints,
        bounds: this.track.minimapBounds,
        player: {
          x: this.playerBody.position.x,
          z: this.playerBody.position.z,
          yaw: this.playerBody.yaw,
        },
        rivals: this.vehicles
          .filter((v) => !v.isPlayer)
          .map((v) => ({ x: v.position.x, z: v.position.z })),
        ghost:
          this.ghostRig && this.ghostRig.root.visible
            ? {
                x: this.ghostRig.root.position.x,
                z: this.ghostRig.root.position.z,
              }
            : null,
      },
    });
  }

  private handlePlayerFinish(timedOut = false): void {
    if (this.raceFinished) return;
    this.raceFinished = true;
    this.cameraMode = 'cinematic';

    const playerFinishTime =
      this.playerBody.finishTimeSec > 0 ? this.playerBody.finishTimeSec : this.raceTimeSec;
    this.playerFinishTimeSec = playerFinishTime;

    // Append final exact finish keyframe for personal-best ghost recording
    const finishNearest = this.track.getNearestSample(
      this.playerBody.position,
      this.playerBody.trackHintIndex
    );
    const finishTanYaw = Math.atan2(
      finishNearest.sample.tangent.x,
      finishNearest.sample.tangent.z
    );
    let finishYawOff = this.playerBody.yaw - finishTanYaw;
    while (finishYawOff > Math.PI) finishYawOff -= Math.PI * 2;
    while (finishYawOff < -Math.PI) finishYawOff += Math.PI * 2;
    this.recordedGhostSamples.push({
      tSec: Number(playerFinishTime.toFixed(3)),
      progress: this.level.laps,
      lat: Number(finishNearest.lateralOffset.toFixed(3)),
      yawOffset: Number(finishYawOff.toFixed(4)),
      pitch: 0,
      roll: 0,
      speedMs: Number(Math.max(0, this.playerBody.speedMs).toFixed(2)),
      nitro: this.playerBody.nitroActive,
    });
    const compactGhostSamples = downsampleGhostSamples(this.recordedGhostSamples, 220);

    // Compute final position using the exact same function as live HUD telemetry
    const position = calculatePlayerPosition(this.vehicles);
    const standings = buildRaceStandings(
      this.vehicles,
      this.level.laps,
      this.track.totalLength,
      this.level.rivalSkill,
      playerFinishTime
    );

    const rawPosPoints = computePositionPoints(
      this.level.baseReward,
      position,
      this.vehicles.length
    );
    const positionPoints = timedOut ? Math.round(rawPosPoints * 0.25) : rawPosPoints;
    const cleanBonus = Math.min(350, Math.round(this.cleanDrivingScore * 0.4));
    const driftBonus = Math.min(300, Math.round(this.driftScore * 0.8));
    const nitroBonus = Math.min(200, this.nitroUses * 30);

    console.log(
      `[DK Car Race] Final Standings (Level ${this.level.levelNumber} · ${this.level.name} · Seed #${this.level.seed}${timedOut ? ' · TIMED OUT' : ''}): Player placed ${position} / ${this.vehicles.length} in ${playerFinishTime.toFixed(2)}s (+${positionPoints} pts)`
    );
    for (const v of this.vehicles) {
      console.log(
        `[DK Car Race][Racer] ${v.driverName} (${v.carName}) | Lap: ${
          v.finished ? this.level.laps : v.lapsCompleted
        }/${this.level.laps} | Distance: ${v.trackDistanceMeters.toFixed(1)}m | FinishTime: ${
          v.finished ? `${v.finishTimeSec.toFixed(2)}s` : 'Racing...'
        }`
      );
    }
    console.table(
      standings.map((s) => ({
        Pos: s.position,
        Racer: s.name,
        Car: s.carName,
        Lap: `${s.lapsCompleted}/${s.totalLaps}`,
        DistanceM: `${s.trackDistanceMeters.toFixed(1)}m`,
        FinishTime:
          s.finishTimeSec !== null
            ? `${s.finishTimeSec.toFixed(2)}s`
            : `~${s.estimatedTimeSec.toFixed(2)}s (est.)`,
      }))
    );

    this.sound.stopRaceAudio();
    this.onFinish({
      level: this.level,
      carId: this.playerBody.carId,
      position,
      totalCars: this.vehicles.length,
      finishTimeSec: playerFinishTime,
      bestLapSec: this.playerBody.bestLapSec ?? playerFinishTime,
      positionPoints,
      cleanBonus,
      driftBonus,
      nitroBonus,
      totalPointsEarned: positionPoints + cleanBonus + driftBonus + nitroBonus,
      isNewBestTime: false,
      newDamage: { ...this.playerBody.damage },
      unlockedNextLevel: !timedOut && position <= 3,
      timedOut,
      standings,
      ghostSamples: compactGhostSamples,
      ghostBestTimeSec: this.ghostConfig?.bestTimeSec ?? null,
    });
  }

  public dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    window.clearTimeout(this.frameId);
    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('blur', this.handleBlur);
    window.removeEventListener('mousemove', this.handleMouseMove);
    this.renderer?.domElement.removeEventListener('webglcontextlost', this.handleContextLost);

    this.sound.stopRaceAudio();
    this.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry?.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => m.dispose());
        } else {
          obj.material?.dispose();
        }
      }
    });
    this.composer?.dispose();
    this.renderer?.dispose();
  }
}
