import React from 'react';
import { Lock, Play, X } from 'lucide-react';
import { BIOME_META, getLevelConfig, PRESET_LEVEL_COUNT } from '../data/levels';
import { SaveState } from '../types/game';

interface LevelSelectModalProps {
  save: SaveState;
  onSelectAndPlay: (levelNumber: number) => void;
  onClose: () => void;
}

export const LevelSelectModal: React.FC<LevelSelectModalProps> = ({
  save,
  onSelectAndPlay,
  onClose,
}) => {
  const totalShown = Math.max(PRESET_LEVEL_COUNT, save.highestUnlockedLevel + 1);
  const levels = Array.from({ length: totalShown }, (_, i) => getLevelConfig(i + 1));

  return (
    <div className="fixed inset-0 z-40 h-dvh w-full bg-[#090b10]/95 flex flex-col overflow-hidden">
      <div className="shrink-0 flex items-center justify-between gap-3 border-b border-white/10 bg-[#0b0e16] pt-[max(0.5rem,env(safe-area-inset-top))] pb-2.5 max-lg:landscape:py-1.5 pl-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))] md:px-6 md:py-3.5">
        <div className="min-w-0">
          <h2 className="font-display text-base sm:text-lg md:text-xl font-bold text-white leading-tight">
            PROCEDURAL CIRCUIT SELECT
          </h2>
          <p className="text-xs text-slate-400">
            Every race generates a fresh spline circuit · Difficulty & rival skill scale each level
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close Level Select"
          className="w-11 h-11 shrink-0 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-white cursor-pointer touch-manipulation"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 min-h-0 dk-scroll p-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] md:p-6">
        <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {levels.map((lvl) => {
            const unlocked = lvl.levelNumber <= save.highestUnlockedLevel;
            const biome = BIOME_META[lvl.biome];
            const bestTime = save.bestTimesByLevel[lvl.levelNumber];
            const isCurrent = save.currentLevel === lvl.levelNumber;

            return (
              <div
                key={lvl.levelNumber}
                className={`rounded-xl border p-4 flex flex-col justify-between gap-4 ${
                  isCurrent
                    ? 'bg-amber-500/10 border-amber-400'
                    : unlocked
                      ? 'bg-[#0f1420] border-white/10'
                      : 'bg-slate-900/40 border-white/5 opacity-60'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span
                      className="text-xs font-bold uppercase tracking-wider"
                      style={{ color: biome.accent }}
                    >
                      Level {lvl.levelNumber} · {biome.label}
                    </span>
                    <span className="text-[11px] text-slate-400 capitalize">
                      {lvl.timeOfDay} · {lvl.weather}
                    </span>
                  </div>
                  <h3 className="font-display text-lg font-bold text-white mb-1">
                    {lvl.name}
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {lvl.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-2">
                  <div className="text-[11px] text-slate-300 font-mono-num">
                    {bestTime ? (
                      <span>Best: {bestTime.toFixed(2)}s</span>
                    ) : (
                      <span>Reward: +{lvl.baseReward} pts</span>
                    )}
                  </div>

                  {unlocked ? (
                    <button
                      onClick={() => onSelectAndPlay(lvl.levelNumber)}
                      className="px-4 py-2 min-h-[40px] rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-display font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>RACE</span>
                    </button>
                  ) : (
                    <div className="inline-flex items-center gap-1.5 text-xs text-slate-400 font-semibold">
                      <Lock className="w-3.5 h-3.5" />
                      <span>Finish Top 3 in Lv {lvl.levelNumber - 1}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
