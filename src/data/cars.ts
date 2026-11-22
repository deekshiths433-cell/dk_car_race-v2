import {
  BodyKitStyle,
  CarId,
  CarSortMode,
  CarSpec,
  PaintFinish,
  RimStyle,
  SaveState,
  SpoilerStyle,
  TireStyle,
} from '../types/game';

export const CAR_SPECS: Record<CarId, CarSpec> = {
  bmw_m4: {
    id: 'bmw_m4',
    name: 'M4 Competition',
    brand: 'BMW',
    fictionalName: 'Bavaria M-Four Track',
    fictionalBrand: 'DK Bavaria',
    tagline: 'Precision twin-turbo inline-six sports coupe (Starter Car)',
    engineType: 'inline6',
    engineLabel: '3.0L Twin-Turbo Inline-6',
    bodyStyle: 'coupe',
    price: 0,
    defaultColor: '#1d4ed8',
    defaultCaliper: '#ef4444',
    defaultRim: 'y_spoke',
    unlockRule: { type: 'free', label: 'Starter Car · Free' },
    stats: {
      topSpeedKmh: 250,
      zeroToHundredSec: 3.5,
      horsepower: 503,
      weightKg: 1725,
      handling: 82,
      braking: 80,
      acceleration: 74,
      nitroPower: 1.18,
      gearRatios: [3.62, 2.25, 1.54, 1.18, 1.0, 0.85, 0.72],
      finalDrive: 3.45,
      redlineRpm: 7200,
      idleRpm: 850,
      wheelRadius: 0.34,
      trackWidth: 1.62,
      wheelbase: 2.85,
    },
    silhouette: {
      length: 4.78,
      width: 1.92,
      height: 1.36,
      cabinOffsetZ: 0.18,
      noseSlope: 0.22,
      rearDeckHeight: 0.86,
    },
  },

  nissan_gtr: {
    id: 'nissan_gtr',
    name: 'GT-R Nismo',
    brand: 'Nissan',
    fictionalName: 'Godzilla R35 Spec-T',
    fictionalBrand: 'DK Nippon',
    tagline: 'AWD twin-turbo V6 cornering legend built for explosive launches',
    engineType: 'twin_turbo',
    engineLabel: '3.8L Twin-Turbo V6',
    bodyStyle: 'jdm',
    price: 1200,
    defaultColor: '#e2e8f0',
    defaultCaliper: '#dc2626',
    defaultRim: 'multi_mesh',
    unlockRule: { type: 'points', label: '1,200 pts' },
    stats: {
      topSpeedKmh: 315,
      zeroToHundredSec: 2.9,
      horsepower: 600,
      weightKg: 1720,
      handling: 86,
      braking: 87,
      acceleration: 86,
      nitroPower: 1.2,
      gearRatios: [3.7, 2.32, 1.62, 1.24, 0.99, 0.82],
      finalDrive: 3.7,
      redlineRpm: 7100,
      idleRpm: 900,
      wheelRadius: 0.345,
      trackWidth: 1.65,
      wheelbase: 2.78,
    },
    silhouette: {
      length: 4.69,
      width: 1.9,
      height: 1.37,
      cabinOffsetZ: 0.16,
      noseSlope: 0.24,
      rearDeckHeight: 0.88,
    },
  },

  corvette_z06: {
    id: 'corvette_z06',
    name: 'Corvette Z06',
    brand: 'Chevrolet',
    fictionalName: 'Stingray Z86 Track',
    fictionalBrand: 'DK Detroit',
    tagline: 'Mid-engine flat-plane crank American V8 track monster',
    engineType: 'v8',
    engineLabel: '5.5L Flat-Plane V8',
    bodyStyle: 'muscle',
    price: 1500,
    defaultColor: '#ea580c',
    defaultCaliper: '#eab308',
    defaultRim: 'y_spoke',
    unlockRule: { type: 'points', label: '1,500 pts' },
    stats: {
      topSpeedKmh: 315,
      zeroToHundredSec: 2.6,
      horsepower: 670,
      weightKg: 1560,
      handling: 88,
      braking: 89,
      acceleration: 90,
      nitroPower: 1.21,
      gearRatios: [3.55, 2.3, 1.64, 1.25, 1.0, 0.83, 0.7],
      finalDrive: 3.65,
      redlineRpm: 8600,
      idleRpm: 900,
      wheelRadius: 0.345,
      trackWidth: 1.72,
      wheelbase: 2.72,
    },
    silhouette: {
      length: 4.68,
      width: 2.02,
      height: 1.23,
      cabinOffsetZ: -0.06,
      noseSlope: 0.29,
      rearDeckHeight: 0.8,
    },
  },

  porsche_gt3: {
    id: 'porsche_gt3',
    name: '911 GT3',
    brand: 'Porsche',
    fictionalName: 'Weissach 992 Cup',
    fictionalBrand: 'DK Stuttgart',
    tagline: 'Track-bred naturally aspirated flat-six apex weapon',
    engineType: 'flat6',
    engineLabel: '4.0L Naturally Aspirated Flat-6',
    bodyStyle: 'rear_engine',
    price: 1800,
    defaultColor: '#e2e8f0',
    defaultCaliper: '#eab308',
    defaultRim: 'multi_mesh',
    unlockRule: { type: 'points', label: '1,800 pts' },
    stats: {
      topSpeedKmh: 318,
      zeroToHundredSec: 3.4,
      horsepower: 502,
      weightKg: 1435,
      handling: 95,
      braking: 93,
      acceleration: 83,
      nitroPower: 1.2,
      gearRatios: [3.75, 2.38, 1.72, 1.34, 1.11, 0.94, 0.81],
      finalDrive: 3.85,
      redlineRpm: 9000,
      idleRpm: 950,
      wheelRadius: 0.345,
      trackWidth: 1.64,
      wheelbase: 2.46,
    },
    silhouette: {
      length: 4.57,
      width: 1.9,
      height: 1.28,
      cabinOffsetZ: 0.1,
      noseSlope: 0.26,
      rearDeckHeight: 0.82,
    },
  },

  lotus_evija: {
    id: 'lotus_evija',
    name: 'Evija',
    brand: 'Lotus',
    fictionalName: 'Volt Venturi EV-X',
    fictionalBrand: 'DK Hethel',
    tagline: 'Quad-motor 2,000 HP all-electric hypercar with Venturi aero tunnels',
    engineType: 'electric',
    engineLabel: '2,000 HP Quad-Motor EV',
    bodyStyle: 'ev_hyper',
    price: 2300,
    defaultColor: '#84cc16',
    defaultCaliper: '#eab308',
    defaultRim: 'turbine',
    unlockRule: { type: 'points', label: '2,300 pts · EV Class' },
    stats: {
      topSpeedKmh: 320,
      zeroToHundredSec: 2.9,
      horsepower: 2000,
      weightKg: 1680,
      handling: 91,
      braking: 91,
      acceleration: 94,
      nitroPower: 1.25,
      gearRatios: [2.85, 1.48],
      finalDrive: 3.1,
      redlineRpm: 16500,
      idleRpm: 1200,
      wheelRadius: 0.35,
      trackWidth: 1.74,
      wheelbase: 2.68,
    },
    silhouette: {
      length: 4.46,
      width: 2.0,
      height: 1.12,
      cabinOffsetZ: -0.1,
      noseSlope: 0.34,
      rearDeckHeight: 0.74,
    },
  },

  amg_gt_bs: {
    id: 'amg_gt_bs',
    name: 'AMG GT Black Series',
    brand: 'Mercedes',
    fictionalName: 'Affalterbach GT-BS',
    fictionalBrand: 'DK Silver Arrow',
    tagline: 'Long-hood bi-turbo V8 GT3 homologation circuit machine',
    engineType: 'v8',
    engineLabel: '4.0L Twin-Turbo Flat-Plane V8',
    bodyStyle: 'gt_front',
    price: 2700,
    defaultColor: '#f97316',
    defaultCaliper: '#eab308',
    defaultRim: 'multi_mesh',
    unlockRule: { type: 'points', label: '2,700 pts' },
    stats: {
      topSpeedKmh: 325,
      zeroToHundredSec: 3.1,
      horsepower: 720,
      weightKg: 1540,
      handling: 92,
      braking: 92,
      acceleration: 87,
      nitroPower: 1.22,
      gearRatios: [3.5, 2.26, 1.62, 1.23, 0.99, 0.82, 0.7],
      finalDrive: 3.55,
      redlineRpm: 7200,
      idleRpm: 880,
      wheelRadius: 0.345,
      trackWidth: 1.7,
      wheelbase: 2.63,
    },
    silhouette: {
      length: 4.63,
      width: 2.01,
      height: 1.28,
      cabinOffsetZ: -0.22,
      noseSlope: 0.24,
      rearDeckHeight: 0.82,
    },
  },

  audi_r8_v10: {
    id: 'audi_r8_v10',
    name: 'R8 V10 Performance',
    brand: 'Audi',
    fictionalName: 'Ingolstadt Quattro V10',
    fictionalBrand: 'DK Ringe',
    tagline: 'Screaming naturally aspirated V10 with quattro all-wheel precision',
    engineType: 'v10',
    engineLabel: '5.2L Naturally Aspirated V10',
    bodyStyle: 'mid_v10',
    price: 3000,
    defaultColor: '#94a3b8',
    defaultCaliper: '#dc2626',
    defaultRim: 'y_spoke',
    unlockRule: { type: 'points', label: '3,000 pts' },
    stats: {
      topSpeedKmh: 331,
      zeroToHundredSec: 3.1,
      horsepower: 602,
      weightKg: 1595,
      handling: 90,
      braking: 90,
      acceleration: 88,
      nitroPower: 1.22,
      gearRatios: [3.48, 2.24, 1.61, 1.24, 1.0, 0.84, 0.72],
      finalDrive: 3.55,
      redlineRpm: 8700,
      idleRpm: 900,
      wheelRadius: 0.345,
      trackWidth: 1.68,
      wheelbase: 2.65,
    },
    silhouette: {
      length: 4.43,
      width: 1.94,
      height: 1.24,
      cabinOffsetZ: -0.02,
      noseSlope: 0.27,
      rearDeckHeight: 0.79,
    },
  },

  ferrari_f8: {
    id: 'ferrari_f8',
    name: 'F8 Tributo',
    brand: 'Ferrari',
    fictionalName: 'Maranello Rosso V8',
    fictionalBrand: 'DK Scuderia',
    tagline: 'Mid-engine twin-turbocharged Italian masterpiece with razor poise',
    engineType: 'twin_turbo',
    engineLabel: '3.9L Twin-Turbo V8',
    bodyStyle: 'mid_v8',
    price: 3400,
    defaultColor: '#dc2626',
    defaultCaliper: '#facc15',
    defaultRim: 'turbine',
    unlockRule: { type: 'points', label: '3,400 pts' },
    stats: {
      topSpeedKmh: 340,
      zeroToHundredSec: 2.9,
      horsepower: 710,
      weightKg: 1435,
      handling: 91,
      braking: 90,
      acceleration: 91,
      nitroPower: 1.24,
      gearRatios: [3.42, 2.28, 1.64, 1.26, 1.02, 0.85, 0.71],
      finalDrive: 3.6,
      redlineRpm: 8000,
      idleRpm: 900,
      wheelRadius: 0.345,
      trackWidth: 1.68,
      wheelbase: 2.65,
    },
    silhouette: {
      length: 4.61,
      width: 1.98,
      height: 1.21,
      cabinOffsetZ: -0.08,
      noseSlope: 0.3,
      rearDeckHeight: 0.78,
    },
  },

  mclaren_720s: {
    id: 'mclaren_720s',
    name: '720S',
    brand: 'McLaren',
    fictionalName: 'Woking Monocage 720',
    fictionalBrand: 'DK Woking',
    tagline: 'Featherweight carbon Monocage supercar with dihedral aero balance',
    engineType: 'twin_turbo',
    engineLabel: '4.0L Twin-Turbo V8',
    bodyStyle: 'track_aero',
    price: 3900,
    defaultColor: '#f97316',
    defaultCaliper: '#f97316',
    defaultRim: 'y_spoke',
    unlockRule: { type: 'points', label: '3,900 pts' },
    stats: {
      topSpeedKmh: 341,
      zeroToHundredSec: 2.9,
      horsepower: 710,
      weightKg: 1419,
      handling: 94,
      braking: 93,
      acceleration: 92,
      nitroPower: 1.24,
      gearRatios: [3.38, 2.24, 1.6, 1.23, 0.99, 0.83, 0.7],
      finalDrive: 3.5,
      redlineRpm: 8500,
      idleRpm: 900,
      wheelRadius: 0.345,
      trackWidth: 1.71,
      wheelbase: 2.67,
    },
    silhouette: {
      length: 4.54,
      width: 1.93,
      height: 1.19,
      cabinOffsetZ: -0.06,
      noseSlope: 0.32,
      rearDeckHeight: 0.77,
    },
  },

  ford_gt: {
    id: 'ford_gt',
    name: 'GT',
    brand: 'Ford',
    fictionalName: 'Le Mans Heritage GT',
    fictionalBrand: 'DK Dearborn',
    tagline: 'Flying-buttress carbon teardrop Le Mans endurance champion',
    engineType: 'twin_turbo',
    engineLabel: '3.5L EcoBoost Twin-Turbo V6',
    bodyStyle: 'lemans',
    price: 4500,
    defaultColor: '#1d4ed8',
    defaultCaliper: '#ef4444',
    defaultRim: 'carbon_aero',
    unlockRule: { type: 'points', label: '4,500 pts' },
    stats: {
      topSpeedKmh: 348,
      zeroToHundredSec: 3.0,
      horsepower: 660,
      weightKg: 1385,
      handling: 95,
      braking: 93,
      acceleration: 90,
      nitroPower: 1.25,
      gearRatios: [3.35, 2.2, 1.58, 1.22, 0.98, 0.82, 0.69],
      finalDrive: 3.45,
      redlineRpm: 7200,
      idleRpm: 900,
      wheelRadius: 0.35,
      trackWidth: 1.73,
      wheelbase: 2.71,
    },
    silhouette: {
      length: 4.76,
      width: 2.0,
      height: 1.11,
      cabinOffsetZ: -0.08,
      noseSlope: 0.33,
      rearDeckHeight: 0.75,
    },
  },

  lamborghini_svj: {
    id: 'lamborghini_svj',
    name: 'Aventador SVJ',
    brand: 'Lamborghini',
    fictionalName: 'Toro Diablo SVJ',
    fictionalBrand: 'DK SantAgata',
    tagline: 'Razor-edged V12 aero flagship with ALA 2.0 active downforce',
    engineType: 'v12',
    engineLabel: '6.5L Naturally Aspirated V12',
    bodyStyle: 'wedge_v12',
    price: 5200,
    defaultColor: '#f59e0b',
    defaultCaliper: '#f59e0b',
    defaultRim: 'y_spoke',
    unlockRule: { type: 'points', label: '5,200 pts' },
    stats: {
      topSpeedKmh: 350,
      zeroToHundredSec: 2.8,
      horsepower: 759,
      weightKg: 1525,
      handling: 89,
      braking: 89,
      acceleration: 93,
      nitroPower: 1.26,
      gearRatios: [3.55, 2.34, 1.68, 1.29, 1.04, 0.87, 0.74],
      finalDrive: 3.5,
      redlineRpm: 8500,
      idleRpm: 950,
      wheelRadius: 0.355,
      trackWidth: 1.74,
      wheelbase: 2.7,
    },
    silhouette: {
      length: 4.94,
      width: 2.09,
      height: 1.14,
      cabinOffsetZ: -0.14,
      noseSlope: 0.34,
      rearDeckHeight: 0.74,
    },
  },

  aston_valkyrie: {
    id: 'aston_valkyrie',
    name: 'Valkyrie',
    brand: 'Aston Martin',
    fictionalName: 'Adrian F1 Venturi V12',
    fictionalBrand: 'DK Silverstone',
    tagline: 'F1-derived 11,100 RPM Cosworth V12 with radical underfloor Venturi tunnels',
    engineType: 'v12',
    engineLabel: '6.5L Hybrid Cosworth V12',
    bodyStyle: 'valkyrie',
    price: 6000,
    defaultColor: '#10b981',
    defaultCaliper: '#84cc16',
    defaultRim: 'carbon_aero',
    unlockRule: { type: 'points', label: '6,000 pts' },
    stats: {
      topSpeedKmh: 350,
      zeroToHundredSec: 2.6,
      horsepower: 1160,
      weightKg: 1270,
      handling: 99,
      braking: 98,
      acceleration: 96,
      nitroPower: 1.28,
      gearRatios: [3.4, 2.3, 1.65, 1.26, 1.0, 0.83, 0.7],
      finalDrive: 3.45,
      redlineRpm: 11100,
      idleRpm: 1100,
      wheelRadius: 0.355,
      trackWidth: 1.76,
      wheelbase: 2.69,
    },
    silhouette: {
      length: 4.5,
      width: 1.98,
      height: 1.07,
      cabinOffsetZ: -0.1,
      noseSlope: 0.38,
      rearDeckHeight: 0.68,
    },
  },

  pagani_huayra: {
    id: 'pagani_huayra',
    name: 'Huayra',
    brand: 'Pagani',
    fictionalName: 'Tempesta Carbon V12',
    fictionalBrand: 'DK Modena',
    tagline: 'Carbo-Titanium bespoke Italian hypercar sculpted like wind itself',
    engineType: 'twin_turbo',
    engineLabel: '6.0L Twin-Turbo V12',
    bodyStyle: 'pagani',
    price: 7000,
    defaultColor: '#94a3b8',
    defaultCaliper: '#dc2626',
    defaultRim: 'turbine',
    unlockRule: { type: 'points', label: '7,000 pts' },
    stats: {
      topSpeedKmh: 370,
      zeroToHundredSec: 3.0,
      horsepower: 730,
      weightKg: 1350,
      handling: 93,
      braking: 93,
      acceleration: 91,
      nitroPower: 1.27,
      gearRatios: [3.3, 2.22, 1.58, 1.21, 0.96, 0.79, 0.66],
      finalDrive: 3.35,
      redlineRpm: 7200,
      idleRpm: 850,
      wheelRadius: 0.355,
      trackWidth: 1.74,
      wheelbase: 2.79,
    },
    silhouette: {
      length: 4.6,
      width: 2.04,
      height: 1.17,
      cabinOffsetZ: -0.06,
      noseSlope: 0.3,
      rearDeckHeight: 0.76,
    },
  },

  bugatti_chiron: {
    id: 'bugatti_chiron',
    name: 'Chiron Pur Sport',
    brand: 'Bugatti',
    fictionalName: 'Molsheim W16 Velocity',
    fictionalBrand: 'DK Alsace',
    tagline: 'Quad-turbocharged W16 engineering summit built for relentless velocity',
    engineType: 'w16',
    engineLabel: '8.0L Quad-Turbo W16',
    bodyStyle: 'bugatti',
    price: 8500,
    defaultColor: '#0284c7',
    defaultCaliper: '#38bdf8',
    defaultRim: 'deep_dish',
    unlockRule: { type: 'points', label: '8,500 pts' },
    stats: {
      topSpeedKmh: 420,
      zeroToHundredSec: 2.4,
      horsepower: 1500,
      weightKg: 1995,
      handling: 87,
      braking: 92,
      acceleration: 98,
      nitroPower: 1.3,
      gearRatios: [3.12, 2.15, 1.56, 1.21, 0.97, 0.8, 0.66],
      finalDrive: 3.15,
      redlineRpm: 6900,
      idleRpm: 800,
      wheelRadius: 0.365,
      trackWidth: 1.76,
      wheelbase: 2.71,
    },
    silhouette: {
      length: 4.65,
      width: 2.04,
      height: 1.21,
      cabinOffsetZ: -0.05,
      noseSlope: 0.25,
      rearDeckHeight: 0.8,
    },
  },

  dk_hyper_x: {
    id: 'dk_hyper_x',
    name: 'DK Apex Hyper-X',
    brand: 'DK Motorsport',
    fictionalName: 'DK Apex Hyper-X',
    fictionalBrand: 'DK Motorsport',
    tagline: 'Signature flagship hybrid hypercar engineered for lightning 2.1s sprints',
    engineType: 'hybrid_v12',
    engineLabel: '6.8L Twin-Turbo V12 Hybrid',
    bodyStyle: 'dk_proto',
    price: 12000,
    defaultColor: '#10b981',
    defaultCaliper: '#34d399',
    defaultRim: 'carbon_aero',
    isUnlockableHypercar: true,
    unlockRule: {
      type: 'level_or_wins',
      levelReq: 6,
      winsReq: 3,
      label: 'Unlock Lv 6 or 3 Wins · 12,000 pts',
    },
    unlockLevelReq: 6,
    stats: {
      topSpeedKmh: 445,
      zeroToHundredSec: 2.1,
      horsepower: 1750,
      weightKg: 1380,
      handling: 98,
      braking: 97,
      acceleration: 100,
      nitroPower: 1.35,
      gearRatios: [3.2, 2.2, 1.6, 1.24, 0.99, 0.82, 0.68],
      finalDrive: 3.1,
      redlineRpm: 9200,
      idleRpm: 900,
      wheelRadius: 0.36,
      trackWidth: 1.78,
      wheelbase: 2.76,
    },
    silhouette: {
      length: 4.88,
      width: 2.08,
      height: 1.12,
      cabinOffsetZ: -0.12,
      noseSlope: 0.36,
      rearDeckHeight: 0.72,
    },
  },

  koenigsegg_jesko: {
    id: 'koenigsegg_jesko',
    name: 'Jesko Absolut',
    brand: 'Koenigsegg',
    fictionalName: 'Angelholm 480 Megacar',
    fictionalBrand: 'DK Nordic',
    tagline: 'Light-Speed Transmission V8 megacar engineered for 480 km/h land-speed domination',
    engineType: 'v8',
    engineLabel: '5.0L Twin-Turbo V8 (E85)',
    bodyStyle: 'jesko',
    price: 18000,
    defaultColor: '#f8fafc',
    defaultCaliper: '#f97316',
    defaultRim: 'carbon_aero',
    isUnlockableHypercar: true,
    unlockRule: {
      type: 'level_or_wins',
      levelReq: 8,
      winsReq: 5,
      label: 'Unlock Lv 8 or 5 Wins · 18,000 pts',
    },
    unlockLevelReq: 8,
    stats: {
      topSpeedKmh: 480,
      zeroToHundredSec: 2.5,
      horsepower: 1600,
      weightKg: 1390,
      handling: 96,
      braking: 96,
      acceleration: 97,
      nitroPower: 1.38,
      gearRatios: [3.25, 2.38, 1.85, 1.48, 1.2, 0.99, 0.83, 0.7, 0.59],
      finalDrive: 3.05,
      redlineRpm: 8500,
      idleRpm: 920,
      wheelRadius: 0.365,
      trackWidth: 1.78,
      wheelbase: 2.7,
    },
    silhouette: {
      length: 4.7,
      width: 2.03,
      height: 1.14,
      cabinOffsetZ: -0.06,
      noseSlope: 0.35,
      rearDeckHeight: 0.75,
    },
  },
};

/**
 * Centralized vehicle economy config:
 * Changing startingPrice, priceGrowth, or rounding automatically recalculates
 * all 16 car prices by speed rank.
 */
export const CAR_ECONOMY_CONFIG = {
  startingPrice: 1000,
  priceGrowth: 1.3,
  lowTierRoundingStep: 100,
  highTierThreshold: 15000,
  highTierRoundingStep: 1000,
  upgradeCosts: [300, 500, 800, 1300, 2000] as const,
  repairBaselineAtStarter: 450,
  repairPriceExponent: 0.34,
} as const;

export function computeCarPriceByRank(rank: number): number {
  if (rank <= 1) return 0; // Starter car (rank #1) is always free
  const {
    startingPrice,
    priceGrowth,
    lowTierRoundingStep,
    highTierThreshold,
    highTierRoundingStep,
  } = CAR_ECONOMY_CONFIG;
  const raw = startingPrice * Math.pow(priceGrowth, rank - 1);
  const step = raw >= highTierThreshold ? highTierRoundingStep : lowTierRoundingStep;
  return Math.round(raw / step) * step;
}

/**
 * Automatically sorted slowest-to-fastest by top speed, breaking ties by slower 0-100s first.
 */
export const CAR_ORDER: CarId[] = (Object.keys(CAR_SPECS) as CarId[]).sort((a, b) => {
  const sa = CAR_SPECS[a].stats;
  const sb = CAR_SPECS[b].stats;
  if (sa.topSpeedKmh !== sb.topSpeedKmh) {
    return sa.topSpeedKmh - sb.topSpeedKmh;
  }
  return sb.zeroToHundredSec - sa.zeroToHundredSec;
});

export const CAR_RANK_MAP: Record<CarId, number> = CAR_ORDER.reduce(
  (acc, id, idx) => {
    acc[id] = idx + 1;
    return acc;
  },
  {} as Record<CarId, number>
);

// Populate every car's price and unlock price label deterministically from CAR_ECONOMY_CONFIG
CAR_ORDER.forEach((id, idx) => {
  const rank = idx + 1;
  const spec = CAR_SPECS[id];
  const computedPrice = computeCarPriceByRank(rank);
  spec.price = computedPrice;

  if (spec.unlockRule.type === 'free') {
    spec.unlockRule.label = 'Starter Car · Free';
  } else if (spec.unlockRule.type === 'points') {
    spec.unlockRule.label =
      spec.engineType === 'electric'
        ? `${computedPrice.toLocaleString()} pts · EV Class`
        : `${computedPrice.toLocaleString()} pts`;
  } else if (spec.unlockRule.type === 'level_or_wins') {
    const reqLvl = spec.unlockRule.levelReq ?? 6;
    const reqWins = spec.unlockRule.winsReq ?? 3;
    spec.unlockRule.label = `Unlock Lv ${reqLvl} or ${reqWins} Wins · ${computedPrice.toLocaleString()} pts`;
  }
});

export const MAX_CAR_TOP_SPEED_KMH = CAR_SPECS[CAR_ORDER[CAR_ORDER.length - 1]].stats.topSpeedKmh;

export function getSortedCarIds(mode: CarSortMode = 'speed_asc', ids: CarId[] = CAR_ORDER): CarId[] {
  return [...ids].sort((a, b) => {
    const sa = CAR_SPECS[a];
    const sb = CAR_SPECS[b];
    switch (mode) {
      case 'speed_desc':
        if (sa.stats.topSpeedKmh !== sb.stats.topSpeedKmh) {
          return sb.stats.topSpeedKmh - sa.stats.topSpeedKmh;
        }
        return sa.stats.zeroToHundredSec - sb.stats.zeroToHundredSec;
      case 'accel':
        if (sa.stats.zeroToHundredSec !== sb.stats.zeroToHundredSec) {
          return sa.stats.zeroToHundredSec - sb.stats.zeroToHundredSec;
        }
        return sb.stats.topSpeedKmh - sa.stats.topSpeedKmh;
      case 'price':
        if (sa.price !== sb.price) {
          return sa.price - sb.price;
        }
        return sa.stats.topSpeedKmh - sb.stats.topSpeedKmh;
      case 'hp':
        return sb.stats.horsepower - sa.stats.horsepower;
      case 'speed_asc':
      default:
        if (sa.stats.topSpeedKmh !== sb.stats.topSpeedKmh) {
          return sa.stats.topSpeedKmh - sb.stats.topSpeedKmh;
        }
        return sb.stats.zeroToHundredSec - sa.stats.zeroToHundredSec;
    }
  });
}

export function isCarUnlockRuleMet(spec: CarSpec, save: SaveState): { unlocked: boolean; reason?: string } {
  const rule = spec.unlockRule;
  if (!rule || rule.type === 'free' || rule.type === 'points') {
    return { unlocked: true };
  }
  if (rule.type === 'level_or_wins') {
    const reqLvl = rule.levelReq ?? 99;
    const reqWins = rule.winsReq ?? 99;
    if (save.highestUnlockedLevel >= reqLvl || save.totalWins >= reqWins) {
      return { unlocked: true };
    }
    return {
      unlocked: false,
      reason: `Reach Level ${reqLvl} or win ${reqWins} races to unlock`,
    };
  }
  return { unlocked: true };
}

export const PAINT_SWATCHES = [
  { name: 'Rosso Corsa', hex: '#dc2626' },
  { name: 'Giallo Orion', hex: '#f59e0b' },
  { name: 'Bugatti Blue', hex: '#0284c7' },
  { name: 'Bavarian Sapphire', hex: '#1d4ed8' },
  { name: 'Emerald Carbon', hex: '#10b981' },
  { name: 'Obsidian Black', hex: '#18181b' },
  { name: 'Chalk White', hex: '#e2e8f0' },
  { name: 'Titanium Silver', hex: '#94a3b8' },
  { name: 'Signal Orange', hex: '#ea580c' },
  { name: 'Acid Lime', hex: '#84cc16' },
  { name: 'Royal Plum', hex: '#7c3aed' },
  { name: 'Crimson Wine', hex: '#881337' },
];

export const PAINT_FINISHES: { id: PaintFinish; label: string; cost: number }[] = [
  { id: 'gloss', label: 'Gloss', cost: 0 },
  { id: 'metallic', label: 'Metallic', cost: 250 },
  { id: 'matte', label: 'Matte Satin', cost: 350 },
  { id: 'chrome', label: 'Liquid Chrome', cost: 600 },
];

export const RIM_STYLES: { id: RimStyle; label: string; cost: number }[] = [
  { id: 'y_spoke', label: 'Forged Y-Spoke', cost: 0 },
  { id: 'turbine', label: 'Aero Turbine', cost: 300 },
  { id: 'multi_mesh', label: 'GT Multi-Mesh', cost: 400 },
  { id: 'deep_dish', label: 'Deep-Dish Forged', cost: 500 },
  { id: 'carbon_aero', label: 'Carbon Blade', cost: 750 },
];

export const TIRE_STYLES: { id: TireStyle; label: string; cost: number; gripBonus: number }[] = [
  { id: 'street', label: 'Performance Street', cost: 0, gripBonus: 0 },
  { id: 'semi_slick', label: 'Track Semi-Slick', cost: 450, gripBonus: 0.06 },
  { id: 'racing_slick', label: 'Pirelli P-Zero Slick', cost: 850, gripBonus: 0.12 },
];

export const SPOILER_STYLES: { id: SpoilerStyle; label: string; cost: number }[] = [
  { id: 'none', label: 'Clean Deck', cost: 0 },
  { id: 'lip', label: 'Carbon Ducktail Lip', cost: 250 },
  { id: 'gt_wing', label: 'GT Aero Wing', cost: 500 },
  { id: 'swan_neck', label: 'Swan-Neck Track Wing', cost: 800 },
];

export const BODYKIT_STYLES: { id: BodyKitStyle; label: string; cost: number }[] = [
  { id: 'stock', label: 'Factory Aero', cost: 0 },
  { id: 'sport', label: 'Carbon Splitter Kit', cost: 450 },
  { id: 'track_wide', label: 'Widebody GT3 Spec', cost: 900 },
];

export const CALIPER_COLORS = [
  '#ef4444',
  '#eab308',
  '#38bdf8',
  '#22c55e',
  '#f97316',
  '#e2e8f0',
];

export const UNDERGLOW_COLORS = [
  '#06b6d4',
  '#f59e0b',
  '#ef4444',
  '#10b981',
  '#8b5cf6',
  '#ffffff',
];

export const UPGRADE_COSTS: readonly number[] = CAR_ECONOMY_CONFIG.upgradeCosts;
