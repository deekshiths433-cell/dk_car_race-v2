import React, { useMemo } from 'react';
import { Lightbulb } from 'lucide-react';
import { BIOME_META } from '../data/levels';
import { pickRacingTip } from '../data/tips';
import { LevelConfig } from '../types/game';

interface LoadingRaceOverlayProps {
  level: LevelConfig;
  progressPct: number;
}

export const LoadingRaceOverlay: React.FC<LoadingRaceOverlayProps> = ({
  level,
  progressPct,
}) => {
  const biome = BIOME_META[level.biome];
  const tip = useMemo(() => pickRacingTip(level.seed), [level.seed]);

  return (
    <div className="fixed inset-0 z-50 h-dvh w-full bg-[#090b10] flex flex-col items-center justify-center p-5 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))]">
      <div className="w-full max-w-md bg-[#0f1420] border border-white/15 rounded-2xl p-5 sm:p-6 space-y-4 shadow-2xl">
        <div className="space-y-1">
          <div className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: biome.accent }}>
            Level {level.levelNumber} · {biome.label} · {level.difficultyName}
          </div>
          <h2 className="font-display text-xl sm:text-2xl font-bold text-white leading-tight">
            {level.name}
          </h2>
          <p className="text-xs text-slate-400">
            Generating track geometry, AI rivals & weather · Seed #{level.seed}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1.5">
          <div className="h-2.5 w-full rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-amber-400 transition-all duration-150 rounded-full"
              style={{ width: `${Math.min(100, Math.max(8, progressPct))}%` }}
            />
          </div>
          <div className="flex justify-between text-[11px] font-mono-num text-slate-400">
            <span>Loading Circuit...</span>
            <span className="text-amber-300 font-bold">{Math.round(progressPct)}%</span>
          </div>
        </div>

        {/* Racing Tip */}
        <div className="p-3.5 rounded-xl bg-slate-900 border border-amber-500/25 flex items-start gap-3">
          <Lightbulb className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="min-w-0">
            <div className="text-[11px] font-bold uppercase tracking-wider text-amber-300">
              Pro Tip · {tip.title}
            </div>
            <p className="text-xs text-slate-300 leading-relaxed mt-0.5">{tip.body}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
