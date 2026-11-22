import React, { useMemo, useState } from 'react';
import { Tv, X, Zap } from 'lucide-react';
import { getCarDisplayName, getCarName } from '../data/brandConfig';
import {
  BODYKIT_STYLES,
  CALIPER_COLORS,
  CAR_ORDER,
  CAR_RANK_MAP,
  CAR_SPECS,
  PAINT_FINISHES,
  PAINT_SWATCHES,
  RIM_STYLES,
  SPOILER_STYLES,
  TIRE_STYLES,
  UNDERGLOW_COLORS,
  UPGRADE_COSTS,
} from '../data/cars';
import { ShowroomCanvas } from '../engine/ShowroomCanvas';
import { CarCustomization, CarId, CarUpgrades, SaveState } from '../types/game';
import { showRewardedAd } from '../utils/ads';

interface GarageModalProps {
  save: SaveState;
  onSelectCar: (carId: CarId) => void;
  onUpdateCustomization: (carId: CarId, patch: Partial<CarCustomization>, cost?: number, unlockKey?: string) => void;
  onUpgradePart: (carId: CarId, part: keyof CarUpgrades, cost: number) => void;
  onClose: () => void;
}

export const GarageModal: React.FC<GarageModalProps> = ({
  save,
  onSelectCar,
  onUpdateCustomization,
  onUpgradePart,
  onClose,
}) => {
  const [tab, setTab] = useState<'paint' | 'wheels' | 'aero' | 'upgrades'>('paint');
  const carId = save.selectedCarId;
  const spec = CAR_SPECS[carId];
  const carState = save.cars[carId];
  const c = carState.customization;
  const u = carState.upgrades;
  const ownedCarIds = useMemo(
    () => CAR_ORDER.filter((id) => save.cars[id]?.owned),
    [save.cars]
  );

  const isUnlocked = (key: string, cost: number) =>
    cost === 0 || c.unlockedItems.includes(key);

  const handleApplyOrUnlock = async (
    key: string,
    cost: number,
    patch: Partial<CarCustomization>,
    useAd = false
  ) => {
    if (isUnlocked(key, cost)) {
      onUpdateCustomization(carId, patch);
      return;
    }
    if (useAd) {
      const res = await showRewardedAd({
        title: 'Unlock Customization Free',
        rewardLabel: `Unlock ${key.replace(/_/g, ' ')}`,
      });
      if (res.completed) {
        onUpdateCustomization(carId, patch, 0, key);
      }
      return;
    }
    if (save.points >= cost) {
      onUpdateCustomization(carId, patch, cost, key);
    }
  };

  const renderUnlockableRow = (
    key: string,
    label: string,
    cost: number,
    active: boolean,
    patch: Partial<CarCustomization>,
    subLabel?: string
  ) => {
    const unlocked = isUnlocked(key, cost);
    return (
      <div
        key={key}
        className={`flex items-center justify-between gap-2 p-2.5 rounded-lg border transition-colors ${
          active
            ? 'bg-amber-500/15 border-amber-400 text-white'
            : 'bg-slate-900/80 border-white/10 text-slate-200'
        }`}
      >
        <div className="min-w-0">
          <div className="text-xs font-semibold truncate">{label}</div>
          {subLabel && <div className="text-[11px] text-slate-400">{subLabel}</div>}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {unlocked ? (
            <button
              onClick={() => onUpdateCustomization(carId, patch)}
              className={`px-3 py-1.5 min-h-[34px] rounded text-xs font-bold cursor-pointer ${
                active
                  ? 'bg-amber-500 text-slate-950'
                  : 'bg-slate-800 hover:bg-slate-700 text-white'
              }`}
            >
              {active ? 'Equipped' : 'Equip'}
            </button>
          ) : (
            <>
              <button
                disabled={save.points < cost}
                onClick={() => handleApplyOrUnlock(key, cost, patch, false)}
                className={`px-2.5 py-1.5 min-h-[34px] rounded text-xs font-bold font-mono-num ${
                  save.points >= cost
                    ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 cursor-pointer'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}
              >
                {cost} pts
              </button>
              <button
                onClick={() => handleApplyOrUnlock(key, cost, patch, true)}
                title="Watch Ad to Unlock Free"
                className="px-2 py-1.5 min-h-[34px] rounded bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/40 text-emerald-300 text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer"
              >
                <Tv className="w-3.5 h-3.5" />
                <span>Free</span>
              </button>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-40 h-dvh w-full bg-[#090b10] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between gap-3 border-b border-white/10 bg-[#0b0e16] pt-[max(0.5rem,env(safe-area-inset-top))] pb-2.5 max-lg:landscape:py-1.5 pl-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))] md:px-6 md:py-3">
        <div className="min-w-0">
          <h2 className="font-display text-base sm:text-lg md:text-xl font-bold text-white leading-tight truncate">
            GARAGE · #{CAR_RANK_MAP[carId]} {getCarDisplayName(spec)}
          </h2>
          <p className="text-xs text-slate-400">
            Drag car to inspect 360° · Points:{' '}
            <span className="text-amber-400 font-mono-num font-bold">
              {save.points.toLocaleString()}
            </span>
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close Garage"
          className="w-11 h-11 shrink-0 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-white cursor-pointer touch-manipulation"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Main Split: Scrollable unified view on phones, dual pane on desktop */}
      <div className="flex-1 min-h-0 flex flex-col lg:grid lg:grid-cols-12 max-lg:dk-scroll">
        <div className="lg:col-span-7 shrink-0 max-lg:h-[26dvh] max-lg:min-h-[120px] max-lg:max-h-[200px] max-lg:landscape:h-[26dvh] max-lg:landscape:min-h-[88px] max-lg:landscape:max-h-[112px] lg:h-full relative bg-[#090b10]">
          <ShowroomCanvas
            carId={carId}
            customization={c}
            damageBodyPct={carState.damage.body}
          />
          <div className="absolute bottom-2 left-3 bg-[#0b0e16]/85 border border-white/10 rounded-lg px-2.5 py-1 text-[11px] sm:text-xs text-slate-300 font-mono-num pointer-events-none">
            Top Speed: {Math.round(spec.stats.topSpeedKmh * (1 + u.engineLevel * 0.018 + u.turboLevel * 0.012))} km/h ·{' '}
            {spec.stats.horsepower + u.engineLevel * 28 + u.turboLevel * 22} HP
          </div>
        </div>

        <div className="lg:col-span-5 flex flex-col lg:min-h-0 border-t lg:border-t-0 lg:border-l border-white/10 bg-[#0d111a]">
          {/* Quick Switch Owned Supercars (sorted by speed) */}
          {ownedCarIds.length > 1 && (
            <div className="shrink-0 px-2.5 py-2 border-b border-white/10 bg-[#0b0e16] flex items-center gap-1.5 overflow-x-auto">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 shrink-0 mr-1">
                Switch:
              </span>
              {ownedCarIds.map((oid) => {
                const oSpec = CAR_SPECS[oid];
                const active = oid === carId;
                return (
                  <button
                    type="button"
                    key={oid}
                    onClick={() => onSelectCar(oid)}
                    className={`px-2.5 py-1.5 min-h-[34px] rounded-lg text-[11px] font-semibold shrink-0 whitespace-nowrap cursor-pointer touch-manipulation ${
                      active
                        ? 'bg-emerald-500 text-slate-950 font-bold'
                        : 'bg-slate-900 hover:bg-slate-800 text-slate-200 border border-white/10'
                    }`}
                  >
                    #{CAR_RANK_MAP[oid]} {getCarName(oSpec)} ({oSpec.stats.topSpeedKmh})
                  </button>
                );
              })}
            </div>
          )}

          {/* Tabs */}
          <div className="shrink-0 grid grid-cols-4 gap-1 p-2 border-b border-white/10 bg-[#0b0e16] pl-[max(0.5rem,env(safe-area-inset-left))] pr-[max(0.5rem,env(safe-area-inset-right))] lg:pl-2 lg:pr-2">
            {(
              [
                ['paint', 'Paint'],
                ['wheels', 'Wheels'],
                ['aero', 'Aero & Glow'],
                ['upgrades', 'Upgrades'],
              ] as const
            ).map(([id, label]) => (
              <button
                type="button"
                key={id}
                onClick={() => setTab(id)}
                className={`py-2.5 px-1.5 min-h-[40px] rounded-lg text-xs font-semibold transition-colors cursor-pointer touch-manipulation ${
                  tab === id
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-slate-900 text-slate-300 hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="lg:flex-1 lg:min-h-0 lg:dk-scroll p-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] lg:pl-4 lg:pr-4 space-y-5">
            {tab === 'paint' && (
              <>
                <div>
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2.5">
                    Body Paint Color
                  </h3>
                  <div className="grid grid-cols-6 gap-2">
                    {PAINT_SWATCHES.map((sw) => (
                      <button
                        key={sw.hex}
                        title={sw.name}
                        onClick={() => onUpdateCustomization(carId, { paintColor: sw.hex })}
                        className={`h-10 rounded-lg border-2 transition-transform cursor-pointer ${
                          c.paintColor === sw.hex
                            ? 'border-amber-400 scale-105'
                            : 'border-white/15 hover:scale-105'
                        }`}
                        style={{ backgroundColor: sw.hex }}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2.5">
                    Paint Finish
                  </h3>
                  <div className="space-y-2">
                    {PAINT_FINISHES.map((fin) =>
                      renderUnlockableRow(
                        `finish_${fin.id}`,
                        fin.label,
                        fin.cost,
                        c.paintFinish === fin.id,
                        { paintFinish: fin.id }
                      )
                    )}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs text-slate-300 mb-1.5">
                    <span>Window Tint</span>
                    <span className="font-mono-num">{Math.round(c.windowTint * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min={0.18}
                    max={0.9}
                    step={0.04}
                    value={c.windowTint}
                    onChange={(e) =>
                      onUpdateCustomization(carId, { windowTint: parseFloat(e.target.value) })
                    }
                    className="w-full accent-amber-500"
                  />
                </div>
              </>
            )}

            {tab === 'wheels' && (
              <>
                <div>
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2.5">
                    Rim Style
                  </h3>
                  <div className="space-y-2">
                    {RIM_STYLES.map((rim) =>
                      renderUnlockableRow(
                        `rim_${rim.id}`,
                        rim.label,
                        rim.cost,
                        c.rimStyle === rim.id,
                        { rimStyle: rim.id }
                      )
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2.5">
                    Rim Finish Color
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {['#cbd5e1', '#18181b', '#eab308', '#f8fafc', '#94a3b8', '#b45309'].map(
                      (col) => (
                        <button
                          key={col}
                          onClick={() => onUpdateCustomization(carId, { rimColor: col })}
                          className={`w-10 h-10 rounded-lg border-2 cursor-pointer ${
                            c.rimColor === col ? 'border-amber-400' : 'border-white/20'
                          }`}
                          style={{ backgroundColor: col }}
                        />
                      )
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2.5">
                    Brake Caliper Color
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {CALIPER_COLORS.map((col) => (
                      <button
                        key={col}
                        onClick={() => onUpdateCustomization(carId, { caliperColor: col })}
                        className={`w-10 h-10 rounded-lg border-2 cursor-pointer ${
                          c.caliperColor === col ? 'border-amber-400' : 'border-white/20'
                        }`}
                        style={{ backgroundColor: col }}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2.5">
                    Tire Compound
                  </h3>
                  <div className="space-y-2">
                    {TIRE_STYLES.map((tire) =>
                      renderUnlockableRow(
                        `tire_${tire.id}`,
                        tire.label,
                        tire.cost,
                        c.tireStyle === tire.id,
                        { tireStyle: tire.id },
                        tire.gripBonus > 0 ? `+${Math.round(tire.gripBonus * 100)}% Cornering Grip` : 'Standard Grip'
                      )
                    )}
                  </div>
                </div>
              </>
            )}

            {tab === 'aero' && (
              <>
                <div>
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2.5">
                    Rear Spoiler
                  </h3>
                  <div className="space-y-2">
                    {SPOILER_STYLES.map((sp) =>
                      renderUnlockableRow(
                        `spoiler_${sp.id}`,
                        sp.label,
                        sp.cost,
                        c.spoilerStyle === sp.id,
                        { spoilerStyle: sp.id }
                      )
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2.5">
                    Body Kit
                  </h3>
                  <div className="space-y-2">
                    {BODYKIT_STYLES.map((bk) =>
                      renderUnlockableRow(
                        `kit_${bk.id}`,
                        bk.label,
                        bk.cost,
                        c.bodyKit === bk.id,
                        { bodyKit: bk.id }
                      )
                    )}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-900 border border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-white">Underglow Neon Kit</span>
                    <button
                      onClick={() =>
                        onUpdateCustomization(carId, { underglowEnabled: !c.underglowEnabled })
                      }
                      className={`px-3 py-1.5 rounded text-xs font-bold cursor-pointer ${
                        c.underglowEnabled
                          ? 'bg-cyan-400 text-slate-950'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {c.underglowEnabled ? 'ON' : 'OFF'}
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {UNDERGLOW_COLORS.map((col) => (
                      <button
                        key={col}
                        onClick={() =>
                          onUpdateCustomization(carId, {
                            underglowColor: col,
                            underglowEnabled: true,
                          })
                        }
                        className={`w-9 h-9 rounded-lg border-2 cursor-pointer ${
                          c.underglowColor === col ? 'border-white' : 'border-white/15'
                        }`}
                        style={{ backgroundColor: col }}
                      />
                    ))}
                  </div>
                </div>
              </>
            )}

            {tab === 'upgrades' && (
              <div className="space-y-3">
                <p className="text-xs text-slate-400">
                  Precision mechanical upgrades give realistic performance gains.
                </p>
                {(
                  [
                    ['engineLevel', 'Engine ECU & Intake', '+1.8% Top Speed / +3.5% Accel per level'],
                    ['turboLevel', 'Twin-Turbo / Boost Mapping', '+1.2% Top Speed / +4% Boost per level'],
                    ['tiresLevel', 'Track Tire Compound', '+3% Lateral Cornering Grip per level'],
                    ['brakesLevel', 'Carbon-Ceramic Brakes', '+5% Braking Power per level'],
                  ] as const
                ).map(([part, title, desc]) => {
                  const lvl = u[part];
                  const isMax = lvl >= 5;
                  const cost = isMax ? 0 : UPGRADE_COSTS[lvl];
                  return (
                    <div
                      key={part}
                      className="p-3.5 rounded-xl bg-slate-900 border border-white/10"
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-sm font-semibold text-white">{title}</span>
                        <span className="font-mono-num text-xs font-bold text-amber-400">
                          Stage {lvl}/5
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mb-2.5">{desc}</p>

                      <div className="flex items-center gap-1.5 mb-3">
                        {[0, 1, 2, 3, 4].map((idx) => (
                          <div
                            key={idx}
                            className={`h-2 flex-1 rounded-full ${
                              idx < lvl ? 'bg-amber-400' : 'bg-slate-800'
                            }`}
                          />
                        ))}
                      </div>

                      <button
                        disabled={isMax || save.points < cost}
                        onClick={() => onUpgradePart(carId, part, cost)}
                        className={`w-full py-2.5 min-h-[40px] rounded-lg text-xs font-bold inline-flex items-center justify-center gap-1.5 ${
                          isMax
                            ? 'bg-emerald-500/20 text-emerald-300 cursor-default'
                            : save.points >= cost
                              ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 cursor-pointer'
                              : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                        }`}
                      >
                        <Zap className="w-3.5 h-3.5" />
                        <span>
                          {isMax ? 'MAXED OUT' : `Upgrade to Stage ${lvl + 1} · ${cost} pts`}
                        </span>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
