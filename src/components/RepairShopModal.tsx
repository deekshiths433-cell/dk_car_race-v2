import React, { useState } from 'react';
import { CheckCircle2, Tv, Wrench, X } from 'lucide-react';
import { CAR_SPECS } from '../data/cars';
import { ShowroomCanvas } from '../engine/ShowroomCanvas';
import { CarId, SaveState } from '../types/game';
import { showRewardedAd } from '../utils/ads';
import { getCarDamagePercent, getRepairCost } from '../utils/storage';

interface RepairShopModalProps {
  save: SaveState;
  onRepairCar: (carId: CarId, cost: number) => void;
  onClose: () => void;
}

export const RepairShopModal: React.FC<RepairShopModalProps> = ({
  save,
  onRepairCar,
  onClose,
}) => {
  const [previewAfter, setPreviewAfter] = useState(false);
  const carId = save.selectedCarId;
  const spec = CAR_SPECS[carId];
  const carState = save.cars[carId];
  const damagePct = getCarDamagePercent(carState);
  const repairCost = getRepairCost(carState);

  const curTopSpeed = Math.round(
    spec.stats.topSpeedKmh * (1 - (carState.damage.engine / 100) * 0.28)
  );
  const curHandling = Math.round(
    spec.stats.handling * (1 - (carState.damage.tires / 100) * 0.32)
  );

  const handleFreeAdRepair = async () => {
    const res = await showRewardedAd({
      title: 'Pit-Crew Free Repair',
      rewardLabel: '100% Body, Engine & Tire Restoration',
    });
    if (res.completed) {
      onRepairCar(carId, 0);
    }
  };

  return (
    <div className="fixed inset-0 z-40 bg-[#090b10] flex flex-col">
      <div className="flex items-center justify-between px-4 md:px-6 py-3 border-b border-white/10 bg-[#0b0e16]">
        <div>
          <h2 className="font-display text-lg md:text-xl font-bold text-white">
            REPAIR SHOP · {spec.brand} {spec.name}
          </h2>
          <p className="text-xs text-slate-400">
            Points:{' '}
            <span className="text-amber-400 font-mono-num font-bold">
              {save.points.toLocaleString()}
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
        <div className="lg:col-span-7 h-56 sm:h-72 lg:h-full relative bg-[#090b10]">
          <ShowroomCanvas
            carId={carId}
            customization={carState.customization}
            damageBodyPct={previewAfter ? 0 : carState.damage.body}
          />
          <div className="absolute top-3 left-4 flex items-center gap-1 bg-[#0b0e16]/90 border border-white/10 rounded-lg p-1">
            <button
              onClick={() => setPreviewAfter(false)}
              className={`px-3 py-1.5 rounded text-xs font-semibold cursor-pointer ${
                !previewAfter ? 'bg-amber-500 text-slate-950' : 'text-slate-300'
              }`}
            >
              Current ({damagePct}% DMG)
            </button>
            <button
              onClick={() => setPreviewAfter(true)}
              className={`px-3 py-1.5 rounded text-xs font-semibold cursor-pointer ${
                previewAfter ? 'bg-emerald-500 text-slate-950' : 'text-slate-300'
              }`}
            >
              After Repair (0% DMG)
            </button>
          </div>
        </div>

        <div className="lg:col-span-5 p-5 overflow-y-auto border-t lg:border-t-0 lg:border-l border-white/10 bg-[#0d111a] flex flex-col justify-between gap-5 dk-scroll">
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-slate-900 border border-white/10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Overall Damage
                </span>
                <span
                  className={`font-mono-num text-xl font-bold ${
                    damagePct === 0
                      ? 'text-emerald-400'
                      : damagePct < 35
                        ? 'text-amber-400'
                        : 'text-red-400'
                  }`}
                >
                  {damagePct}%
                </span>
              </div>
              <div className="space-y-3 mt-3">
                {(
                  [
                    ['Bodywork & Aero', carState.damage.body],
                    ['Engine & Cooling', carState.damage.engine],
                    ['Tires & Suspension', carState.damage.tires],
                  ] as const
                ).map(([label, val]) => (
                  <div key={label}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-300">{label}</span>
                      <span className="font-mono-num text-slate-200">{Math.round(val)}%</span>
                    </div>
                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${
                          val > 50 ? 'bg-red-500' : val > 15 ? 'bg-amber-400' : 'bg-emerald-400'
                        }`}
                        style={{ width: `${Math.min(100, val)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900 border border-white/10">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                Before vs After Performance
              </h3>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <div className="text-slate-400">Top Speed</div>
                  <div className="font-mono-num font-bold text-white mt-0.5">
                    {curTopSpeed} km/h{' '}
                    <span className="text-emerald-400">→ {spec.stats.topSpeedKmh} km/h</span>
                  </div>
                </div>
                <div>
                  <div className="text-slate-400">Handling Grip</div>
                  <div className="font-mono-num font-bold text-white mt-0.5">
                    {curHandling} <span className="text-emerald-400">→ {spec.stats.handling}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {damagePct === 0 ? (
            <div className="p-4 rounded-xl bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 text-sm font-semibold flex items-center justify-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              <span>Vehicle is in 100% Mint Condition</span>
            </div>
          ) : (
            <div className="space-y-2.5">
              <button
                disabled={save.points < repairCost}
                onClick={() => onRepairCar(carId, repairCost)}
                className={`w-full py-3.5 min-h-[48px] rounded-xl font-display font-bold text-sm inline-flex items-center justify-center gap-2 ${
                  save.points >= repairCost
                    ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 cursor-pointer'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}
              >
                <Wrench className="w-4 h-4" />
                <span>REPAIR ALL ({repairCost.toLocaleString()} PTS)</span>
              </button>

              <button
                onClick={handleFreeAdRepair}
                className="w-full py-3.5 min-h-[48px] rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-display font-bold text-sm inline-flex items-center justify-center gap-2 cursor-pointer"
              >
                <Tv className="w-4 h-4" />
                <span>REPAIR FREE (WATCH AD)</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
