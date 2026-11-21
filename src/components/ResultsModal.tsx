import React from 'react';
import { ArrowRight, Car, Home, RotateCcw, Trophy } from 'lucide-react';
import { CAR_SPECS } from '../data/cars';
import { RaceResult } from '../types/game';

interface ResultsModalProps {
  result: RaceResult;
  onNextLevel: () => void;
  onRetry: () => void;
  onOpenGarage: () => void;
  onHome: () => void;
}

export const ResultsModal: React.FC<ResultsModalProps> = ({
  result,
  onNextLevel,
  onRetry,
  onOpenGarage,
  onHome,
}) => {
  const spec = CAR_SPECS[result.carId];
  const podium = result.position <= 3;
  const suffix =
    result.position === 1
      ? 'st'
      : result.position === 2
        ? 'nd'
        : result.position === 3
          ? 'rd'
          : 'th';

  return (
    <div className="fixed inset-0 z-40 bg-black/85 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-[#0f1420] border border-white/15 rounded-2xl p-6 space-y-5">
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-400/30 flex items-center justify-center mx-auto mb-3">
            <Trophy
              className={`w-7 h-7 ${
                result.position === 1
                  ? 'text-amber-400'
                  : podium
                    ? 'text-cyan-400'
                    : 'text-slate-400'
              }`}
            />
          </div>
          <div className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
            Level {result.level.levelNumber} · {result.level.name}
          </div>
          <h2 className="font-display text-3xl font-bold text-white mt-1">
            {result.position}
            {suffix} PLACE{' '}
            <span className="text-slate-400 text-lg">/ {result.totalCars}</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {spec.brand} {spec.name} · Total Time{' '}
            <span className="font-mono-num text-white font-semibold">
              {result.finishTimeSec.toFixed(2)}s
            </span>
            {result.isNewBestTime && (
              <span className="text-emerald-400 font-bold ml-2">NEW RECORD!</span>
            )}
          </p>
        </div>

        {/* Points Breakdown */}
        <div className="p-4 rounded-xl bg-slate-900 border border-white/10 space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-slate-400">Position Reward</span>
            <span className="font-mono-num text-white font-semibold">
              +{result.positionPoints} pts
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Clean Driving Bonus</span>
            <span className="font-mono-num text-emerald-400 font-semibold">
              +{result.cleanBonus} pts
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Drifting Bonus</span>
            <span className="font-mono-num text-cyan-400 font-semibold">
              +{result.driftBonus} pts
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Nitro Boost Bonus</span>
            <span className="font-mono-num text-sky-400 font-semibold">
              +{result.nitroBonus} pts
            </span>
          </div>
          <div className="pt-2 border-t border-white/10 flex justify-between text-sm">
            <span className="font-semibold text-white">Total Points Earned</span>
            <span className="font-mono-num font-bold text-amber-400">
              +{result.totalPointsEarned.toLocaleString()} pts
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2.5">
          <button
            onClick={onNextLevel}
            className="col-span-2 py-3.5 min-h-[48px] rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-display font-bold text-sm inline-flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>
              {result.unlockedNextLevel
                ? `NEXT LEVEL (LEVEL ${result.level.levelNumber + 1})`
                : 'NEXT RACE'}
            </span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={onRetry}
            className="py-3 min-h-[44px] rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs inline-flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4 text-cyan-400" />
            <span>Retry</span>
          </button>

          <button
            onClick={onOpenGarage}
            className="py-3 min-h-[44px] rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs inline-flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Car className="w-4 h-4 text-amber-400" />
            <span>Garage</span>
          </button>

          <button
            onClick={onHome}
            className="col-span-2 py-2.5 min-h-[40px] rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/10 text-slate-300 font-semibold text-xs inline-flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>Return Home</span>
          </button>
        </div>
      </div>
    </div>
  );
};
