import React from 'react';
import {
  Award,
  BookOpen,
  Car,
  Flag,
  Info,
  Play,
  Settings,
  ShoppingBag,
  Wrench,
} from 'lucide-react';
import { CAR_SPECS } from '../data/cars';
import { BIOME_META, getLevelConfig } from '../data/levels';
import { SaveState } from '../types/game';
import { getCarDamagePercent } from '../utils/storage';
import { DkLogo } from './DkLogo';

export type ActiveModal =
  | 'none'
  | 'garage'
  | 'repair'
  | 'shop'
  | 'levels'
  | 'rewards'
  | 'howto'
  | 'about'
  | 'settings';

interface HomePageProps {
  save: SaveState;
  onStartRace: () => void;
  onOpenModal: (modal: ActiveModal) => void;
  isDesktop: boolean;
}

export const HomePage: React.FC<HomePageProps> = ({
  save,
  onStartRace,
  onOpenModal,
  isDesktop,
}) => {
  const carSpec = CAR_SPECS[save.selectedCarId];
  const carState = save.cars[save.selectedCarId];
  const damagePct = getCarDamagePercent(carState);
  const level = getLevelConfig(save.currentLevel);
  const biome = BIOME_META[level.biome];

  const unclaimedRewards =
    save.missions.filter((m) => m.progress >= m.target && !m.claimed).length;

  return (
    <div className="relative z-10 w-full h-full pointer-events-none flex flex-col justify-between p-4 md:p-6">
      {/* Top Bar: Clean 3-zone header with Points, Selected Car, and Level */}
      <header className="pointer-events-auto flex flex-wrap items-center justify-between gap-4 bg-[#0b0e16]/85 border border-white/10 rounded-xl px-4 py-3">
        <DkLogo size="sm" />

        <div className="flex flex-wrap items-center gap-4 md:gap-6 text-xs md:text-sm text-slate-300">
          <div>
            <span className="text-slate-400 mr-1.5">Car</span>
            <span className="font-semibold text-white">
              {carSpec.brand} {carSpec.name}
            </span>
          </div>
          <span className="text-slate-600" aria-hidden="true">
            ·
          </span>
          <div>
            <span className="text-slate-400 mr-1.5">Level {level.levelNumber}</span>
            <span className="font-semibold text-cyan-400">{biome.label}</span>
          </div>
          <span className="text-slate-600" aria-hidden="true">
            ·
          </span>
          <div>
            <span className="text-slate-400 mr-1.5">Points</span>
            <span className="font-mono-num font-bold text-amber-400 text-base">
              {save.points.toLocaleString()}
            </span>
          </div>
        </div>

        <button
          onClick={() => onOpenModal('settings')}
          className="inline-flex items-center gap-2 px-3.5 py-2 min-h-[40px] rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Settings className="w-4 h-4 text-amber-400" />
          <span>Settings</span>
        </button>
      </header>

      {/* Center Left Calm Title Lockup & Primary Play CTA (keeps 3D car unobstructed on right/center) */}
      <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-4 my-auto">
        <div className="pointer-events-auto max-w-md bg-[#0b0e16]/80 border border-white/10 rounded-xl p-5 md:p-6">
          <p className="text-xs font-medium text-amber-400 tracking-wider uppercase mb-1">
            Level {level.levelNumber} · {level.name}
          </p>
          <h1 className="font-display text-3xl md:text-5xl font-bold text-white tracking-tight leading-none mb-3">
            {carSpec.brand} {carSpec.name}
          </h1>
          <p className="text-xs md:text-sm text-slate-300 leading-relaxed mb-4">
            {carSpec.stats.topSpeedKmh} km/h Top Speed · 0–100 in{' '}
            {carSpec.stats.zeroToHundredSec}s · {carSpec.stats.horsepower} HP ·{' '}
            {level.laps} Laps vs {level.rivalCount} Rivals
          </p>

          {damagePct > 0 && (
            <div className="mb-4 flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-red-950/60 border border-red-500/30 text-xs text-red-200">
              <span>Vehicle Damage: {damagePct}% (Performance reduced)</span>
              <button
                onClick={() => onOpenModal('repair')}
                className="font-semibold text-amber-400 hover:underline whitespace-nowrap cursor-pointer"
              >
                Repair
              </button>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={onStartRace}
              className="flex-1 min-w-[160px] inline-flex items-center justify-center gap-2.5 px-6 py-3.5 min-h-[48px] rounded-lg bg-amber-500 hover:bg-amber-400 active:scale-[0.99] text-slate-950 font-display font-bold text-lg tracking-wide transition-all cursor-pointer"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>PLAY RACE</span>
            </button>

            <button
              onClick={() => onOpenModal('levels')}
              className="inline-flex items-center justify-center gap-2 px-4 py-3.5 min-h-[48px] rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-sm font-semibold transition-colors whitespace-nowrap cursor-pointer"
            >
              <Flag className="w-4 h-4 text-cyan-400" />
              <span>Level Select</span>
            </button>
          </div>

          {isDesktop && (
            <p className="mt-3 text-[11px] text-slate-400 font-mono-num">
              WASD / Arrows Drive · Shift Nitro · Space Handbrake · H Horn · L Lights · C Camera
            </p>
          )}
        </div>
      </div>

      {/* Unified Bottom Navigation Dock: All Required Menu Destinations */}
      <footer className="pointer-events-auto w-full flex justify-center">
        <div className="w-full max-w-5xl bg-[#0b0e16]/90 border border-white/10 rounded-xl p-2 grid grid-cols-3 sm:grid-cols-6 gap-2">
          <button
            onClick={() => onOpenModal('garage')}
            className="flex flex-col sm:flex-row items-center justify-center gap-1.5 px-3 py-2.5 min-h-[44px] rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-100 text-xs font-semibold transition-colors cursor-pointer"
          >
            <Car className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="truncate">Garage</span>
          </button>

          <button
            onClick={() => onOpenModal('repair')}
            className="flex flex-col sm:flex-row items-center justify-center gap-1.5 px-3 py-2.5 min-h-[44px] rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-100 text-xs font-semibold transition-colors cursor-pointer"
          >
            <Wrench className="w-4 h-4 text-cyan-400 shrink-0" />
            <span className="truncate">
              Repair Shop{damagePct > 0 ? ` (${damagePct}%)` : ''}
            </span>
          </button>

          <button
            onClick={() => onOpenModal('shop')}
            className="flex flex-col sm:flex-row items-center justify-center gap-1.5 px-3 py-2.5 min-h-[44px] rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-100 text-xs font-semibold transition-colors cursor-pointer"
          >
            <ShoppingBag className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="truncate">Car Shop</span>
          </button>

          <button
            onClick={() => onOpenModal('rewards')}
            className="flex flex-col sm:flex-row items-center justify-center gap-1.5 px-3 py-2.5 min-h-[44px] rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-100 text-xs font-semibold transition-colors cursor-pointer"
          >
            <Award className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="truncate">
              Rewards & Ranks{unclaimedRewards > 0 ? ` (${unclaimedRewards})` : ''}
            </span>
          </button>

          <button
            onClick={() => onOpenModal('howto')}
            className="flex flex-col sm:flex-row items-center justify-center gap-1.5 px-3 py-2.5 min-h-[44px] rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-100 text-xs font-semibold transition-colors cursor-pointer"
          >
            <BookOpen className="w-4 h-4 text-sky-400 shrink-0" />
            <span className="truncate">How to Play</span>
          </button>

          <button
            onClick={() => onOpenModal('about')}
            className="flex flex-col sm:flex-row items-center justify-center gap-1.5 px-3 py-2.5 min-h-[44px] rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-100 text-xs font-semibold transition-colors cursor-pointer"
          >
            <Info className="w-4 h-4 text-slate-300 shrink-0" />
            <span className="truncate">About / Creator</span>
          </button>
        </div>
      </footer>
    </div>
  );
};
