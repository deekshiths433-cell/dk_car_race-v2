import React from 'react';
import { ArrowRight, Bookmark, Car, Flag, Home, RotateCcw, Trophy } from 'lucide-react';
import { CAR_SPECS } from '../data/cars';
import { RaceResult } from '../types/game';
import { getResultsHeadline } from '../utils/raceStandings';

interface ResultsModalProps {
  result: RaceResult;
  isFavoriteMap: boolean;
  onToggleFavoriteMap: () => void;
  onNextLevel: () => void;
  onRetry: () => void;
  onOpenGarage: () => void;
  onHome: () => void;
}

const getOrdinalSuffix = (n: number): string => {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return 'th';
  switch (n % 10) {
    case 1:
      return 'st';
    case 2:
      return 'nd';
    case 3:
      return 'rd';
    default:
      return 'th';
  }
};

const formatRaceTime = (sec: number): string => {
  const mins = Math.floor(sec / 60);
  const rem = sec % 60;
  if (mins > 0) {
    return `${mins}:${rem < 10 ? '0' : ''}${rem.toFixed(2)}`;
  }
  return `${sec.toFixed(2)}s`;
};

export const ResultsModal: React.FC<ResultsModalProps> = ({
  result,
  isFavoriteMap,
  onToggleFavoriteMap,
  onNextLevel,
  onRetry,
  onOpenGarage,
  onHome,
}) => {
  const spec = CAR_SPECS[result.carId];
  const podium = result.position <= 3;
  const headline = getResultsHeadline(result.position);
  const suffix = getOrdinalSuffix(result.position);
  const standings = result.standings ?? [];
  const leaderTime =
    standings.length > 0
      ? standings[0].finishTimeSec ?? standings[0].estimatedTimeSec
      : result.finishTimeSec;

  return (
    <div className="fixed inset-0 z-40 h-dvh w-full bg-black/85 dk-scroll flex flex-col p-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))]">
      <div className="w-full max-w-lg my-auto mx-auto bg-[#0f1420] border border-white/15 rounded-2xl p-5 sm:p-6 space-y-4">
        {/* Header & Result Title */}
        <div className="text-center">
          <div
            className={`w-14 h-14 rounded-2xl border flex items-center justify-center mx-auto mb-3 ${
              result.position === 1
                ? 'bg-amber-500/15 border-amber-400/40'
                : podium
                  ? 'bg-cyan-500/15 border-cyan-400/40'
                  : 'bg-slate-800 border-white/15'
            }`}
          >
            {podium ? (
              <Trophy
                className={`w-7 h-7 ${
                  result.position === 1 ? 'text-amber-400' : 'text-cyan-400'
                }`}
              />
            ) : (
              <Flag className="w-7 h-7 text-slate-300" />
            )}
          </div>
          <div className="flex items-center justify-center gap-2 text-xs font-semibold text-amber-400 uppercase tracking-wider">
            <span>
              Level {result.level.levelNumber} · {result.level.name}
            </span>
            <button
              type="button"
              onClick={onToggleFavoriteMap}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-semibold normal-case tracking-normal cursor-pointer touch-manipulation ${
                isFavoriteMap
                  ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                  : 'bg-slate-800 hover:bg-slate-700 border-white/15 text-slate-300'
              }`}
            >
              <Bookmark className={`w-3 h-3 ${isFavoriteMap ? 'fill-current' : ''}`} />
              <span>{isFavoriteMap ? 'Saved Seed' : `Save #${result.level.seed}`}</span>
            </button>
          </div>
          <h2
            className={`font-display text-3xl sm:text-4xl font-bold tracking-wide mt-1 ${
              result.position === 1
                ? 'text-amber-400'
                : podium
                  ? 'text-cyan-300'
                  : 'text-slate-100'
            }`}
          >
            {headline}
          </h2>
          <div className="font-display text-lg font-bold text-white mt-0.5 font-mono-num">
            {result.position}
            {suffix} PLACE{' '}
            <span className="text-slate-400 text-sm">/ {result.totalCars}</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {result.position === 1
              ? 'You finished in 1st place!'
              : `Finished ${result.position}${suffix} out of ${result.totalCars} racers`}{' '}
            · {spec.brand} {spec.name} · Time{' '}
            <span className="font-mono-num text-white font-semibold">
              {formatRaceTime(result.finishTimeSec)}
            </span>
            {result.isNewBestTime && (
              <span className="text-emerald-400 font-bold ml-2">NEW RECORD!</span>
            )}
          </p>
          {typeof result.ghostBestTimeSec === 'number' && (
            <p className="text-[11px] font-mono-num mt-1">
              {(() => {
                const diff = result.finishTimeSec - result.ghostBestTimeSec;
                return diff <= 0 ? (
                  <span className="text-emerald-400 font-semibold">
                    {diff.toFixed(2)}s faster than PB Ghost ({formatRaceTime(result.ghostBestTimeSec)})
                  </span>
                ) : (
                  <span className="text-cyan-300">
                    +{diff.toFixed(2)}s vs PB Ghost ({formatRaceTime(result.ghostBestTimeSec)})
                  </span>
                );
              })()}
            </p>
          )}
        </div>

        {/* Final Standings & Rivals' Times */}
        {standings.length > 0 && (
          <div className="p-3.5 rounded-xl bg-slate-900/95 border border-white/10 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-slate-400 px-1">
              <span>Final Standings</span>
              <span>Finish Time</span>
            </div>
            <div className="space-y-1.5">
              {standings.map((entry) => {
                const entrySuffix = getOrdinalSuffix(entry.position);
                const entryTime =
                  entry.finishTimeSec !== null
                    ? entry.finishTimeSec
                    : entry.estimatedTimeSec;
                const gapSec = Math.max(0, entryTime - leaderTime);

                return (
                  <div
                    key={entry.id}
                    className={`flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg border text-xs ${
                      entry.isPlayer
                        ? 'bg-amber-500/12 border-amber-400/40 text-white'
                        : 'bg-slate-950/60 border-white/5 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className={`font-display font-bold font-mono-num w-8 shrink-0 ${
                          entry.position === 1
                            ? 'text-amber-400'
                            : entry.position <= 3
                              ? 'text-cyan-300'
                              : 'text-slate-400'
                        }`}
                      >
                        {entry.position}
                        {entrySuffix}
                      </span>
                      <div className="min-w-0">
                        <div className="font-semibold truncate flex items-center gap-1.5">
                          <span className={entry.isPlayer ? 'text-amber-300' : 'text-white'}>
                            {entry.name}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 truncate">
                          {entry.carName}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0 font-mono-num">
                      {entry.finishTimeSec !== null ? (
                        <div className="font-semibold text-white">
                          {formatRaceTime(entry.finishTimeSec)}
                        </div>
                      ) : (
                        <div className="font-semibold text-slate-300">
                          ~{formatRaceTime(entry.estimatedTimeSec)}
                        </div>
                      )}
                      <div className="text-[10px] text-slate-400">
                        {entry.position === 1
                          ? 'Leader'
                          : entry.finished
                            ? `+${gapSec.toFixed(2)}s`
                            : `+${gapSec.toFixed(2)}s est.`}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Points Breakdown */}
        <div className="p-3.5 rounded-xl bg-slate-900 border border-white/10 space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-slate-400">
              Position Reward ({result.position}
              {suffix})
            </span>
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
            className="col-span-2 py-3.5 min-h-[48px] rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-display font-bold text-sm inline-flex items-center justify-center gap-2 cursor-pointer touch-manipulation"
          >
            <span>
              {result.unlockedNextLevel
                ? `NEXT LEVEL (LEVEL ${result.level.levelNumber + 1}) · NEW MAP`
                : 'NEXT RACE · NEW MAP'}
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
