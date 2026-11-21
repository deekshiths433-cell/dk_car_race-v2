import React from 'react';
import {
  ArrowDown,
  ArrowLeftRight,
  ArrowUp,
  Camera,
  Flame,
  Gamepad2,
  Lightbulb,
  OctagonAlert,
  RotateCcw,
  Smartphone,
  Volume2,
  X,
} from 'lucide-react';

interface HowToPlayModalProps {
  isFirstTime?: boolean;
  isMobile: boolean;
  onClose: () => void;
}

export const HowToPlayModal: React.FC<HowToPlayModalProps> = ({
  isFirstTime = false,
  isMobile,
  onClose,
}) => {
  const controls = [
    {
      icon: ArrowUp,
      name: 'Accelerate',
      key: 'W / Up Arrow',
      touch: 'Right GAS Pedal',
      desc: 'Build speed through all 7 gears up to real-world supercar velocity.',
      color: 'text-emerald-400',
    },
    {
      icon: ArrowDown,
      name: 'Brake / Reverse',
      key: 'S / Down Arrow',
      touch: 'BRAKE Pedal',
      desc: 'Slow down before tight apexes or hold while stopped to reverse.',
      color: 'text-red-400',
    },
    {
      icon: ArrowLeftRight,
      name: 'Steer Left / Right',
      key: 'A / D or ← / →',
      touch: 'Buttons, Tilt, or Touch Wheel',
      desc: 'Switch between Buttons, Tilt gyroscope, or Steering Wheel anytime in Settings.',
      color: 'text-amber-400',
    },
    {
      icon: Flame,
      name: 'Nitro Boost',
      key: 'Shift',
      touch: 'NITRO Button',
      desc: 'Unleash short high-power afterburner bursts. Recharges as you drive & drift.',
      color: 'text-cyan-400',
    },
    {
      icon: OctagonAlert,
      name: 'Handbrake Drift',
      key: 'Space',
      touch: 'DRIFT Button',
      desc: 'Kick out the rear tires through hairpins for drift bonus points and fast Nitro.',
      color: 'text-amber-300',
    },
    {
      icon: Volume2,
      name: 'Supercar Horn',
      key: 'H',
      touch: 'HORN Button',
      desc: 'Sound the dual-tone supercar horn.',
      color: 'text-slate-200',
    },
    {
      icon: Lightbulb,
      name: 'Headlights',
      key: 'L',
      touch: 'LIGHTS Button',
      desc: 'Cycle Off, Low Beam, and High Beam. Use Q / E / X for indicators & hazards.',
      color: 'text-sky-300',
    },
    {
      icon: Camera,
      name: 'Camera View',
      key: 'C',
      touch: 'CAM Button',
      desc: 'Switch between Chase, Hood, Cockpit interior, and Cinematic views.',
      color: 'text-indigo-300',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-[#090b10]/95 flex flex-col">
      <div className="flex items-center justify-between px-4 md:px-6 py-3.5 border-b border-white/10 bg-[#0b0e16]">
        <div>
          <h2 className="font-display text-lg md:text-xl font-bold text-white">
            {isFirstTime ? 'WELCOME TO DK CAR RACE · QUICK TUTORIAL' : 'HOW TO PLAY'}
          </h2>
          <p className="text-xs text-slate-400">
            {isMobile
              ? 'Mobile Landscape Controls detected · Customizable in Settings'
              : 'Desktop Keyboard, Mouse & Gamepad Controls'}
          </p>
        </div>
        <button
          onClick={onClose}
          className="w-11 h-11 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-white cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 dk-scroll">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Device Quick Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-[#0f1420] border border-white/10 flex items-start gap-3">
              <Gamepad2 className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-display font-bold text-sm text-white mb-1">
                  Laptop / Desktop & Gamepad
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Use <strong>WASD</strong> or <strong>Arrow Keys</strong> to drive,{' '}
                  <strong>Shift</strong> for Nitro, <strong>Space</strong> for Handbrake,{' '}
                  <strong>R</strong> to Reset onto track, and <strong>Esc</strong> to Pause. Plugged-in controllers work automatically.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#0f1420] border border-white/10 flex items-start gap-3">
              <Smartphone className="w-6 h-6 text-cyan-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-display font-bold text-sm text-white mb-1">
                  Mobile Phone (Landscape Fullscreen)
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Hold your phone sideways. Supports multi-touch steering + gas simultaneously. Choose{' '}
                  <strong>Buttons</strong>, <strong>Tilt</strong>, or <strong>Steering Wheel</strong> mode and drag/resize controls in Settings.
                </p>
              </div>
            </div>
          </div>

          {/* Illustrated Control Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {controls.map((ctrl) => {
              const Icon = ctrl.icon;
              return (
                <div
                  key={ctrl.name}
                  className="p-4 rounded-xl bg-[#0f1420] border border-white/10 flex flex-col justify-between gap-3"
                >
                  <div>
                    <div className="w-10 h-10 rounded-lg bg-slate-900 border border-white/10 flex items-center justify-center mb-3">
                      <Icon className={`w-5 h-5 ${ctrl.color}`} />
                    </div>
                    <h4 className="font-display font-bold text-sm text-white">
                      {ctrl.name}
                    </h4>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      {ctrl.desc}
                    </p>
                  </div>
                  <div className="pt-2 border-t border-white/10 text-[11px] font-mono-num text-slate-300">
                    <div>Key: {ctrl.key}</div>
                    <div className="text-cyan-400">Touch: {ctrl.touch}</div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Extra Tip + Start Button */}
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-400/30 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3 text-xs text-slate-200">
              <RotateCcw className="w-5 h-5 text-amber-400 shrink-0" />
              <span>
                Crash damage slows your engine and wears tires—visit the <strong>Repair Shop</strong> between races or watch a short ad for a free full restoration!
              </span>
            </div>
            <button
              onClick={onClose}
              className="px-6 py-3 min-h-[44px] rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-display font-bold text-sm cursor-pointer"
            >
              {isFirstTime ? 'GOT IT · LET’S RACE' : 'CLOSE GUIDE'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
