import { CAR_ORDER, CAR_SPECS } from '../data/cars';
import {
  Achievement,
  CarId,
  DailyMission,
  GameSettings,
  MobileLayoutConfig,
  OwnedCarState,
  SaveState,
} from '../types/game';

const STORAGE_KEY = 'dk_car_race_save_v1';

export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  const hasTouch =
    navigator.maxTouchPoints > 0 || 'ontouchstart' in window;
  const uaMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
  const smallViewport = Math.min(window.innerWidth, window.innerHeight) <= 768;
  return uaMobile || (hasTouch && smallViewport);
}

export function getDefaultMobileLayout(leftHanded = false): MobileLayoutConfig {
  if (leftHanded) {
    return {
      leftHanded: true,
      buttonScale: 1.0,
      buttonOpacity: 0.85,
      positions: {
        steerLeft: { xPct: 78, yPct: 79 },
        steerRight: { xPct: 91, yPct: 79 },
        wheel: { xPct: 84, yPct: 76 },
        accel: { xPct: 10, yPct: 76 },
        brake: { xPct: 23, yPct: 80 },
        nitro: { xPct: 10, yPct: 52 },
        handbrake: { xPct: 23, yPct: 57 },
        horn: { xPct: 92, yPct: 51 },
        lights: { xPct: 81, yPct: 33 },
        camera: { xPct: 92, yPct: 33 },
      },
    };
  }
  return {
    leftHanded: false,
    buttonScale: 1.0,
    buttonOpacity: 0.85,
    positions: {
      steerLeft: { xPct: 9, yPct: 79 },
      steerRight: { xPct: 22, yPct: 79 },
      wheel: { xPct: 16, yPct: 76 },
      accel: { xPct: 90, yPct: 76 },
      brake: { xPct: 77, yPct: 80 },
      nitro: { xPct: 90, yPct: 52 },
      handbrake: { xPct: 77, yPct: 57 },
      horn: { xPct: 8, yPct: 51 },
      lights: { xPct: 19, yPct: 33 },
      camera: { xPct: 8, yPct: 33 },
    },
  };
}

export function getDefaultSettings(): GameSettings {
  return {
    quality: 'auto',
    speedUnit: 'kmh',
    hudScale: 1.0,
    hudElements: {
      speedometer: true,
      nitro: true,
      lapTime: true,
      position: true,
      minimap: true,
    },
    engineVolume: 0.75,
    effectsVolume: 0.8,
    musicVolume: 0.35,
    muted: false,
    showDesktopHints: true,
    controlMode: 'buttons',
    steeringSensitivity: 1.0,
    tiltSensitivity: 1.15,
    tiltCalibrationOffset: 0,
    steeringReturnSpeed: 1.1,
    steeringDeadZone: 0.04,
    steeringAssist: 'light',
    vibrationFeedback: true,
    mouseSteering: false,
    mobileLayout: getDefaultMobileLayout(false),
  };
}

function getTodayDateString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate()
  ).padStart(2, '0')}`;
}

export function generateDailyMissions(): DailyMission[] {
  return [
    {
      id: 'm_races',
      title: 'Track Regular',
      description: 'Complete 3 races in any biome',
      target: 3,
      progress: 0,
      reward: 450,
      claimed: false,
      type: 'races',
    },
    {
      id: 'm_wins',
      title: 'Podium Dominance',
      description: 'Win 1st place in a race',
      target: 1,
      progress: 0,
      reward: 650,
      claimed: false,
      type: 'wins',
    },
    {
      id: 'm_drift',
      title: 'Sideways Artist',
      description: 'Drift a total of 300 meters',
      target: 300,
      progress: 0,
      reward: 500,
      claimed: false,
      type: 'drift_meters',
    },
    {
      id: 'm_nitro',
      title: 'Afterburner',
      description: 'Trigger Nitro boost 5 times',
      target: 5,
      progress: 0,
      reward: 400,
      claimed: false,
      type: 'nitro_uses',
    },
  ];
}

export function getDefaultAchievements(): Achievement[] {
  return [
    {
      id: 'ach_first_win',
      title: 'Checkered Glory',
      description: 'Win your very first race in DK Car Race',
      unlocked: false,
      reward: 500,
    },
    {
      id: 'ach_300_club',
      title: '300+ km/h Club',
      description: 'Exceed 300 km/h on the road',
      unlocked: false,
      reward: 600,
    },
    {
      id: 'ach_400_club',
      title: 'Hypervelocity',
      description: 'Reach 400 km/h in a hypercar',
      unlocked: false,
      reward: 1200,
    },
    {
      id: 'ach_collector',
      title: 'Supercar Collector',
      description: 'Own 3 or more supercars in your garage',
      unlocked: false,
      reward: 1000,
    },
    {
      id: 'ach_clean_driver',
      title: 'Apex Surgeon',
      description: 'Finish a race with less than 5% car damage',
      unlocked: false,
      reward: 550,
    },
    {
      id: 'ach_night_rain',
      title: 'Midnight Runner',
      description: 'Complete a Night Neon City race',
      unlocked: false,
      reward: 750,
    },
  ];
}

function buildInitialCars(): Record<CarId, OwnedCarState> {
  const result = {} as Record<CarId, OwnedCarState>;
  for (const id of CAR_ORDER) {
    const spec = CAR_SPECS[id];
    result[id] = {
      owned: id === 'bmw_m4',
      customization: {
        paintColor: spec.defaultColor,
        paintFinish: 'metallic',
        rimStyle: spec.defaultRim,
        rimColor: '#cbd5e1',
        tireStyle: 'street',
        caliperColor: spec.defaultCaliper,
        spoilerStyle: id === 'porsche_gt3' || id === 'lamborghini_svj' ? 'gt_wing' : 'lip',
        bodyKit: 'stock',
        windowTint: 0.42,
        underglowEnabled: false,
        underglowColor: '#06b6d4',
        unlockedItems: [],
      },
      upgrades: {
        engineLevel: 0,
        turboLevel: 0,
        tiresLevel: 0,
        brakesLevel: 0,
      },
      damage: {
        body: 0,
        engine: 0,
        tires: 0,
      },
    };
  }
  return result;
}

export function createInitialSaveState(): SaveState {
  const today = getTodayDateString();
  return {
    points: 1200,
    selectedCarId: 'bmw_m4',
    currentLevel: 1,
    highestUnlockedLevel: 1,
    totalRaces: 0,
    totalWins: 0,
    hasSeenTutorial: false,
    dailyStreak: 0,
    lastDailyClaimDate: '',
    cars: buildInitialCars(),
    bestTimesByLevel: {},
    missions: generateDailyMissions(),
    missionsDate: today,
    achievements: getDefaultAchievements(),
    leaderboard: [
      {
        id: 'seed_1',
        driverName: 'DEEKSHITH.S',
        carName: 'Bugatti Chiron Pur Sport',
        levelNumber: 1,
        biome: 'city',
        bestTimeSec: 68.42,
        points: 2450,
        dateISO: '2026-11-20',
      },
      {
        id: 'seed_2',
        driverName: 'Apex_V12',
        carName: 'Lamborghini Aventador SVJ',
        levelNumber: 2,
        biome: 'desert',
        bestTimeSec: 74.15,
        points: 2100,
        dateISO: '2026-11-20',
      },
      {
        id: 'seed_3',
        driverName: 'MaranelloGT',
        carName: 'Ferrari F8 Tributo',
        levelNumber: 3,
        biome: 'mountain',
        bestTimeSec: 81.88,
        points: 1850,
        dateISO: '2026-11-20',
      },
    ],
    settings: getDefaultSettings(),
  };
}

export function loadSaveState(): SaveState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createInitialSaveState();
    const parsed = JSON.parse(raw) as Partial<SaveState>;
    const base = createInitialSaveState();
    const today = getTodayDateString();

    const mergedCars = { ...base.cars };
    if (parsed.cars) {
      for (const id of CAR_ORDER) {
        if (parsed.cars[id]) {
          mergedCars[id] = {
            owned: Boolean(parsed.cars[id].owned),
            customization: {
              ...base.cars[id].customization,
              ...parsed.cars[id].customization,
            },
            upgrades: {
              ...base.cars[id].upgrades,
              ...parsed.cars[id].upgrades,
            },
            damage: {
              ...base.cars[id].damage,
              ...parsed.cars[id].damage,
            },
          };
        }
      }
    }

    const rawPositions = parsed.settings?.mobileLayout?.positions;
    const isLegacyDefaultPos =
      rawPositions &&
      rawPositions.camera?.yPct === 22 &&
      rawPositions.lights?.yPct === 38 &&
      rawPositions.horn?.yPct === 38;

    const mergedSettings: GameSettings = {
      ...base.settings,
      ...(parsed.settings || {}),
      hudElements: {
        ...base.settings.hudElements,
        ...(parsed.settings?.hudElements || {}),
      },
      mobileLayout: {
        ...base.settings.mobileLayout,
        ...(parsed.settings?.mobileLayout || {}),
        positions: isLegacyDefaultPos
          ? getDefaultMobileLayout(Boolean(parsed.settings?.mobileLayout?.leftHanded)).positions
          : {
              ...base.settings.mobileLayout.positions,
              ...(rawPositions || {}),
            },
      },
    };

    const missions =
      parsed.missionsDate === today && Array.isArray(parsed.missions)
        ? parsed.missions
        : generateDailyMissions();

    return {
      ...base,
      ...parsed,
      cars: mergedCars,
      settings: mergedSettings,
      missions,
      missionsDate: today,
      achievements: Array.isArray(parsed.achievements)
        ? base.achievements.map((a) => {
            const existing = parsed.achievements?.find((x) => x.id === a.id);
            return existing ? { ...a, unlocked: existing.unlocked } : a;
          })
        : base.achievements,
      leaderboard: Array.isArray(parsed.leaderboard)
        ? parsed.leaderboard
        : base.leaderboard,
    };
  } catch (err) {
    console.error('[DK Car Race][Storage] Failed to load save state from localStorage:', err);
    return createInitialSaveState();
  }
}

export function persistSaveState(state: SaveState): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch (err) {
    console.error('[DK Car Race][Storage] Failed to save state to localStorage:', err);
    return false;
  }
}

export function getCarDamagePercent(car: OwnedCarState): number {
  return Math.round((car.damage.body + car.damage.engine + car.damage.tires) / 3);
}

export function getRepairCost(car: OwnedCarState): number {
  const avg = getCarDamagePercent(car);
  if (avg <= 0) return 0;
  return Math.max(40, Math.round(avg * 9));
}
