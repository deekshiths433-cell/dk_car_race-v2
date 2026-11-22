export type CarId =
  | 'lamborghini_svj'
  | 'bugatti_chiron'
  | 'ferrari_f8'
  | 'porsche_gt3'
  | 'bmw_m4'
  | 'dk_hyper_x';

export type EngineType = 'v12' | 'w16' | 'v8' | 'flat6' | 'inline6' | 'hybrid_v12';

export type PaintFinish = 'gloss' | 'metallic' | 'matte' | 'chrome';
export type RimStyle = 'y_spoke' | 'turbine' | 'multi_mesh' | 'carbon_aero' | 'deep_dish';
export type TireStyle = 'street' | 'semi_slick' | 'racing_slick';
export type SpoilerStyle = 'none' | 'lip' | 'gt_wing' | 'swan_neck';
export type BodyKitStyle = 'stock' | 'sport' | 'track_wide';

export type QualityPreset = 'auto' | 'low' | 'medium' | 'high' | 'ultra';
export type SpeedUnit = 'kmh' | 'mph';
export type ControlMode = 'buttons' | 'tilt' | 'wheel';
export type SteeringAssist = 'off' | 'light' | 'full';
export type CameraMode = 'chase' | 'hood' | 'cockpit' | 'cinematic';

export type BiomeType =
  | 'city'
  | 'desert'
  | 'mountain'
  | 'coastal'
  | 'snow'
  | 'night_neon';

export type WeatherType = 'clear' | 'rain' | 'fog' | 'snow';
export type TimeOfDay = 'day' | 'sunset' | 'night';

export interface CarStats {
  topSpeedKmh: number;
  zeroToHundredSec: number;
  horsepower: number;
  weightKg: number;
  handling: number; // 1-100
  braking: number; // 1-100
  acceleration: number; // 1-100
  nitroPower: number; // multiplier bonus
  gearRatios: number[];
  finalDrive: number;
  redlineRpm: number;
  idleRpm: number;
  wheelRadius: number;
  trackWidth: number;
  wheelbase: number;
}

export interface CarSpec {
  id: CarId;
  name: string;
  brand: string;
  tagline: string;
  engineType: EngineType;
  engineLabel: string;
  price: number;
  defaultColor: string;
  defaultCaliper: string;
  defaultRim: RimStyle;
  isUnlockableHypercar?: boolean;
  unlockLevelReq?: number;
  stats: CarStats;
  silhouette: {
    length: number;
    width: number;
    height: number;
    cabinOffsetZ: number;
    noseSlope: number;
    rearDeckHeight: number;
  };
}

export interface CarCustomization {
  paintColor: string;
  paintFinish: PaintFinish;
  rimStyle: RimStyle;
  rimColor: string;
  tireStyle: TireStyle;
  caliperColor: string;
  spoilerStyle: SpoilerStyle;
  bodyKit: BodyKitStyle;
  windowTint: number; // 0.15 to 0.88
  underglowEnabled: boolean;
  underglowColor: string;
  unlockedItems: string[];
}

export interface CarUpgrades {
  engineLevel: number; // 0..5
  turboLevel: number; // 0..5
  tiresLevel: number; // 0..5
  brakesLevel: number; // 0..5
}

export interface CarDamage {
  body: number; // 0..100
  engine: number; // 0..100
  tires: number; // 0..100
}

export interface OwnedCarState {
  owned: boolean;
  customization: CarCustomization;
  upgrades: CarUpgrades;
  damage: CarDamage;
}

export type TrackArchetype =
  | 'sweep'
  | 'hairpin'
  | 'chicane'
  | 'speedway'
  | 'technical';

export interface LevelConfig {
  levelNumber: number;
  name: string;
  biome: BiomeType;
  weather: WeatherType;
  timeOfDay: TimeOfDay;
  laps: number;
  trackLengthMeters: number;
  trackCurviness: number;
  rivalCount: number;
  rivalSkill: number; // 0.65..1.15
  obstacleCount: number;
  seed: number;
  baseReward: number;
  description: string;
  layoutArchetype?: TrackArchetype;
  isFavoriteReplay?: boolean;
}

export interface FavoriteMapSeed {
  id: string;
  name: string;
  seed: number;
  levelNumber: number;
  biome: BiomeType;
  weather: WeatherType;
  timeOfDay: TimeOfDay;
  layoutArchetype?: TrackArchetype;
  savedAtISO: string;
}

export interface TouchButtonPosition {
  xPct: number; // 0..100
  yPct: number; // 0..100
}

export interface MobileLayoutConfig {
  leftHanded: boolean;
  buttonScale: number; // 0.7..1.45
  buttonOpacity: number; // 0.3..1.0
  positions: {
    steerLeft: TouchButtonPosition;
    steerRight: TouchButtonPosition;
    wheel: TouchButtonPosition;
    accel: TouchButtonPosition;
    brake: TouchButtonPosition;
    nitro: TouchButtonPosition;
    handbrake: TouchButtonPosition;
    horn: TouchButtonPosition;
    lights: TouchButtonPosition;
    camera: TouchButtonPosition;
  };
}

export interface HudVisibilityConfig {
  speedometer: boolean;
  nitro: boolean;
  lapTime: boolean;
  position: boolean;
  minimap: boolean;
}

export interface GameSettings {
  quality: QualityPreset;
  speedUnit: SpeedUnit;
  hudScale: number; // 0.8 (small) .. 1.0 (medium) .. 1.2 (large)
  hudElements: HudVisibilityConfig;
  engineVolume: number; // 0..1
  effectsVolume: number; // 0..1
  musicVolume: number; // 0..1
  muted: boolean;
  showDesktopHints: boolean;
  controlMode: ControlMode;
  steeringSensitivity: number; // 0.3..2.0
  tiltSensitivity: number; // 0.3..2.5
  tiltCalibrationOffset: number; // degrees
  steeringReturnSpeed: number; // 0.5..2.0
  steeringDeadZone: number; // 0..0.25
  steeringAssist: SteeringAssist;
  vibrationFeedback: boolean;
  mouseSteering: boolean;
  showGhost: boolean;
  mobileLayout: MobileLayoutConfig;
}

export interface DailyMission {
  id: string;
  title: string;
  description: string;
  target: number;
  progress: number;
  reward: number;
  claimed: boolean;
  type: 'races' | 'wins' | 'drift_meters' | 'nitro_uses' | 'clean_laps';
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  unlocked: boolean;
  reward: number;
}

export interface LeaderboardEntry {
  id: string;
  driverName: string;
  carName: string;
  carId?: CarId;
  levelNumber: number;
  biome: BiomeType;
  bestTimeSec: number;
  points: number;
  dateISO: string;
}

export interface GhostSample {
  tSec: number;
  progress: number;
  lat: number;
  yawOffset: number;
  pitch: number;
  roll: number;
  speedMs: number;
  nitro: boolean;
}

export interface GhostRecord {
  levelNumber: number;
  carId: CarId;
  carName: string;
  bestTimeSec: number;
  samples: GhostSample[];
  dateISO: string;
}

export interface GhostConfig {
  bestTimeSec: number;
  carId: CarId;
  carName: string;
  samples?: GhostSample[];
}

export interface SaveState {
  points: number;
  selectedCarId: CarId;
  currentLevel: number;
  highestUnlockedLevel: number;
  totalRaces: number;
  totalWins: number;
  hasSeenTutorial: boolean;
  dailyStreak: number;
  lastDailyClaimDate: string; // YYYY-MM-DD
  cars: Record<CarId, OwnedCarState>;
  bestTimesByLevel: Record<number, number>;
  ghostsByLevel?: Record<number, GhostRecord>;
  favoriteMaps?: FavoriteMapSeed[];
  lastRaceSeed?: number;
  lastRaceBiome?: BiomeType;
  lastRaceWeather?: WeatherType;
  lastRaceTimeOfDay?: TimeOfDay;
  missions: DailyMission[];
  missionsDate: string;
  achievements: Achievement[];
  leaderboard: LeaderboardEntry[];
  settings: GameSettings;
}

export interface RaceTelemetry {
  speedKmh: number;
  rpm: number;
  redlineRpm: number;
  gear: number; // 0=R, 1..N
  nitro: number; // 0..100
  nitroActive: boolean;
  position: number;
  totalCars: number;
  lap: number;
  totalLaps: number;
  raceTimeSec: number;
  bestLapSec: number | null;
  countdown: number; // 3,2,1,0,-1 (running)
  headlightsMode: 0 | 1 | 2; // 0=off, 1=low, 2=high
  leftIndicator: boolean;
  rightIndicator: boolean;
  hazardLights: boolean;
  wipersActive: boolean;
  handbrakeActive: boolean;
  drifting: boolean;
  driftScore: number;
  cleanDrivingScore: number;
  nitroUses: number;
  damagePct: number;
  cameraMode: CameraMode;
  wrongWay: boolean;
  checkpointNotice: string | null;
  fps: number;
  ghostDeltaSec: number | null;
  ghostBestTimeSec: number | null;
  ghostFinished: boolean;
  minimapData: {
    trackPoints: { x: number; z: number }[];
    bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
    player: { x: number; z: number; yaw: number };
    rivals: { x: number; z: number }[];
    ghost: { x: number; z: number } | null;
  };
}

export interface RaceStanding {
  id: string;
  name: string;
  carName: string;
  isPlayer: boolean;
  position: number;
  finished: boolean;
  finishTimeSec: number | null;
  estimatedTimeSec: number;
  lapsCompleted: number;
  totalLaps: number;
  trackDistanceMeters: number;
}

export interface RaceResult {
  level: LevelConfig;
  carId: CarId;
  position: number;
  totalCars: number;
  finishTimeSec: number;
  bestLapSec: number;
  positionPoints: number;
  cleanBonus: number;
  driftBonus: number;
  nitroBonus: number;
  totalPointsEarned: number;
  isNewBestTime: boolean;
  newDamage: CarDamage;
  unlockedNextLevel: boolean;
  standings: RaceStanding[];
  ghostSamples?: GhostSample[];
  ghostBestTimeSec?: number | null;
}
