import React, { useRef, useState } from 'react';
import { RotateCcw, Sliders, Volume2, X } from 'lucide-react';
import {
  ControlMode,
  DifficultySetting,
  GameSettings,
  HudVisibilityConfig,
  MobileLayoutConfig,
  QualityPreset,
  SteeringAssist,
} from '../types/game';
import { getDefaultMobileLayout } from '../utils/storage';

interface SettingsModalProps {
  settings: GameSettings;
  onChange: (patch: Partial<GameSettings>) => void;
  onClose: () => void;
  initialTab?: 'general' | 'audio' | 'controls';
}

type LayoutKey = keyof MobileLayoutConfig['positions'];

const LAYOUT_LABELS: { key: LayoutKey; label: string; color: string }[] = [
  { key: 'steerLeft', label: 'LEFT', color: 'bg-amber-500 text-slate-950' },
  { key: 'steerRight', label: 'RIGHT', color: 'bg-amber-500 text-slate-950' },
  { key: 'wheel', label: 'WHEEL / CAL', color: 'bg-cyan-400 text-slate-950' },
  { key: 'accel', label: 'GAS', color: 'bg-emerald-500 text-slate-950' },
  { key: 'brake', label: 'BRAKE', color: 'bg-red-500 text-white' },
  { key: 'nitro', label: 'NITRO', color: 'bg-sky-400 text-slate-950' },
  { key: 'handbrake', label: 'DRIFT', color: 'bg-orange-400 text-slate-950' },
  { key: 'horn', label: 'HORN', color: 'bg-slate-200 text-slate-950' },
  { key: 'lights', label: 'LIGHTS', color: 'bg-amber-300 text-slate-950' },
  { key: 'camera', label: 'CAM', color: 'bg-indigo-400 text-slate-950' },
];

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  onChange,
  onClose,
  initialTab = 'general',
}) => {
  const [tab, setTab] = useState<'general' | 'audio' | 'controls'>(initialTab);
  const [previewTestInput, setPreviewTestInput] = useState(0);
  const [draggingKey, setDraggingKey] = useState<LayoutKey | null>(null);
  const canvasBoxRef = useRef<HTMLDivElement>(null);

  const updateLayout = (patch: Partial<MobileLayoutConfig>) => {
    onChange({
      mobileLayout: {
        ...settings.mobileLayout,
        ...patch,
      },
    });
  };

  const handleDragMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingKey || !canvasBoxRef.current) return;
    const rect = canvasBoxRef.current.getBoundingClientRect();
    const xPct = Math.max(6, Math.min(94, ((e.clientX - rect.left) / rect.width) * 100));
    const yPct = Math.max(10, Math.min(90, ((e.clientY - rect.top) / rect.height) * 100));
    updateLayout({
      positions: {
        ...settings.mobileLayout.positions,
        [draggingKey]: { xPct: Math.round(xPct), yPct: Math.round(yPct) },
      },
    });
  };

  // Live steering response curve preview calculation
  const absIn = Math.abs(previewTestInput);
  const effectiveResponse =
    absIn < settings.steeringDeadZone
      ? 0
      : Math.max(-1, Math.min(1, previewTestInput * settings.steeringSensitivity));

  return (
    <div className="fixed inset-0 z-50 h-dvh w-full bg-[#090b10]/95 flex flex-col overflow-hidden">
      <div className="shrink-0 flex items-center justify-between gap-3 border-b border-white/10 bg-[#0b0e16] pt-[max(0.5rem,env(safe-area-inset-top))] pb-2.5 max-lg:landscape:py-1.5 pl-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))] md:px-6 md:py-3.5">
        <div className="flex items-center gap-2.5">
          <Sliders className="w-5 h-5 text-amber-400" />
          <h2 className="font-display text-base sm:text-lg md:text-xl font-bold text-white">
            SETTINGS
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close Settings"
          className="w-11 h-11 shrink-0 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-white cursor-pointer touch-manipulation"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="shrink-0 flex flex-wrap gap-2 py-2 max-lg:landscape:py-1.5 pl-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))] md:px-6 border-b border-white/10 bg-[#0d111a]">
        {(
          [
            ['general', 'Graphics & Display'],
            ['audio', 'Audio'],
            ['controls', 'Controls & Layout'],
          ] as const
        ).map(([id, label]) => (
          <button
            type="button"
            key={id}
            onClick={() => setTab(id)}
            className={`px-3.5 sm:px-4 py-2 min-h-[38px] rounded-lg text-xs font-semibold cursor-pointer touch-manipulation ${
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
          {tab === 'general' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-[#0f1420] border border-white/10">
                <h3 className="text-sm font-semibold text-white mb-1">
                  Race Difficulty
                </h3>
                <p className="text-xs text-slate-400 mb-3">
                  Adjusts rival pace scaling, overtaking aggression, defensive blocking, and checkpoint timers.
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      ['easy', 'Easy', '-6% Rival Pace'],
                      ['normal', 'Normal', 'Matched Progression'],
                      ['hard', 'Hard', '+5% Pace · Blocking · CP Timer'],
                    ] as [DifficultySetting, string, string][]
                  ).map(([val, title, sub]) => (
                    <button
                      type="button"
                      key={val}
                      onClick={() => onChange({ difficultySetting: val })}
                      className={`p-2.5 rounded-lg border text-left cursor-pointer touch-manipulation ${
                        (settings.difficultySetting ?? 'normal') === val
                          ? 'bg-amber-500 border-amber-400 text-slate-950'
                          : 'bg-slate-900 border-white/10 text-slate-300 hover:text-white'
                      }`}
                    >
                      <div className="text-xs font-bold">{title}</div>
                      <div
                        className={`text-[10px] mt-0.5 ${
                          (settings.difficultySetting ?? 'normal') === val
                            ? 'text-slate-900 font-semibold'
                            : 'text-slate-400'
                        }`}
                      >
                        {sub}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#0f1420] border border-white/10">
                <h3 className="text-sm font-semibold text-white mb-1">
                  Graphics Quality
                </h3>
                <p className="text-xs text-slate-400 mb-3">
                  Auto-Detect keeps mobile phones smooth at 60 FPS and unlocks Bloom & High Shadows on capable GPUs.
                </p>
                <div className="grid grid-cols-5 gap-2">
                  {(['auto', 'low', 'medium', 'high', 'ultra'] as QualityPreset[]).map((q) => (
                    <button
                      key={q}
                      onClick={() => onChange({ quality: q })}
                      className={`py-2.5 rounded-lg text-xs font-semibold capitalize cursor-pointer ${
                        settings.quality === q
                          ? 'bg-amber-500 text-slate-950'
                          : 'bg-slate-900 text-slate-300 hover:text-white'
                      }`}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#0f1420] border border-white/10 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold text-white">Speedometer Unit</div>
                  <div className="text-xs text-slate-400">Switch between km/h and mph</div>
                </div>
                <div className="flex gap-1.5 bg-slate-900 p-1 rounded-lg">
                  {(['kmh', 'mph'] as const).map((unit) => (
                    <button
                      type="button"
                      key={unit}
                      onClick={() => onChange({ speedUnit: unit })}
                      className={`px-4 py-2 rounded-md text-xs font-bold uppercase cursor-pointer touch-manipulation ${
                        settings.speedUnit === unit
                          ? 'bg-amber-500 text-slate-950'
                          : 'text-slate-300'
                      }`}
                    >
                      {unit === 'kmh' ? 'KM/H' : 'MPH'}
                    </button>
                  ))}
                </div>
              </div>

              {/* HUD Size Slider (Small / Medium / Large) & Element Toggles */}
              <div className="p-4 rounded-xl bg-[#0f1420] border border-white/10 space-y-4">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <h3 className="text-sm font-semibold text-white">In-Race HUD Size</h3>
                    <span className="font-mono-num text-xs font-bold text-amber-400">
                      {settings.hudScale <= 0.88
                        ? 'Small'
                        : settings.hudScale >= 1.12
                          ? 'Large'
                          : 'Medium'}{' '}
                      ({Math.round(settings.hudScale * 100)}%)
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mb-3">
                    Scale speedometer, minimap, and race telemetry for your phone or monitor
                  </p>
                  <input
                    type="range"
                    aria-label="HUD Size"
                    min={0.8}
                    max={1.2}
                    step={0.05}
                    value={settings.hudScale}
                    onChange={(e) => onChange({ hudScale: parseFloat(e.target.value) })}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {(
                      [
                        [0.8, 'Small'],
                        [1.0, 'Medium'],
                        [1.2, 'Large'],
                      ] as const
                    ).map(([presetVal, label]) => {
                      const active = Math.abs(settings.hudScale - presetVal) < 0.04;
                      return (
                        <button
                          type="button"
                          key={label}
                          onClick={() => onChange({ hudScale: presetVal })}
                          className={`py-2 min-h-[38px] rounded-lg text-xs font-semibold cursor-pointer touch-manipulation ${
                            active
                              ? 'bg-amber-500 text-slate-950'
                              : 'bg-slate-900 text-slate-300 hover:text-white'
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-3 border-t border-white/10 space-y-2.5">
                  <div className="text-sm font-semibold text-white">
                    Show / Hide HUD Elements
                  </div>
                  {(
                    [
                      ['speedometer', 'Speedometer, Gear & RPM', 'Digital speed readout, gear indicator, and RPM bar'],
                      ['nitro', 'Nitro Bar', 'Boost reserve gauge below the speedometer'],
                      ['position', 'Race Position', 'Current rank out of total racers'],
                      ['lapTime', 'Lap & Timer', 'Current lap counter and elapsed race clock'],
                      ['minimap', 'Track Minimap', 'Live overhead course and rival positions'],
                    ] as [keyof HudVisibilityConfig, string, string][]
                  ).map(([key, title, desc]) => {
                    const visible = settings.hudElements[key];
                    return (
                      <div
                        key={key}
                        className="flex items-center justify-between gap-3 py-1.5"
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-slate-100">{title}</div>
                          <div className="text-[11px] text-slate-400">{desc}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            onChange({
                              hudElements: {
                                ...settings.hudElements,
                                [key]: !visible,
                              },
                            })
                          }
                          className={`px-3.5 py-2 min-h-[38px] min-w-[78px] rounded-lg text-xs font-bold shrink-0 cursor-pointer touch-manipulation ${
                            visible
                              ? 'bg-emerald-500 text-slate-950'
                              : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          {visible ? 'SHOWN' : 'HIDDEN'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#0f1420] border border-white/10 flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold text-white">
                    Show Keyboard Control Hints During Race
                  </div>
                  <div className="text-xs text-slate-400">
                    Displays compact key reminder bar on Laptop / Desktop
                  </div>
                </div>
                <button
                  onClick={() => onChange({ showDesktopHints: !settings.showDesktopHints })}
                  className={`px-4 py-2 rounded-lg text-xs font-bold cursor-pointer ${
                    settings.showDesktopHints
                      ? 'bg-emerald-500 text-slate-950'
                      : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {settings.showDesktopHints ? 'SHOWN' : 'HIDDEN'}
                </button>
              </div>

              <div className="p-4 rounded-xl bg-[#0f1420] border border-white/10 flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold text-white">
                    Personal Best Ghost Car
                  </div>
                  <div className="text-xs text-slate-400">
                    Race against a semi-transparent ghost of your best leaderboard time on each level
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onChange({ showGhost: !(settings.showGhost !== false) })}
                  className={`px-4 py-2 rounded-lg text-xs font-bold cursor-pointer touch-manipulation ${
                    settings.showGhost !== false
                      ? 'bg-cyan-400 text-slate-950'
                      : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {settings.showGhost !== false ? 'ENABLED' : 'DISABLED'}
                </button>
              </div>

              <div className="p-4 rounded-xl bg-[#0f1420] border border-white/10 flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold text-white">
                    Mouse Horizontal Steering (Desktop)
                  </div>
                  <div className="text-xs text-slate-400">
                    Optional pointer-based steering alongside keyboard & gamepad
                  </div>
                </div>
                <button
                  onClick={() => onChange({ mouseSteering: !settings.mouseSteering })}
                  className={`px-4 py-2 rounded-lg text-xs font-bold cursor-pointer ${
                    settings.mouseSteering
                      ? 'bg-emerald-500 text-slate-950'
                      : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {settings.mouseSteering ? 'ON' : 'OFF'}
                </button>
              </div>
            </div>
          )}

          {tab === 'audio' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-[#0f1420] border border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Volume2 className="w-5 h-5 text-amber-400" />
                  <div>
                    <div className="text-sm font-semibold text-white">Master Audio Mute</div>
                    <div className="text-xs text-slate-400">Silence all engine, effects & music</div>
                  </div>
                </div>
                <button
                  onClick={() => onChange({ muted: !settings.muted })}
                  className={`px-4 py-2 rounded-lg text-xs font-bold cursor-pointer ${
                    settings.muted
                      ? 'bg-red-500 text-white'
                      : 'bg-emerald-500 text-slate-950'
                  }`}
                >
                  {settings.muted ? 'MUTED' : 'ACTIVE'}
                </button>
              </div>

              {(
                [
                  ['engineVolume', 'Engine & Turbo Volume'],
                  ['effectsVolume', 'Tires, Collisions, Horn & SFX'],
                  ['musicVolume', 'Racing Synth Music'],
                ] as const
              ).map(([field, label]) => (
                <div
                  key={field}
                  className="p-4 rounded-xl bg-[#0f1420] border border-white/10"
                >
                  <div className="flex justify-between text-sm mb-2">
                    <span className="font-semibold text-white">{label}</span>
                    <span className="font-mono-num text-amber-400 font-bold">
                      {Math.round(settings[field] * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={settings[field]}
                    onChange={(e) => onChange({ [field]: parseFloat(e.target.value) })}
                    className="w-full accent-amber-500"
                  />
                </div>
              ))}
            </div>
          )}

          {tab === 'controls' && (
            <div className="space-y-5">
              {/* Mobile Control Mode */}
              <div className="p-4 rounded-xl bg-[#0f1420] border border-white/10">
                <h3 className="text-sm font-semibold text-white mb-1">
                  Mobile Control Mode
                </h3>
                <p className="text-xs text-slate-400 mb-3">
                  Switchable anytime, even during a race via the Pause menu.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {(
                    [
                      ['buttons', '1. Arrow Buttons', 'Large Left / Right + Gas & Brake'],
                      ['tilt', '2. Tilt Gyroscope', 'Tilt phone sideways + Calibrate'],
                      ['wheel', '3. Touch Wheel / Swipe', 'Rotatable wheel + swipe gesture'],
                    ] as [ControlMode, string, string][]
                  ).map(([mode, title, desc]) => (
                    <button
                      key={mode}
                      onClick={() => onChange({ controlMode: mode })}
                      className={`p-3 rounded-xl border text-left transition-colors cursor-pointer ${
                        settings.controlMode === mode
                          ? 'bg-amber-500/15 border-amber-400 text-white'
                          : 'bg-slate-900 border-white/10 text-slate-300'
                      }`}
                    >
                      <div className="text-xs font-bold">{title}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">{desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Sensitivity & Assist Sliders + Live Preview */}
              <div className="p-4 rounded-xl bg-[#0f1420] border border-white/10 space-y-4">
                <h3 className="text-sm font-semibold text-white">
                  Steering Calibration & Assist
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-300">Steering Sensitivity</span>
                      <span className="font-mono-num text-amber-400">
                        {settings.steeringSensitivity.toFixed(2)}x
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0.4}
                      max={2.0}
                      step={0.05}
                      value={settings.steeringSensitivity}
                      onChange={(e) =>
                        onChange({ steeringSensitivity: parseFloat(e.target.value) })
                      }
                      className="w-full accent-amber-500"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-300">Tilt Sensitivity</span>
                      <span className="font-mono-num text-cyan-400">
                        {settings.tiltSensitivity.toFixed(2)}x
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0.4}
                      max={2.4}
                      step={0.05}
                      value={settings.tiltSensitivity}
                      onChange={(e) =>
                        onChange({ tiltSensitivity: parseFloat(e.target.value) })
                      }
                      className="w-full accent-cyan-400"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-300">Steering Return Speed</span>
                      <span className="font-mono-num text-white">
                        {settings.steeringReturnSpeed.toFixed(2)}x
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0.5}
                      max={2.0}
                      step={0.05}
                      value={settings.steeringReturnSpeed}
                      onChange={(e) =>
                        onChange({ steeringReturnSpeed: parseFloat(e.target.value) })
                      }
                      className="w-full accent-amber-500"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-300">Dead Zone</span>
                      <span className="font-mono-num text-white">
                        {Math.round(settings.steeringDeadZone * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={0.25}
                      step={0.01}
                      value={settings.steeringDeadZone}
                      onChange={(e) =>
                        onChange({ steeringDeadZone: parseFloat(e.target.value) })
                      }
                      className="w-full accent-amber-500"
                    />
                  </div>
                </div>

                {/* Steering Assist */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/10">
                  <div>
                    <div className="text-xs font-semibold text-white">Steering Assist</div>
                    <div className="text-[11px] text-slate-400">
                      Helps keep high-speed cornering lines smooth
                    </div>
                  </div>
                  <div className="flex gap-1.5 bg-slate-900 p-1 rounded-lg">
                    {(['off', 'light', 'full'] as SteeringAssist[]).map((ast) => (
                      <button
                        key={ast}
                        onClick={() => onChange({ steeringAssist: ast })}
                        className={`px-3.5 py-1.5 rounded text-xs font-bold capitalize cursor-pointer ${
                          settings.steeringAssist === ast
                            ? 'bg-amber-500 text-slate-950'
                            : 'text-slate-300'
                        }`}
                      >
                        {ast}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Live Steering Preview */}
                <div className="p-3 rounded-lg bg-slate-900 border border-white/10 space-y-2">
                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span>Live Steering Curve Preview (Drag slider to test)</span>
                    <span className="font-mono-num text-cyan-400">
                      Output: {Math.round(effectiveResponse * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={-1}
                    max={1}
                    step={0.02}
                    value={previewTestInput}
                    onChange={(e) => setPreviewTestInput(parseFloat(e.target.value))}
                    className="w-full accent-cyan-400"
                  />
                  <div className="h-3 w-full bg-slate-800 rounded-full relative overflow-hidden">
                    <div
                      className="absolute top-0 bottom-0 w-3 bg-amber-400 rounded-full transition-all duration-75"
                      style={{ left: `calc(${(effectiveResponse + 1) * 50}% - 6px)` }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-white/10">
                  <div>
                    <div className="text-xs font-semibold text-white">
                      Touch Vibration Feedback
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Haptic buzz on pedal press and collisions (supported phones)
                    </div>
                  </div>
                  <button
                    onClick={() =>
                      onChange({ vibrationFeedback: !settings.vibrationFeedback })
                    }
                    className={`px-4 py-2 rounded-lg text-xs font-bold cursor-pointer ${
                      settings.vibrationFeedback
                        ? 'bg-emerald-500 text-slate-950'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {settings.vibrationFeedback ? 'ON' : 'OFF'}
                  </button>
                </div>
              </div>

              {/* Interactive Mobile Touch Layout Customizer */}
              <div className="p-4 rounded-xl bg-[#0f1420] border border-white/10 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-semibold text-white">
                      Touch Control Layout Customizer
                    </h3>
                    <p className="text-xs text-slate-400">
                      Drag buttons below to reposition · Resize · Adjust opacity · Switch Left/Right-Handed
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        onChange({
                          mobileLayout: getDefaultMobileLayout(!settings.mobileLayout.leftHanded),
                        })
                      }
                      className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-cyan-300 cursor-pointer"
                    >
                      {settings.mobileLayout.leftHanded ? 'Right-Handed' : 'Left-Handed'}
                    </button>
                    <button
                      onClick={() =>
                        onChange({
                          mobileLayout: getDefaultMobileLayout(false),
                        })
                      }
                      className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-amber-400 inline-flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reset Default</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-300">Button Size</span>
                      <span className="font-mono-num text-white">
                        {Math.round(settings.mobileLayout.buttonScale * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0.7}
                      max={1.4}
                      step={0.05}
                      value={settings.mobileLayout.buttonScale}
                      onChange={(e) =>
                        updateLayout({ buttonScale: parseFloat(e.target.value) })
                      }
                      className="w-full accent-amber-500"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-300">Button Opacity</span>
                      <span className="font-mono-num text-white">
                        {Math.round(settings.mobileLayout.buttonOpacity * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0.3}
                      max={1.0}
                      step={0.05}
                      value={settings.mobileLayout.buttonOpacity}
                      onChange={(e) =>
                        updateLayout({ buttonOpacity: parseFloat(e.target.value) })
                      }
                      className="w-full accent-amber-500"
                    />
                  </div>
                </div>

                {/* Landscape Drag Canvas */}
                <div
                  ref={canvasBoxRef}
                  onPointerMove={handleDragMove}
                  onPointerUp={() => setDraggingKey(null)}
                  onPointerLeave={() => setDraggingKey(null)}
                  className="w-full h-56 rounded-xl bg-slate-950 border-2 border-dashed border-white/20 relative overflow-hidden racing-touch-lock"
                >
                  <div className="absolute inset-0 flex items-center justify-center text-xs text-slate-600 pointer-events-none">
                    Landscape Touch Zone · Drag any control
                  </div>
                  {LAYOUT_LABELS.map((item) => {
                    const pos = settings.mobileLayout.positions[item.key];
                    return (
                      <div
                        key={item.key}
                        onPointerDown={(e) => {
                          e.currentTarget.setPointerCapture(e.pointerId);
                          setDraggingKey(item.key);
                        }}
                        style={{
                          left: `${pos.xPct}%`,
                          top: `${pos.yPct}%`,
                          transform: `translate(-50%, -50%) scale(${Math.min(1.15, settings.mobileLayout.buttonScale * 0.8)})`,
                          opacity: settings.mobileLayout.buttonOpacity,
                        }}
                        className={`absolute px-2.5 py-2 rounded-lg text-[10px] font-bold shadow cursor-grab active:cursor-grabbing ${item.color}`}
                      >
                        {item.label}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
