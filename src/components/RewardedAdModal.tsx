import React, { useEffect, useState } from 'react';
import { Tv, CheckCircle2 } from 'lucide-react';
import { RewardedAdRequest } from '../utils/ads';

interface RewardedAdModalProps {
  request: RewardedAdRequest;
  onComplete: (completed: boolean) => void;
}

export const RewardedAdModal: React.FC<RewardedAdModalProps> = ({
  request,
  onComplete,
}) => {
  const duration = request.durationSec ?? 4;
  const [secondsLeft, setSecondsLeft] = useState(duration);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const t = window.setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => window.clearTimeout(t);
  }, [secondsLeft]);

  return (
    <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#0f1420] border border-white/15 rounded-2xl p-6 text-center">
        <div className="w-12 h-12 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center mx-auto mb-4">
          <Tv className="w-6 h-6 text-amber-400" />
        </div>
        <h3 className="font-display text-xl font-bold text-white mb-1">
          {request.title}
        </h3>
        <p className="text-xs text-slate-400 mb-5">
          Simulated Rewarded Ad Preview (Swap with AdMob / Unity Ads SDK in production)
        </p>

        <div className="bg-slate-900 border border-white/10 rounded-xl p-4 mb-5">
          <div className="text-xs text-slate-400 mb-1">Reward Upon Completion</div>
          <div className="text-sm font-semibold text-emerald-400">
            {request.rewardLabel}
          </div>
          <div className="mt-3 h-2 w-full bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-500 transition-all duration-700"
              style={{ width: `${((duration - secondsLeft) / duration) * 100}%` }}
            />
          </div>
        </div>

        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => onComplete(false)}
            className="px-4 py-2.5 min-h-[44px] rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
          >
            Cancel
          </button>
          <button
            disabled={secondsLeft > 0}
            onClick={() => onComplete(true)}
            className={`px-5 py-2.5 min-h-[44px] rounded-lg text-xs font-bold inline-flex items-center gap-2 transition-colors ${
              secondsLeft > 0
                ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 cursor-pointer'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>
              {secondsLeft > 0
                ? `Claim in ${secondsLeft}s`
                : 'Claim Reward'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
