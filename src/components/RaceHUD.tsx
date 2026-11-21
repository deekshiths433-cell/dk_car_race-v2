import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  Camera,
  Flame,
  Lightbulb,
  OctagonAlert,
  Pause,
  RotateCcw,
  Smartphone,
  Volume2,
} from 'lucide-react';
import { ExternalControlInput } from '../engine/RaceEngine';
import { GameSettings, RaceTelemetry } from '../types/game';

interface RaceHUDProps {
  telemetry: RaceTelemetry | null;
  settings: GameSettings;
  isMobile: boolean;
  onTouchInput: (input: Partial<ExternalControlInput>) => void;
  onCycleCamera: () => void;
  onToggleLights: () => void;
  onToggleLeftIndicator: () => void;
  onToggleRightIndicator: () => void;
  onToggleHazard: () => void;
  onResetCar: () => void;
  onPause: () => void;
  onCalibrateTilt: (offsetDeg: number) => void;
}

export const RaceHUD: React.FC<RaceHUDProps> = ({
  telemetry,
  settings,
  isMobile,
  onTouchInput,
  onCycleCamera,
  onToggleLights,
  onToggleLeftIndicator,
  onToggleRightIndicator,
  onToggleHazard,
  onResetCar,
  onPause,
  onCalibrateTilt,
}) => {
  const minimapCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isPortrait, setIsPortrait] = useState(false);
  const [wheelVisualAngle, setWheelVisualAngle] = useState(0);
  const rawTiltDegRef = useRef(0);
  const wheelPtrIdRef = useRef<number | null>(null);
  const wheelCenterRef = useRef({ x: 0, y: 0 });
  const swipeStartXRef = useRef<number | null>(null);

  // Track active pressed visual states
  const [pressedMap, setPressedMap] = useState<Record<string, boolean>>({});
  const setPressed = (k: string, v: boolean) => {
    setPressedMap((prev) => (prev[k] === v ? prev : { ...prev, [k]: v }));
    if (v && settings.vibrationFeedback && navigator.vibrate) {
      navigator.vibrate(14);
    }
  };

  // Portrait orientation check on mobile
  useEffect(() => {
    const checkOrientation = () => {
      setIsPortrait(isMobile && window.innerHeight > window.innerWidth);
    };
    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);
    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, [isMobile]);

  // Tilt / Gyroscope steering listener when controlMode === 'tilt'
  useEffect(() => {
    if (!isMobile || settings.controlMode !== 'tilt') return;
    const handleOrientation = (e: DeviceOrientationEvent) => {
      // In landscape mode, beta reflects left/right tilt; fallback to gamma if needed
      const landscapeAngle =
        window.innerWidth > window.innerHeight
          ? e.beta ?? 0
          : e.gamma ?? 0;
      rawTiltDegRef.current = landscapeAngle;
      const adjusted = landscapeAngle - settings.tiltCalibrationOffset;
      const maxTilt = 32 / settings.tiltSensitivity;
      let steer = Math.max(-1, Math.min(1, adjusted / maxTilt));
      if (Math.abs(steer) < settings.steeringDeadZone) steer = 0;
      onTouchInput({ steer });
    };
    window.addEventListener('deviceorientation', handleOrientation);
    return () => {
      window.removeEventListener('deviceorientation', handleOrientation);
      onTouchInput({ steer: 0 });
    };
  }, [
    isMobile,
    settings.controlMode,
    settings.tiltSensitivity,
    settings.tiltCalibrationOffset,
    settings.steeringDeadZone,
    onTouchInput,
  ]);

  // Draw live minimap on 2D canvas
  useEffect(() => {
    const canvas = minimapCanvasRef.current;
    if (!canvas || !telemetry) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const { trackPoints, bounds, player, rivals } = telemetry.minimapData;
    const pad = 12;
    const spanX = Math.max(10, bounds.maxX - bounds.minX);
    const spanZ = Math.max(10, bounds.maxZ - bounds.minZ);
    const scale = Math.min((w - pad * 2) / spanX, (h - pad * 2) / spanZ);
    const ox = (w - spanX * scale) * 0.5;
    const oz = (h - spanZ * scale) * 0.5;

    const toX = (x: number) => ox + (x - bounds.minX) * scale;
    const toY = (z: number) => oz + (z - bounds.minZ) * scale;

    if (trackPoints.length > 1) {
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.55)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      trackPoints.forEach((pt, idx) => {
        if (idx === 0) ctx.moveTo(toX(pt.x), toY(pt.z));
        else ctx.lineTo(toX(pt.x), toY(pt.z));
      });
      ctx.closePath();
      ctx.stroke();
    }

    // Rivals
    ctx.fillStyle = '#38bdf8';
    rivals.forEach((r) => {
      ctx.beginPath();
      ctx.arc(toX(r.x), toY(r.z), 3, 0, Math.PI * 2);
      ctx.fill();
    });

    // Player triangle
    const px = toX(player.x);
    const py = toY(player.z);
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(-player.yaw);
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.moveTo(0, 6);
    ctx.lineTo(-4.5, -5);
    ctx.lineTo(4.5, -5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }, [telemetry]);

  if (!telemetry) return null;

  const displaySpeed =
    settings.speedUnit === 'mph'
      ? Math.round(telemetry.speedKmh * 0.621371)
      : telemetry.speedKmh;
  const rpmPct = Math.min(100, Math.round((telemetry.rpm / telemetry.redlineRpm) * 100));
  const layout = settings.mobileLayout;
  const btnScale = layout.buttonScale;
  const btnOpacity = layout.buttonOpacity;

  const formatTime = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const rem = sec % 60;
    return `${mins}:${rem < 10 ? '0' : ''}${rem.toFixed(2)}`;
  };

  return (
    <div className="fixed inset-0 z-20 pointer-events-none racing-touch-lock">
      {/* High-Speed Radial Speed Lines Effect */}
      {telemetry.speedKmh > 190 && (
        <div
          className="absolute inset-0 pointer-events-none transition-opacity duration-150"
          style={{
            opacity: Math.min(0.45, ((telemetry.speedKmh - 190) / 230) * (telemetry.nitroActive ? 0.5 : 0.32)),
            background:
              'radial-gradient(circle at center, transparent 52%, rgba(56, 189, 248, 0.25) 88%, rgba(245, 158, 11, 0.35) 100%)',
          }}
        />
      )}

      {/* Portrait Rotate Warning on Mobile */}
      {isPortrait && (
        <div className="fixed inset-0 z-50 bg-[#090b10] pointer-events-auto flex flex-col items-center justify-center p-6 text-center">
          <Smartphone className="w-16 h-16 text-amber-400 rotate-90 mb-4" />
          <h2 className="font-display text-2xl font-bold text-white mb-2">
            Rotate Your Phone
          </h2>
          <p className="text-sm text-slate-300 max-w-xs">
            DK Car Race plays in landscape mode for full-width supercar visibility and dual-thumb controls.
          </p>
        </div>
      )}

      {/* Top HUD Row: Position/Lap (Top-Left), Rear-View Mirror Frame (Top-Center), Minimap & Pause (Top-Right) */}
      <div className="flex items-start justify-between p-3 md:p-4 gap-3">
        {/* Top-Left Cluster */}
        <div className="bg-[#0b0e16]/85 border border-white/10 rounded-xl px-3.5 py-2.5 flex items-center gap-4">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-slate-400">Pos</div>
            <div className="font-display font-bold text-xl md:text-2xl text-amber-400 font-mono-num leading-tight">
              {telemetry.position}
              <span className="text-xs text-slate-400">/{telemetry.totalCars}</span>
            </div>
          </div>
          <div className="h-7 w-px bg-white/10" />
          <div>
            <div className="text-[10px] uppercase tracking-wider text-slate-400">Lap</div>
            <div className="font-display font-bold text-lg md:text-xl text-white font-mono-num leading-tight">
              {telemetry.lap}/{telemetry.totalLaps}
            </div>
          </div>
          <div className="h-7 w-px bg-white/10" />
          <div>
            <div className="text-[10px] uppercase tracking-wider text-slate-400">Time</div>
            <div className="font-mono-num font-semibold text-sm md:text-base text-slate-100">
              {formatTime(telemetry.raceTimeSec)}
            </div>
          </div>
        </div>

        {/* Top-Center Rear-View Mirror Frame */}
        {telemetry.cameraMode !== 'cinematic' && (
          <div className="hidden sm:flex flex-col items-center">
            <div className="w-[220px] h-[68px] border-2 border-slate-600/80 rounded-lg shadow-lg relative overflow-hidden">
              <span className="absolute bottom-1 right-1.5 text-[9px] font-semibold tracking-wider text-slate-300/80 uppercase">
                Rear Mirror
              </span>
            </div>
          </div>
        )}

        {/* Top-Right Minimap & Action Controls */}
        <div className="flex items-start gap-2.5">
          <div className="bg-[#0b0e16]/85 border border-white/10 rounded-xl p-1.5 hidden sm:block">
            <canvas ref={minimapCanvasRef} width={112} height={84} className="block" />
          </div>

          <div className="pointer-events-auto flex flex-col gap-1.5">
            <button
              onClick={onPause}
              aria-label="Pause race"
              className="w-11 h-11 rounded-lg bg-[#0b0e16]/90 hover:bg-slate-800 border border-white/15 flex items-center justify-center text-white cursor-pointer"
            >
              <Pause className="w-5 h-5" />
            </button>
            {!isMobile && (
              <div className="flex flex-col gap-1">
                <button
                  onClick={onCycleCamera}
                  title="Camera (C)"
                  className="w-11 h-9 rounded-lg bg-[#0b0e16]/85 hover:bg-slate-800 border border-white/10 flex items-center justify-center text-slate-200 cursor-pointer"
                >
                  <Camera className="w-4 h-4" />
                </button>
                <button
                  onClick={onToggleLights}
                  title="Headlights (L)"
                  className={`w-11 h-9 rounded-lg border flex items-center justify-center cursor-pointer ${
                    telemetry.headlightsMode === 2
                      ? 'bg-sky-500/30 border-sky-400 text-sky-300'
                      : telemetry.headlightsMode === 1
                        ? 'bg-amber-500/20 border-amber-400/50 text-amber-300'
                        : 'bg-[#0b0e16]/85 border-white/10 text-slate-400'
                  }`}
                >
                  <Lightbulb className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Center Countdown / Wrong Way / Checkpoint Banner */}
      <div className="absolute inset-x-0 top-1/4 flex flex-col items-center justify-center pointer-events-none gap-2">
        {telemetry.countdown >= 0 && (
          <div className="bg-[#0b0e16]/90 border border-amber-500/40 rounded-2xl px-8 py-4">
            <span className="font-display font-bold text-6xl md:text-7xl text-amber-400 font-mono-num">
              {telemetry.countdown === 0 ? 'GO!' : telemetry.countdown}
            </span>
          </div>
        )}
        {telemetry.wrongWay && (
          <div className="bg-red-600/90 text-white px-5 py-2 rounded-lg font-display font-bold text-lg tracking-wider">
            WRONG WAY · TURN AROUND (R TO RESET)
          </div>
        )}
        {telemetry.checkpointNotice && (
          <div className="bg-[#0b0e16]/85 border border-cyan-400/50 text-cyan-300 px-4 py-1.5 rounded-lg font-display font-semibold text-sm tracking-wider">
            {telemetry.checkpointNotice}
          </div>
        )}
        {telemetry.drifting && (
          <div className="text-amber-400 font-display font-bold text-base tracking-wider">
            DRIFT · {telemetry.driftScore} m
          </div>
        )}
      </div>

      {/* Bottom Speedometer / Tachometer / Gear / Nitro HUD */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-end gap-3 pointer-events-none">
        <div className="bg-[#0b0e16]/88 border border-white/10 rounded-xl px-4 py-2.5 min-w-[240px] sm:min-w-[300px]">
          <div className="flex items-baseline justify-between gap-4">
            <div className="flex items-baseline gap-1.5">
              <span className="font-display font-bold text-3xl md:text-4xl text-white font-mono-num">
                {displaySpeed}
              </span>
              <span className="text-xs font-semibold text-slate-400 uppercase">
                {settings.speedUnit === 'mph' ? 'MPH' : 'KM/H'}
              </span>
            </div>

            <div className="flex items-center gap-3 text-xs">
              <div className="text-slate-300">
                Gear{' '}
                <span className="font-display font-bold text-base text-amber-400 font-mono-num">
                  {telemetry.gear === 0 ? 'R' : telemetry.gear}
                </span>
              </div>
              <div className="text-slate-400 font-mono-num">
                {telemetry.rpm} <span className="text-[10px]">RPM</span>
              </div>
            </div>
          </div>

          {/* Tachometer Bar */}
          <div className="mt-1.5 h-2 w-full bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full transition-all duration-75"
              style={{
                width: `${rpmPct}%`,
                backgroundColor: rpmPct > 86 ? '#ef4444' : rpmPct > 65 ? '#f59e0b' : '#22d3ee',
              }}
            />
          </div>

          {/* Nitro Bar + Indicators / Wipers / Damage status */}
          <div className="mt-2 flex items-center justify-between gap-3">
            <div className="flex-1 flex items-center gap-2">
              <Flame
                className={`w-3.5 h-3.5 shrink-0 ${
                  telemetry.nitroActive ? 'text-cyan-400' : 'text-amber-400'
                }`}
              />
              <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-cyan-400 transition-all duration-75"
                  style={{ width: `${telemetry.nitro}%` }}
                />
              </div>
            </div>

            <div className="flex items-center gap-2 text-[10px] font-semibold text-slate-300 pointer-events-auto">
              <button
                onClick={onToggleLeftIndicator}
                className={`px-1.5 py-0.5 rounded cursor-pointer ${
                  telemetry.leftIndicator || telemetry.hazardLights
                    ? 'bg-amber-500/30 text-amber-300'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
                title="Left Indicator (Q)"
              >
                ◀
              </button>
              <button
                onClick={onToggleHazard}
                className={`px-1.5 py-0.5 rounded cursor-pointer ${
                  telemetry.hazardLights
                    ? 'bg-red-500/30 text-red-300'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
                title="Hazards (X)"
              >
                ▲
              </button>
              <button
                onClick={onToggleRightIndicator}
                className={`px-1.5 py-0.5 rounded cursor-pointer ${
                  telemetry.rightIndicator || telemetry.hazardLights
                    ? 'bg-amber-500/30 text-amber-300'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
                title="Right Indicator (E)"
              >
                ▶
              </button>
              {telemetry.damagePct > 0 && (
                <span className="text-red-400 font-mono-num">
                  DMG {telemetry.damagePct}%
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Keyboard Hint Bar */}
      {!isMobile && settings.showDesktopHints && (
        <div className="absolute bottom-2 right-3 bg-[#0b0e16]/80 border border-white/10 rounded-lg px-3 py-1.5 text-[11px] text-slate-300 font-mono-num flex items-center gap-2">
          <span>W/↑ Gas · S/↓ Brake · A/D Steer · Shift Nitro · Space Drift · H Horn · L Lights · C Cam · R Reset</span>
          <button
            onClick={onResetCar}
            className="pointer-events-auto text-amber-400 hover:underline ml-1 cursor-pointer"
          >
            Reset
          </button>
        </div>
      )}

      {/* MOBILE MULTI-TOUCH CONTROLS */}
      {isMobile && !isPortrait && (
        <div
          className="fixed inset-0 pointer-events-none racing-touch-lock"
          style={{ opacity: btnOpacity }}
          onPointerMove={(e) => {
            if (
              settings.controlMode === 'wheel' &&
              wheelPtrIdRef.current === null &&
              swipeStartXRef.current !== null
            ) {
              const dx = e.clientX - swipeStartXRef.current;
              const steer = Math.max(-1, Math.min(1, dx / 90));
              setWheelVisualAngle(steer * 85);
              onTouchInput({ steer });
            }
          }}
        >
          {/* Mode 1: Left & Right Steering Buttons */}
          {settings.controlMode === 'buttons' && (
            <>
              <button
                style={{
                  left: `${layout.positions.steerLeft.xPct}%`,
                  top: `${layout.positions.steerLeft.yPct}%`,
                  transform: `translate(-50%, -50%) scale(${btnScale})`,
                }}
                onPointerDown={(e) => {
                  e.currentTarget.setPointerCapture(e.pointerId);
                  setPressed('left', true);
                  onTouchInput({ steer: -1 });
                }}
                onPointerUp={() => {
                  setPressed('left', false);
                  onTouchInput({ steer: 0 });
                }}
                onPointerCancel={() => {
                  setPressed('left', false);
                  onTouchInput({ steer: 0 });
                }}
                className={`fixed pointer-events-auto w-16 h-16 rounded-2xl border-2 flex flex-col items-center justify-center transition-transform ${
                  pressedMap.left
                    ? 'bg-amber-500 text-slate-950 border-white scale-95'
                    : 'bg-[#0b0e16]/80 text-white border-white/25'
                }`}
              >
                <ArrowLeft className="w-7 h-7" />
                <span className="text-[10px] font-bold">LEFT</span>
              </button>

              <button
                style={{
                  left: `${layout.positions.steerRight.xPct}%`,
                  top: `${layout.positions.steerRight.yPct}%`,
                  transform: `translate(-50%, -50%) scale(${btnScale})`,
                }}
                onPointerDown={(e) => {
                  e.currentTarget.setPointerCapture(e.pointerId);
                  setPressed('right', true);
                  onTouchInput({ steer: 1 });
                }}
                onPointerUp={() => {
                  setPressed('right', false);
                  onTouchInput({ steer: 0 });
                }}
                onPointerCancel={() => {
                  setPressed('right', false);
                  onTouchInput({ steer: 0 });
                }}
                className={`fixed pointer-events-auto w-16 h-16 rounded-2xl border-2 flex flex-col items-center justify-center transition-transform ${
                  pressedMap.right
                    ? 'bg-amber-500 text-slate-950 border-white scale-95'
                    : 'bg-[#0b0e16]/80 text-white border-white/25'
                }`}
              >
                <ArrowRight className="w-7 h-7" />
                <span className="text-[10px] font-bold">RIGHT</span>
              </button>
            </>
          )}

          {/* Mode 2: Tilt Calibrate Button */}
          {settings.controlMode === 'tilt' && (
            <button
              style={{
                left: `${layout.positions.wheel.xPct}%`,
                top: `${layout.positions.wheel.yPct}%`,
                transform: `translate(-50%, -50%) scale(${btnScale})`,
              }}
              onClick={() => onCalibrateTilt(rawTiltDegRef.current)}
              className="fixed pointer-events-auto px-4 py-3 rounded-xl bg-[#0b0e16]/85 border border-cyan-400/50 text-cyan-300 text-xs font-bold flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Calibrate Tilt</span>
            </button>
          )}

          {/* Mode 3: Touch Rotatable Steering Wheel */}
          {settings.controlMode === 'wheel' && (
            <div
              style={{
                left: `${layout.positions.wheel.xPct}%`,
                top: `${layout.positions.wheel.yPct}%`,
                transform: `translate(-50%, -50%) scale(${btnScale}) rotate(${wheelVisualAngle}deg)`,
              }}
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId);
                wheelPtrIdRef.current = e.pointerId;
                const rect = e.currentTarget.getBoundingClientRect();
                wheelCenterRef.current = {
                  x: rect.left + rect.width / 2,
                  y: rect.top + rect.height / 2,
                };
              }}
              onPointerMove={(e) => {
                if (wheelPtrIdRef.current !== e.pointerId) return;
                const dx = e.clientX - wheelCenterRef.current.x;
                const dy = e.clientY - wheelCenterRef.current.y;
                // Angle relative to top of wheel
                const angleRad = Math.atan2(dx, -dy);
                const angleDeg = (angleRad * 180) / Math.PI;
                const clampedDeg = Math.max(-110, Math.min(110, angleDeg));
                setWheelVisualAngle(clampedDeg);
                onTouchInput({ steer: clampedDeg / 110 });
              }}
              onPointerUp={(e) => {
                if (wheelPtrIdRef.current === e.pointerId) {
                  wheelPtrIdRef.current = null;
                  setWheelVisualAngle(0);
                  onTouchInput({ steer: 0 });
                }
              }}
              onPointerCancel={() => {
                wheelPtrIdRef.current = null;
                setWheelVisualAngle(0);
                onTouchInput({ steer: 0 });
              }}
              className="fixed pointer-events-auto w-28 h-28 rounded-full border-4 border-amber-400/80 bg-[#0b0e16]/80 flex items-center justify-center shadow-lg"
            >
              <div className="w-full h-2 bg-slate-600/80 absolute" />
              <div className="w-2 h-1/2 bg-amber-400 absolute top-0 rounded-full" />
              <div className="w-8 h-8 rounded-full bg-slate-800 border border-amber-400 flex items-center justify-center text-[9px] font-bold text-amber-400 z-10">
                DK
              </div>
            </div>
          )}

          {/* Accelerate (Gas) Pedal */}
          <button
            style={{
              left: `${layout.positions.accel.xPct}%`,
              top: `${layout.positions.accel.yPct}%`,
              transform: `translate(-50%, -50%) scale(${btnScale})`,
            }}
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              setPressed('accel', true);
              onTouchInput({ throttle: 1 });
            }}
            onPointerUp={() => {
              setPressed('accel', false);
              onTouchInput({ throttle: 0 });
            }}
            onPointerCancel={() => {
              setPressed('accel', false);
              onTouchInput({ throttle: 0 });
            }}
            className={`fixed pointer-events-auto w-16 h-20 rounded-2xl border-2 flex flex-col items-center justify-center ${
              pressedMap.accel
                ? 'bg-emerald-500 text-slate-950 border-white scale-95'
                : 'bg-[#0b0e16]/80 text-emerald-400 border-emerald-400/50'
            }`}
          >
            <ArrowUp className="w-7 h-7" />
            <span className="text-[10px] font-bold">GAS</span>
          </button>

          {/* Brake / Reverse Pedal */}
          <button
            style={{
              left: `${layout.positions.brake.xPct}%`,
              top: `${layout.positions.brake.yPct}%`,
              transform: `translate(-50%, -50%) scale(${btnScale})`,
            }}
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              setPressed('brake', true);
              onTouchInput({ brake: 1 });
            }}
            onPointerUp={() => {
              setPressed('brake', false);
              onTouchInput({ brake: 0 });
            }}
            onPointerCancel={() => {
              setPressed('brake', false);
              onTouchInput({ brake: 0 });
            }}
            className={`fixed pointer-events-auto w-16 h-16 rounded-2xl border-2 flex flex-col items-center justify-center ${
              pressedMap.brake
                ? 'bg-red-500 text-white border-white scale-95'
                : 'bg-[#0b0e16]/80 text-red-400 border-red-400/50'
            }`}
          >
            <ArrowDown className="w-6 h-6" />
            <span className="text-[10px] font-bold">BRAKE</span>
          </button>

          {/* Nitro */}
          <button
            style={{
              left: `${layout.positions.nitro.xPct}%`,
              top: `${layout.positions.nitro.yPct}%`,
              transform: `translate(-50%, -50%) scale(${btnScale})`,
            }}
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              setPressed('nitro', true);
              onTouchInput({ nitro: true });
            }}
            onPointerUp={() => {
              setPressed('nitro', false);
              onTouchInput({ nitro: false });
            }}
            onPointerCancel={() => {
              setPressed('nitro', false);
              onTouchInput({ nitro: false });
            }}
            className={`fixed pointer-events-auto w-14 h-14 rounded-full border-2 flex flex-col items-center justify-center ${
              pressedMap.nitro
                ? 'bg-cyan-400 text-slate-950 border-white scale-95'
                : 'bg-[#0b0e16]/80 text-cyan-300 border-cyan-400/50'
            }`}
          >
            <Flame className="w-5 h-5" />
            <span className="text-[9px] font-bold">NITRO</span>
          </button>

          {/* Handbrake */}
          <button
            style={{
              left: `${layout.positions.handbrake.xPct}%`,
              top: `${layout.positions.handbrake.yPct}%`,
              transform: `translate(-50%, -50%) scale(${btnScale})`,
            }}
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              setPressed('handbrake', true);
              onTouchInput({ handbrake: true });
            }}
            onPointerUp={() => {
              setPressed('handbrake', false);
              onTouchInput({ handbrake: false });
            }}
            onPointerCancel={() => {
              setPressed('handbrake', false);
              onTouchInput({ handbrake: false });
            }}
            className={`fixed pointer-events-auto w-14 h-14 rounded-full border-2 flex flex-col items-center justify-center ${
              pressedMap.handbrake
                ? 'bg-amber-500 text-slate-950 border-white scale-95'
                : 'bg-[#0b0e16]/80 text-amber-300 border-amber-400/50'
            }`}
          >
            <OctagonAlert className="w-5 h-5" />
            <span className="text-[9px] font-bold">DRIFT</span>
          </button>

          {/* Horn */}
          <button
            style={{
              left: `${layout.positions.horn.xPct}%`,
              top: `${layout.positions.horn.yPct}%`,
              transform: `translate(-50%, -50%) scale(${btnScale})`,
            }}
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              setPressed('horn', true);
              onTouchInput({ horn: true });
            }}
            onPointerUp={() => {
              setPressed('horn', false);
              onTouchInput({ horn: false });
            }}
            onPointerCancel={() => {
              setPressed('horn', false);
              onTouchInput({ horn: false });
            }}
            className={`fixed pointer-events-auto w-12 h-12 rounded-xl border flex flex-col items-center justify-center ${
              pressedMap.horn
                ? 'bg-white text-slate-950 border-white'
                : 'bg-[#0b0e16]/80 text-slate-200 border-white/20'
            }`}
          >
            <Volume2 className="w-4 h-4" />
            <span className="text-[8px] font-bold">HORN</span>
          </button>

          {/* Headlights */}
          <button
            style={{
              left: `${layout.positions.lights.xPct}%`,
              top: `${layout.positions.lights.yPct}%`,
              transform: `translate(-50%, -50%) scale(${btnScale})`,
            }}
            onClick={onToggleLights}
            className="fixed pointer-events-auto w-12 h-12 rounded-xl border border-white/20 bg-[#0b0e16]/80 text-amber-300 flex flex-col items-center justify-center"
          >
            <Lightbulb className="w-4 h-4" />
            <span className="text-[8px] font-bold">LIGHTS</span>
          </button>

          {/* Camera Switch */}
          <button
            style={{
              left: `${layout.positions.camera.xPct}%`,
              top: `${layout.positions.camera.yPct}%`,
              transform: `translate(-50%, -50%) scale(${btnScale})`,
            }}
            onClick={onCycleCamera}
            className="fixed pointer-events-auto w-12 h-12 rounded-xl border border-white/20 bg-[#0b0e16]/80 text-cyan-300 flex flex-col items-center justify-center"
          >
            <Camera className="w-4 h-4" />
            <span className="text-[8px] font-bold">CAM</span>
          </button>
        </div>
      )}
    </div>
  );
};
