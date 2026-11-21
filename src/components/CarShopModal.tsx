import React, { useState } from 'react';
import { Check, Lock, X } from 'lucide-react';
import { CAR_ORDER, CAR_SPECS } from '../data/cars';
import { ShowroomCanvas } from '../engine/ShowroomCanvas';
import { CarId, SaveState } from '../types/game';

interface CarShopModalProps {
  save: SaveState;
  onSelectCar: (carId: CarId) => void;
  onBuyCar: (carId: CarId) => void;
  onClose: () => void;
}

export const CarShopModal: React.FC<CarShopModalProps> = ({
  save,
  onSelectCar,
  onBuyCar,
  onClose,
}) => {
  const [previewId, setPreviewId] = useState<CarId>(save.selectedCarId);
  const spec = CAR_SPECS[previewId];
  const ownedState = save.cars[previewId];
  const levelLocked =
    Boolean(spec.unlockLevelReq) && save.highestUnlockedLevel < (spec.unlockLevelReq ?? 1);

  return (
    <div className="fixed inset-0 z-40 bg-[#090b10] flex flex-col">
      <div className="flex items-center justify-between px-4 md:px-6 py-3 border-b border-white/10 bg-[#0b0e16]">
        <div>
          <h2 className="font-display text-lg md:text-xl font-bold text-white">
            SUPERCAR DEALERSHIP
          </h2>
          <p className="text-xs text-slate-400">
            Balance:{' '}
            <span className="text-amber-400 font-mono-num font-bold">
              {save.points.toLocaleString()} pts
            </span>
          </p>
        </div>
        <button
          onClick={onClose}
          className="w-11 h-11 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-white cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12">
        {/* Left: 3D Showcase + Spec Sheet */}
        <div className="lg:col-span-7 flex flex-col min-h-0 bg-[#090b10]">
          <div className="flex-1 min-h-[210px] relative">
            <ShowroomCanvas
              carId={previewId}
              customization={ownedState.customization}
            />
          </div>

          <div className="p-4 md:p-5 border-t border-white/10 bg-[#0b0e16]">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-3">
              <div>
                <div className="text-xs text-amber-400 font-semibold uppercase tracking-wider">
                  {spec.brand} · {spec.engineLabel}
                </div>
                <h3 className="font-display text-2xl font-bold text-white">{spec.name}</h3>
                <p className="text-xs text-slate-400">{spec.tagline}</p>
              </div>

              {ownedState.owned ? (
                <button
                  onClick={() => {
                    onSelectCar(previewId);
                    onClose();
                  }}
                  className={`px-6 py-3 min-h-[44px] rounded-lg font-display font-bold text-sm inline-flex items-center gap-2 cursor-pointer ${
                    save.selectedCarId === previewId
                      ? 'bg-emerald-500 text-slate-950'
                      : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                  }`}
                >
                  <Check className="w-4 h-4" />
                  <span>
                    {save.selectedCarId === previewId ? 'SELECTED' : 'DRIVE THIS CAR'}
                  </span>
                </button>
              ) : levelLocked ? (
                <div className="px-4 py-2.5 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold inline-flex items-center gap-2">
                  <Lock className="w-4 h-4 text-amber-400" />
                  <span>Reach Level {spec.unlockLevelReq} to Unlock</span>
                </div>
              ) : (
                <button
                  disabled={save.points < spec.price}
                  onClick={() => onBuyCar(previewId)}
                  className={`px-6 py-3 min-h-[44px] rounded-lg font-display font-bold text-sm font-mono-num ${
                    save.points >= spec.price
                      ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 cursor-pointer'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  BUY FOR {spec.price.toLocaleString()} PTS
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs pt-3 border-t border-white/10">
              <div>
                <div className="text-slate-400">Top Speed</div>
                <div className="font-mono-num font-bold text-white text-sm">
                  {spec.stats.topSpeedKmh} km/h
                </div>
              </div>
              <div>
                <div className="text-slate-400">0–100 km/h</div>
                <div className="font-mono-num font-bold text-white text-sm">
                  {spec.stats.zeroToHundredSec} s
                </div>
              </div>
              <div>
                <div className="text-slate-400">Power</div>
                <div className="font-mono-num font-bold text-white text-sm">
                  {spec.stats.horsepower} HP
                </div>
              </div>
              <div>
                <div className="text-slate-400">Handling</div>
                <div className="font-mono-num font-bold text-cyan-400 text-sm">
                  {spec.stats.handling}/100
                </div>
              </div>
              <div>
                <div className="text-slate-400">Weight</div>
                <div className="font-mono-num font-bold text-white text-sm">
                  {spec.stats.weightKg} kg
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Car Catalog List */}
        <div className="lg:col-span-5 overflow-y-auto p-4 space-y-2.5 border-t lg:border-t-0 lg:border-l border-white/10 bg-[#0d111a] dk-scroll">
          {CAR_ORDER.map((id) => {
            const cSpec = CAR_SPECS[id];
            const cState = save.cars[id];
            const isSelected = save.selectedCarId === id;
            const isPreview = previewId === id;
            return (
              <button
                key={id}
                onClick={() => setPreviewId(id)}
                className={`w-full text-left p-3.5 rounded-xl border transition-colors cursor-pointer ${
                  isPreview
                    ? 'bg-amber-500/15 border-amber-400'
                    : 'bg-slate-900/80 border-white/10 hover:border-white/25'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="text-[11px] text-slate-400">
                      {cSpec.brand} {cSpec.isUnlockableHypercar ? '· Hypercar Prototype' : ''}
                    </div>
                    <div className="font-display font-bold text-base text-white">
                      {cSpec.name}
                    </div>
                  </div>
                  <div className="text-right font-mono-num text-xs">
                    {isSelected ? (
                      <span className="text-emerald-400 font-bold">DRIVING</span>
                    ) : cState.owned ? (
                      <span className="text-cyan-400 font-semibold">OWNED</span>
                    ) : (
                      <span className="text-amber-400 font-bold">
                        {cSpec.price.toLocaleString()} pts
                      </span>
                    )}
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-3 text-[11px] text-slate-400 font-mono-num">
                  <span>{cSpec.stats.topSpeedKmh} km/h</span>
                  <span>·</span>
                  <span>0–100: {cSpec.stats.zeroToHundredSec}s</span>
                  <span>·</span>
                  <span>{cSpec.stats.horsepower} HP</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
