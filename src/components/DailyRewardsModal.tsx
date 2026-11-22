import React, { useState } from 'react';
import { Award, CheckCircle2, Gift, Trophy, X } from 'lucide-react';
import { BIOME_META } from '../data/levels';
import { SaveState } from '../types/game';

interface DailyRewardsModalProps {
  save: SaveState;
  onClaimDaily: () => void;
  onClaimMission: (missionId: string) => void;
  onClose: () => void;
}

export const DailyRewardsModal: React.FC<DailyRewardsModalProps> = ({
  save,
  onClaimDaily,
  onClaimMission,
  onClose,
}) => {
  const [tab, setTab] = useState<'daily' | 'ranks' | 'achievements'>('daily');
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(
    today.getDate()
  ).padStart(2, '0')}`;
  const canClaimDaily = save.lastDailyClaimDate !== todayStr;
  const nextStreakDay = (save.dailyStreak % 7) + 1;

  return (
    <div className="fixed inset-0 z-40 h-dvh w-full bg-[#090b10]/95 flex flex-col overflow-hidden">
      <div className="shrink-0 flex items-center justify-between gap-3 border-b border-white/10 bg-[#0b0e16] pt-[max(0.5rem,env(safe-area-inset-top))] pb-2.5 max-lg:landscape:py-1.5 pl-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))] md:px-6 md:py-3.5">
        <div className="min-w-0">
          <h2 className="font-display text-base sm:text-lg md:text-xl font-bold text-white leading-tight">
            DAILY REWARDS & RANKS
          </h2>
          <p className="text-xs text-slate-400">
            Daily Login Bonus · Missions · Leaderboard · Achievements
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close Daily Rewards"
          className="w-11 h-11 shrink-0 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-white cursor-pointer touch-manipulation"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="shrink-0 flex flex-wrap gap-2 py-2 max-lg:landscape:py-1.5 pl-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))] md:px-6 border-b border-white/10 bg-[#0d111a]">
        {(
          [
            ['daily', 'Daily & Missions'],
            ['ranks', 'Leaderboard'],
            ['achievements', 'Achievements'],
          ] as const
        ).map(([id, label]) => (
          <button
            type="button"
            key={id}
            onClick={() => setTab(id)}
            className={`px-3.5 py-2 min-h-[38px] rounded-lg text-xs font-semibold cursor-pointer touch-manipulation ${
              tab === id
                ? 'bg-amber-500 text-slate-950'
                : 'bg-slate-900 text-slate-300 hover:text-white'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex-1 min-h-0 dk-scroll p-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] md:p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {tab === 'daily' && (
            <>
              {/* 7-Day Streak */}
              <div className="p-5 rounded-xl bg-[#0f1420] border border-white/10">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-2.5">
                    <Gift className="w-5 h-5 text-amber-400" />
                    <div>
                      <h3 className="font-display font-bold text-base text-white">
                        Daily Login Streak ({save.dailyStreak} Days)
                      </h3>
                      <p className="text-xs text-slate-400">
                        Return daily for escalating point bonuses
                      </p>
                    </div>
                  </div>
                  <button
                    disabled={!canClaimDaily}
                    onClick={onClaimDaily}
                    className={`px-5 py-2.5 min-h-[44px] rounded-lg font-display font-bold text-xs ${
                      canClaimDaily
                        ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 cursor-pointer'
                        : 'bg-slate-800 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    {canClaimDaily ? `CLAIM DAY ${nextStreakDay} (+${250 + nextStreakDay * 150} PTS)` : 'CLAIMED TODAY'}
                  </button>
                </div>

                <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                  {[1, 2, 3, 4, 5, 6, 7].map((day) => {
                    const reward = 250 + day * 150;
                    const done = !canClaimDaily ? day <= ((save.dailyStreak - 1) % 7) + 1 : day < nextStreakDay;
                    const isNext = canClaimDaily && day === nextStreakDay;
                    return (
                      <div
                        key={day}
                        className={`p-2 rounded-lg border text-center ${
                          isNext
                            ? 'bg-amber-500/20 border-amber-400'
                            : done
                              ? 'bg-emerald-500/15 border-emerald-500/40'
                              : 'bg-slate-900 border-white/10'
                        }`}
                      >
                        <div className="text-[10px] text-slate-400">Day {day}</div>
                        <div className="font-mono-num text-xs font-bold text-white mt-0.5">
                          +{reward}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Daily Missions */}
              <div className="space-y-2.5">
                <h3 className="font-display font-bold text-base text-white">
                  Daily Missions
                </h3>
                {save.missions.map((m) => {
                  const done = m.progress >= m.target;
                  return (
                    <div
                      key={m.id}
                      className="p-4 rounded-xl bg-[#0f1420] border border-white/10 flex flex-wrap items-center justify-between gap-4"
                    >
                      <div className="flex-1 min-w-[200px]">
                        <div className="text-sm font-semibold text-white">{m.title}</div>
                        <div className="text-xs text-slate-400">{m.description}</div>
                        <div className="mt-2 flex items-center gap-2">
                          <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden max-w-xs">
                            <div
                              className="h-full bg-cyan-400"
                              style={{
                                width: `${Math.min(100, (m.progress / m.target) * 100)}%`,
                              }}
                            />
                          </div>
                          <span className="font-mono-num text-xs text-slate-300">
                            {Math.min(m.target, Math.round(m.progress))}/{m.target}
                          </span>
                        </div>
                      </div>

                      {m.claimed ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                          <CheckCircle2 className="w-4 h-4" />
                          Claimed
                        </span>
                      ) : (
                        <button
                          disabled={!done}
                          onClick={() => onClaimMission(m.id)}
                          className={`px-4 py-2 min-h-[40px] rounded-lg text-xs font-bold font-mono-num ${
                            done
                              ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 cursor-pointer'
                              : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                          }`}
                        >
                          {done ? `CLAIM +${m.reward}` : `+${m.reward} pts`}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {tab === 'ranks' && (
            <div className="rounded-xl bg-[#0f1420] border border-white/10 overflow-hidden">
              <div className="px-4 py-3 border-b border-white/10 flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-400" />
                <span className="font-display font-bold text-sm text-white">
                  Circuit Records & Hall of Fame
                </span>
              </div>
              <div className="divide-y divide-white/10">
                {save.leaderboard.map((entry, idx) => (
                  <div
                    key={entry.id}
                    className="px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono-num font-bold text-amber-400 w-6">
                        #{idx + 1}
                      </span>
                      <div>
                        <div className="font-semibold text-white">{entry.driverName}</div>
                        <div className="text-slate-400">
                          {entry.carName} · Lv {entry.levelNumber} ({BIOME_META[entry.biome].label})
                        </div>
                      </div>
                    </div>
                    <div className="text-right font-mono-num">
                      <div className="font-bold text-cyan-400">
                        {entry.bestTimeSec.toFixed(2)}s
                      </div>
                      <div className="text-slate-400">{entry.points.toLocaleString()} pts</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'achievements' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {save.achievements.map((ach) => (
                <div
                  key={ach.id}
                  className={`p-4 rounded-xl border ${
                    ach.unlocked
                      ? 'bg-emerald-500/10 border-emerald-500/40'
                      : 'bg-[#0f1420] border-white/10 opacity-75'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Award
                        className={`w-5 h-5 shrink-0 ${
                          ach.unlocked ? 'text-emerald-400' : 'text-slate-500'
                        }`}
                      />
                      <div className="font-semibold text-sm text-white">{ach.title}</div>
                    </div>
                    <span className="font-mono-num text-xs font-bold text-amber-400">
                      +{ach.reward} pts
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1.5">{ach.description}</p>
                  <div className="mt-2 text-[11px] font-semibold">
                    {ach.unlocked ? (
                      <span className="text-emerald-400">Unlocked</span>
                    ) : (
                      <span className="text-slate-500">Locked</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
