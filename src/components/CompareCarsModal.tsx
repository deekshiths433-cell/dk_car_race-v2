import React, { useMemo, useState } from 'react';
import { ArrowLeftRight, Check, ShoppingBag, X } from 'lucide-react';
import { getCarBrand, getCarDisplayName, getCarName } from '../data/brandConfig';
import {
  CAR_ORDER,
  CAR_RANK_MAP,
  CAR_SPECS,
  getSortedCarIds,
  isCarUnlockRuleMet,
  MAX_CAR_TOP_SPEED_KMH,
} from '../data/cars';
import { CarId, CarSortMode, SaveState } from '../types/game';

interface CompareCarsModalProps {
  save: SaveState;
  onSelectCar: (carId: CarId) => void;
  onOpenShop: () => void;
  onClose: () => void;
}

export const CompareCarsModal: React.FC<CompareCarsModalProps> = ({
  save,
  onSelectCar,
  onOpenShop,
  onClose,
}) => {
  const [sortMode, setSortMode] = useState<CarSortMode>('speed_asc');
  const sortedIds = useMemo(() => getSortedCarIds(sortMode), [sortMode]);

  const initialRight = useMemo(() => {
    const idx = CAR_ORDER.indexOf(save.selectedCarId);
    return CAR_ORDER[Math.min(CAR_ORDER.length - 1, Math.max(1, idx + 1))];
  }, [save.selectedCarId]);

  const [leftId, setLeftId] = useState<CarId>(save.selectedCarId);
  const [rightId, setRightId] = useState<CarId>(initialRight);

  const leftSpec = CAR_SPECS[leftId];
  const rightSpec = CAR_SPECS[rightId];

  const rows = [
    {
      label: 'Top Speed',
      aVal: leftSpec.stats.topSpeedKmh,
      bVal: rightSpec.stats.topSpeedKmh,
      fmt: (v: number) => `${v} km/h`,
      higherBetter: true,
    },
    {
      label: '0–100 km/h',
      aVal: leftSpec.stats.zeroToHundredSec,
      bVal: rightSpec.stats.zeroToHundredSec,
      fmt: (v: number) => `${v.toFixed(1)} s`,
      higherBetter: false,
    },
    {
      label: 'Horsepower',
      aVal: leftSpec.stats.horsepower,
      bVal: rightSpec.stats.horsepower,
      fmt: (v: number) => `${v.toLocaleString()} HP`,
      higherBetter: true,
    },
    {
      label: 'Handling',
      aVal: leftSpec.stats.handling,
      bVal: rightSpec.stats.handling,
      fmt: (v: number) => `${v}/100`,
      higherBetter: true,
    },
    {
      label: 'Braking',
      aVal: leftSpec.stats.braking,
      bVal: rightSpec.stats.braking,
      fmt: (v: number) => `${v}/100`,
      higherBetter: true,
    },
    {
      label: 'Weight',
      aVal: leftSpec.stats.weightKg,
      bVal: rightSpec.stats.weightKg,
      fmt: (v: number) => `${v.toLocaleString()} kg`,
      higherBetter: false,
    },
  ];

  const renderCarHeaderCard = (
    side: 'A' | 'B',
    id: CarId,
    setId: (v: CarId) => void
  ) => {
    const spec = CAR_SPECS[id];
    const owned = save.cars[id]?.owned;
    const equipped = save.selectedCarId === id;
    const unlocked = isCarUnlockRuleMet(spec, save);
    const speedPct = Math.round((spec.stats.topSpeedKmh / MAX_CAR_TOP_SPEED_KMH) * 100);

    return (
      <div className="p-3.5 rounded-xl bg-[#0f1420] border border-white/10 space-y-2.5">
        <div className="flex items-center justify-between gap-2 text-[11px]">
          <span className="font-mono-num font-bold text-amber-400">
            CAR {side} · #{CAR_RANK_MAP[id]} / {CAR_ORDER.length}
          </span>
          <span className="font-mono-num font-semibold text-slate-300">
            {equipped
              ? 'EQUIPPED'
              : owned
                ? 'OWNED'
                : !unlocked
                  ? spec.unlockRule.label
                  : `${spec.price.toLocaleString()} pts`}
          </span>
        </div>

        <select
          aria-label={`Select Car ${side} to Compare`}
          value={id}
          onChange={(e) => setId(e.target.value as CarId)}
          className="w-full min-h-[42px] px-3 py-2 rounded-lg bg-slate-900 border border-white/15 text-xs sm:text-sm font-semibold text-white cursor-pointer"
        >
          {sortedIds.map((cid) => {
            const s = CAR_SPECS[cid];
            return (
              <option key={cid} value={cid}>
                #{CAR_RANK_MAP[cid]} · {getCarDisplayName(s)} ({s.stats.topSpeedKmh} km/h)
              </option>
            );
          })}
        </select>

        <div>
          <div className="text-[11px] text-slate-400">
            {getCarBrand(spec)} · {spec.engineLabel}
          </div>
          <div className="font-display text-base sm:text-lg font-bold text-white leading-tight">
            {getCarName(spec)}
          </div>
        </div>

        {/* Speed bar relative to fastest car (480 km/h) */}
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] text-slate-400 font-mono-num">
            <span>Speed Tier</span>
            <span>{spec.stats.topSpeedKmh} / {MAX_CAR_TOP_SPEED_KMH} km/h</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
            <div
              className={`h-full rounded-full ${side === 'A' ? 'bg-amber-400' : 'bg-cyan-400'}`}
              style={{ width: `${speedPct}%` }}
            />
          </div>
        </div>

        <div className="pt-1">
          {owned ? (
            <button
              type="button"
              disabled={equipped}
              onClick={() => onSelectCar(id)}
              className={`w-full min-h-[40px] px-3 py-2 rounded-lg text-xs font-bold inline-flex items-center justify-center gap-1.5 touch-manipulation ${
                equipped
                  ? 'bg-emerald-500/20 text-emerald-300 cursor-default'
                  : 'bg-amber-500 hover:bg-amber-400 text-slate-950 cursor-pointer'
              }`}
            >
              <Check className="w-3.5 h-3.5" />
              <span>{equipped ? 'EQUIPPED' : 'EQUIP CAR'}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onOpenShop}
              className="w-full min-h-[40px] px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer touch-manipulation"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>View in Car Shop</span>
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-40 h-dvh w-full bg-[#090b10]/96 flex flex-col overflow-hidden">
      <header className="shrink-0 flex items-center justify-between gap-3 border-b border-white/10 bg-[#0b0e16] pt-[max(0.5rem,env(safe-area-inset-top))] pb-2.5 max-lg:landscape:py-1.5 pl-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))] md:px-6 md:py-3.5">
        <div className="min-w-0">
          <h2 className="font-display text-base sm:text-lg md:text-xl font-bold text-white leading-tight flex items-center gap-2">
            <ArrowLeftRight className="w-5 h-5 text-cyan-400 shrink-0" />
            <span>COMPARE SUPERCARS</span>
          </h2>
          <p className="text-xs text-slate-400">
            All {CAR_ORDER.length} cars sorted from {CAR_SPECS[CAR_ORDER[0]].stats.topSpeedKmh} to{' '}
            {MAX_CAR_TOP_SPEED_KMH} km/h
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close Compare Cars"
          className="w-11 h-11 shrink-0 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-white cursor-pointer touch-manipulation"
        >
          <X className="w-5 h-5" />
        </button>
      </header>

      <div className="flex-1 min-h-0 dk-scroll p-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] md:p-6">
        <div className="max-w-4xl mx-auto space-y-4">
          {/* Sort Order Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 bg-[#0b0e16] border border-white/10 rounded-xl px-3.5 py-2.5">
            <span className="text-xs font-semibold text-slate-400">Dropdown Sort Order</span>
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  ['speed_asc', 'Speed ↑ (Default)'],
                  ['speed_desc', 'Speed ↓'],
                  ['accel', '0–100'],
                  ['hp', 'HP'],
                  ['price', 'Price'],
                ] as const
              ).map(([mode, label]) => (
                <button
                  type="button"
                  key={mode}
                  onClick={() => setSortMode(mode)}
                  className={`px-2.5 py-1.5 min-h-[34px] rounded-lg text-[11px] font-semibold cursor-pointer touch-manipulation ${
                    sortMode === mode
                      ? 'bg-amber-500 text-slate-950'
                      : 'bg-slate-900 text-slate-300 hover:text-white'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Two Car Pickers */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {renderCarHeaderCard('A', leftId, setLeftId)}
            {renderCarHeaderCard('B', rightId, setRightId)}
          </div>

          {/* Head-to-Head Spec Matrix */}
          <div className="rounded-xl bg-[#0f1420] border border-white/10 overflow-hidden">
            <div className="grid grid-cols-12 gap-2 px-3.5 py-2.5 border-b border-white/10 bg-slate-950/60 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              <div className="col-span-4">Metric</div>
              <div className="col-span-4 text-right text-amber-300 truncate">
                {getCarName(leftSpec)}
              </div>
              <div className="col-span-4 text-right text-cyan-300 truncate">
                {getCarName(rightSpec)}
              </div>
            </div>

            <div className="divide-y divide-white/5">
              {rows.map((r) => {
                const aWins = r.higherBetter ? r.aVal > r.bVal : r.aVal < r.bVal;
                const bWins = r.higherBetter ? r.bVal > r.aVal : r.bVal < r.aVal;
                return (
                  <div
                    key={r.label}
                    className="grid grid-cols-12 gap-2 px-3.5 py-2.5 text-xs items-center"
                  >
                    <div className="col-span-4 text-slate-300 font-medium">{r.label}</div>
                    <div
                      className={`col-span-4 text-right font-mono-num font-bold ${
                        aWins ? 'text-emerald-400' : bWins ? 'text-slate-400' : 'text-white'
                      }`}
                    >
                      {r.fmt(r.aVal)}
                    </div>
                    <div
                      className={`col-span-4 text-right font-mono-num font-bold ${
                        bWins ? 'text-emerald-400' : aWins ? 'text-slate-400' : 'text-white'
                      }`}
                    >
                      {r.fmt(r.bVal)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Full 16-Car Speed Ladder Reference */}
          <div className="rounded-xl bg-[#0f1420] border border-white/10 p-3.5 space-y-2">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Full 16-Supercar Speed Ladder
            </div>
            <div className="space-y-1.5">
              {CAR_ORDER.map((cid, idx) => {
                const s = CAR_SPECS[cid];
                const pct = Math.round((s.stats.topSpeedKmh / MAX_CAR_TOP_SPEED_KMH) * 100);
                const isSelectedPair = cid === leftId || cid === rightId;
                return (
                  <div
                    key={cid}
                    className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs ${
                      isSelectedPair ? 'bg-slate-800/90 border border-white/15' : ''
                    }`}
                  >
                    <span className="font-mono-num font-bold text-amber-400 w-7 shrink-0">
                      #{idx + 1}
                    </span>
                    <span className="font-semibold text-white truncate flex-1">
                      {getCarDisplayName(s)}
                    </span>
                    <div className="hidden sm:block w-28 h-1.5 rounded-full bg-slate-800 overflow-hidden shrink-0">
                      <div
                        className="h-full bg-cyan-400 rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="font-mono-num font-bold text-cyan-300 shrink-0 w-20 text-right">
                      {s.stats.topSpeedKmh} km/h
                    </span>
                    <span className="font-mono-num text-[11px] text-slate-400 shrink-0 w-12 text-right">
                      {s.stats.zeroToHundredSec}s
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
