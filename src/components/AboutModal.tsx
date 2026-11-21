import React from 'react';
import { X } from 'lucide-react';
import { DkLogo } from './DkLogo';

interface AboutModalProps {
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-[#0f1420] border border-white/15 rounded-2xl p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-10 h-10 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-white cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-5">
          <DkLogo size="md" />
        </div>

        <p className="text-sm text-slate-300 leading-relaxed mb-5">
          DK Car Race is a high-speed 3D supercar racing experience built with Three.js PBR rendering, procedural circuit generation across 6 dynamic biomes, realistic gearbox/RPM vehicle dynamics, procedural per-engine audio synthesis, deep garage customization, and responsive cross-device desktop and mobile landscape controls.
        </p>

        <div className="p-4 rounded-xl bg-slate-900 border border-white/10 space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Creator</span>
            <span className="font-display font-bold text-amber-400 text-base">
              Created by DEEKSHITH.S
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Version</span>
            <span className="font-mono-num text-white font-semibold">v1.0.0</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Engine</span>
            <span className="text-slate-200">Three.js WebGL + Procedural Web Audio</span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="mt-5 w-full py-3 min-h-[44px] rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-display font-bold text-sm cursor-pointer"
        >
          BACK TO MENU
        </button>
      </div>
    </div>
  );
};
