import React from 'react';
import { Home, Play, RotateCcw, Settings } from 'lucide-react';
import { ControlMode } from '../types/game';

interface PauseModalProps {
  controlMode: ControlMode;
  onChangeControlMode: (mode: ControlMode) => void;
  onResume: () => void;
  onRestart: () => void;
  onOpenSettings: () => void;
  onQuitHome: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  controlMode,
  onChangeControlMode,
  onResume,
  onRestart,
  onOpenSettings,
  onQuitHome,
}) => {
  return (
    <div className="fixed inset-0 z-40 h-dvh w-full bg-black/80 dk-scroll flex flex-col p-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))]">
      <div className="w-full max-w-md my-auto mx-auto bg-[#0f1420] border border-white/15 rounded-2xl p-5 sm:p-6 space-y-4 sm:space-y-5">
        <div className="text-center">
          <h2 className="font-display text-2xl font-bold text-white">RACE PAUSED</h2>
          <p className="text-xs text-slate-400 mt-1">Adjust settings or switch controls anytime</p>
        </div>

        {/* Quick Mobile Control Mode Toggle */}
        <div className="p-3 rounded-xl bg-slate-900 border border-white/10">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Quick Control Mode
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {(
              [
                ['buttons', 'Buttons'],
                ['tilt', 'Tilt'],
                ['wheel', 'Wheel'],
              ] as const
            ).map(([mode, label]) => (
              <button
                key={mode}
                onClick={() => onChangeControlMode(mode)}
                className={`py-2 px-2 rounded-lg text-xs font-semibold cursor-pointer ${
                  controlMode === mode
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-slate-800 text-slate-300 hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2.5">
          <button
            onClick={onResume}
            className="w-full py-3.5 min-h-[48px] rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-display font-bold text-sm inline-flex items-center justify-center gap-2 cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>RESUME RACE</span>
          </button>

          <button
            onClick={onRestart}
            className="w-full py-3 min-h-[44px] rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm inline-flex items-center justify-center gap-2 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4 text-cyan-400" />
            <span>Restart Circuit</span>
          </button>

          <button
            onClick={onOpenSettings}
            className="w-full py-3 min-h-[44px] rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm inline-flex items-center justify-center gap-2 cursor-pointer"
          >
            <Settings className="w-4 h-4 text-amber-400" />
            <span>Controls & Settings</span>
          </button>

          <button
            onClick={onQuitHome}
            className="w-full py-3 min-h-[44px] rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/10 text-slate-300 font-semibold text-sm inline-flex items-center justify-center gap-2 cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>Exit to Home</span>
          </button>
        </div>
      </div>
    </div>
  );
};
