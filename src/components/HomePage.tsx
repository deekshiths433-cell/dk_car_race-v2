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
import { PWAInstallButton } from './PWAInstallButton';

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

  const menuButtons = [
    {
      id: 'garage' as const,
      label: 'Garage',
      shortLabel: 'Garage',
      icon: Car,
      iconColor: 'text-amber-400',
    },
    {
      id: 'repair' as const,
      label: `Repair Shop${damagePct > 0 ? ` (${damagePct}%)` : ''}`,
      shortLabel: damagePct > 0 ? `Repair (${damagePct}%)` : 'Repair Shop',
      icon: Wrench,
      iconColor: 'text-cyan-400',
    },
    {
      id: 'shop' as const,
      label: 'Car Shop',
      shortLabel: 'Car Shop',
      icon: ShoppingBag,
      iconColor: 'text-emerald-400',
    },
    {
      id: 'rewards' as const,
      label: `Rewards & Ranks${unclaimedRewards > 0 ? ` (${unclaimedRewards})` : ''}`,
      shortLabel: unclaimedRewards > 0 ? `Rewards (${unclaimedRewards})` : 'Rewards',
      icon: Award,
      iconColor: 'text-amber-400',
    },
    {
      id: 'howto' as const,
      label: 'How to Play',
      shortLabel: 'How to Play',
      icon: BookOpen,
      iconColor: 'text-sky-400',
    },
    {
      id: 'about' as const,
      label: 'About / Creator',
      shortLabel: 'About',
      icon: Info,
      iconColor: 'text-slate-300',
    },
  ];

  return (
    <div className="relative z-10 w-full min-h-dvh dk-scroll flex flex-col pt-[max(0.65rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))] pl-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))] md:p-6">
      {/* COMPACT TWO-COLUMN LAYOUT FOR PHONE LANDSCAPE (height < 500px) */}
      <div className="home-compact-landscape grid-cols-12 gap-3 w-full my-auto items-center">
        {/* Left Column: Logo, Selected Car, Level, Points & Quick Controls */}
        <div className="col-span-5 bg-[#0b0e16]/88 border border-white/10 rounded-xl p-3 flex flex-col justify-between gap-2.5">
          <div className="flex items-center justify-between gap-2">
            <DkLogo size="sm" />
          </div>

          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[11px]">
              <span className="text-amber-400 font-semibold uppercase tracking-wider">
                Lv {level.levelNumber} · {biome.label}
              </span>
              <span className="text-slate-600">·</span>
              <span className="font-mono-num font-bold text-amber-300">
                {save.points.toLocaleString()} pts
              </span>
            </div>

            <h1 className="font-display text-lg sm:text-xl font-bold text-white leading-tight">
              {carSpec.brand} {carSpec.name}
            </h1>

            <p className="text-[11px] text-slate-300 leading-snug">
              {carSpec.stats.topSpeedKmh} km/h · 0–100 in {carSpec.stats.zeroToHundredSec}s ·{' '}
              {carSpec.stats.horsepower} HP
            </p>
          </div>

          {damagePct > 0 && (
            <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-red-950/70 border border-red-500/30 text-[11px] text-red-200">
              <span>Damage: {damagePct}%</span>
              <button
                type="button"
                onClick={() => onOpenModal('repair')}
                className="font-semibold text-amber-400 hover:underline cursor-pointer touch-manipulation"
              >
                Repair
              </button>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            <PWAInstallButton />
            <button
              type="button"
              onClick={() => onOpenModal('settings')}
              className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[40px] rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer touch-manipulation"
            >
              <Settings className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Settings</span>
            </button>
          </div>
        </div>

        {/* Right Column: Prominent PLAY RACE + Level Select + Menu Grid */}
        <div className="col-span-7 flex flex-col gap-2.5">
          <div className="flex items-stretch gap-2">
            <button
              type="button"
              onClick={onStartRace}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 min-h-[50px] rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-[0.99] text-slate-950 font-display font-bold text-base tracking-wide transition-all cursor-pointer touch-manipulation"
            >
              <Play className="w-5 h-5 fill-current shrink-0" />
              <span>PLAY RACE</span>
            </button>

            <button
              type="button"
              onClick={() => onOpenModal('levels')}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-3 min-h-[50px] rounded-xl bg-[#0b0e16]/90 hover:bg-slate-800 border border-white/15 text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer touch-manipulation"
            >
              <Flag className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>Levels</span>
            </button>
          </div>

          <div className="bg-[#0b0e16]/90 border border-white/10 rounded-xl p-2 grid grid-cols-3 gap-1.5">
            {menuButtons.map((btn) => {
              const Icon = btn.icon;
              return (
                <button
                  type="button"
                  key={btn.id}
                  onClick={() => onOpenModal(btn.id)}
                  className="flex flex-col items-center justify-center gap-1 px-2 py-2 min-h-[46px] rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-100 text-[11px] font-semibold text-center leading-tight transition-colors cursor-pointer touch-manipulation"
                >
                  <Icon className={`w-4 h-4 ${btn.iconColor} shrink-0`} />
                  <span>{btn.shortLabel}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* STANDARD LAYOUT FOR PORTRAIT PHONES & DESKTOP */}
      <div className="home-standard-layout flex-col justify-between gap-4 flex-1">
        {/* Top Bar: Clean 3-zone header with Points, Selected Car, and Level */}
        <header className="flex flex-wrap items-center justify-between gap-3 bg-[#0b0e16]/85 border border-white/10 rounded-xl px-3.5 sm:px-4 py-3">
          <DkLogo size="sm" />

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs md:text-sm text-slate-300">
            <div>
              <span className="text-slate-400 mr-1.5">Car</span>
              <span className="font-semibold text-white">
                {carSpec.brand} {carSpec.name}
              </span>
            </div>
            <span className="text-slate-600 hidden sm:inline" aria-hidden="true">
              ·
            </span>
            <div>
              <span className="text-slate-400 mr-1.5">Level {level.levelNumber}</span>
              <span className="font-semibold text-cyan-400">{biome.label}</span>
            </div>
            <span className="text-slate-600 hidden sm:inline" aria-hidden="true">
              ·
            </span>
            <div>
              <span className="text-slate-400 mr-1.5">Points</span>
              <span className="font-mono-num font-bold text-amber-400 text-base">
                {save.points.toLocaleString()}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <PWAInstallButton />
            <button
              type="button"
              onClick={() => onOpenModal('settings')}
              className="inline-flex items-center gap-2 px-3.5 py-2 min-h-[40px] rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer touch-manipulation"
            >
              <Settings className="w-4 h-4 text-amber-400" />
              <span>Settings</span>
            </button>
          </div>
        </header>

        {/* Center Left Calm Title Lockup & Primary Play CTA */}
        <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-4 my-auto">
          <div className="w-full max-w-md bg-[#0b0e16]/82 border border-white/10 rounded-xl p-4 sm:p-5 md:p-6">
            <p className="text-xs font-medium text-amber-400 tracking-wider uppercase mb-1">
              Level {level.levelNumber} · {level.name}
            </p>
            <h1 className="font-display text-2xl sm:text-3xl md:text-5xl font-bold text-white tracking-tight leading-none mb-2.5 sm:mb-3">
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
                  type="button"
                  onClick={() => onOpenModal('repair')}
                  className="font-semibold text-amber-400 hover:underline whitespace-nowrap cursor-pointer touch-manipulation"
                >
                  Repair
                </button>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={onStartRace}
                className="flex-1 min-w-[155px] inline-flex items-center justify-center gap-2.5 px-6 py-3.5 min-h-[48px] rounded-lg bg-amber-500 hover:bg-amber-400 active:scale-[0.99] text-slate-950 font-display font-bold text-lg tracking-wide transition-all cursor-pointer touch-manipulation"
              >
                <Play className="w-5 h-5 fill-current" />
                <span>PLAY RACE</span>
              </button>

              <button
                type="button"
                onClick={() => onOpenModal('levels')}
                className="inline-flex items-center justify-center gap-2 px-4 py-3.5 min-h-[48px] rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-sm font-semibold transition-colors whitespace-nowrap cursor-pointer touch-manipulation"
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
        <footer className="w-full flex justify-center">
          <div className="w-full max-w-5xl bg-[#0b0e16]/90 border border-white/10 rounded-xl p-2 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
            {menuButtons.map((btn) => {
              const Icon = btn.icon;
              return (
                <button
                  type="button"
                  key={btn.id}
                  onClick={() => onOpenModal(btn.id)}
                  className="flex flex-col sm:flex-row items-center justify-center gap-1.5 px-3 py-2.5 min-h-[44px] rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-100 text-xs font-semibold transition-colors cursor-pointer touch-manipulation"
                >
                  <Icon className={`w-4 h-4 ${btn.iconColor} shrink-0`} />
                  <span className="text-center leading-tight">{btn.label}</span>
                </button>
              );
            })}
          </div>
        </footer>
      </div>
    </div>
  );
};
