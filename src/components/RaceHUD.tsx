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
  X,
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
  const [portraitHintDismissed, setPortraitHintDismissed] = useState(false);
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
      const portrait = isMobile && window.innerHeight > window.innerWidth;
      setIsPortrait(portrait);
      if (!portrait) setPortraitHintDismissed(false);
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

  const hud = settings.hudElements ?? {
    speedometer: true,
    nitro: true,
    lapTime: true,
    position: true,
    minimap: true,
  };
  const hudScale = Math.max(0.75, Math.min(1.25, settings.hudScale ?? 1.0));

  // Draw live minimap on crisp 2D canvas
  useEffect(() => {
    const canvas = minimapCanvasRef.current;
    if (!canvas || !telemetry || !hud.minimap) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const { trackPoints, bounds, player, rivals, ghost } = telemetry.minimapData;
    const pad = 16;
    const spanX = Math.max(10, bounds.maxX - bounds.minX);
    const spanZ = Math.max(10, bounds.maxZ - bounds.minZ);
    const scale = Math.min((w - pad * 2) / spanX, (h - pad * 2) / spanZ);
    const ox = (w - spanX * scale) * 0.5;
    const oz = (h - spanZ * scale) * 0.5;

    const toX = (x: number) => ox + (x - bounds.minX) * scale;
    const toY = (z: number) => oz + (z - bounds.minZ) * scale;

    if (trackPoints.length > 1) {
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.6)';
      ctx.lineWidth = 5;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      trackPoints.forEach((pt, idx) => {
        if (idx === 0) ctx.moveTo(toX(pt.x), toY(pt.z));
        else ctx.lineTo(toX(pt.x), toY(pt.z));
      });
      ctx.closePath();
      ctx.stroke();
    }

    // Personal-Best Ghost marker
    if (ghost) {
      const gx = toX(ghost.x);
      const gy = toY(ghost.z);
      ctx.fillStyle = 'rgba(103, 232, 249, 0.35)';
      ctx.strokeStyle = 'rgba(186, 230, 253, 0.95)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(gx, gy, 4.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    // Rivals
    ctx.fillStyle = '#38bdf8';
    rivals.forEach((r) => {
      ctx.beginPath();
      ctx.arc(toX(r.x), toY(r.z), 4.2, 0, Math.PI * 2);
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
    ctx.moveTo(0, 8);
    ctx.lineTo(-6, -6);
    ctx.lineTo(6, -6);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }, [telemetry, hud.minimap]);

  if (!telemetry) return null;

  const displaySpeed =
    settings.speedUnit === 'mph'
      ? Math.round(telemetry.speedKmh * 0.621371)
      : telemetry.speedKmh;
  const rpmPct = Math.min(100, Math.round((telemetry.rpm / telemetry.redlineRpm) * 100));
  const layout = settings.mobileLayout;
  const btnScale = layout.buttonScale;
  const btnOpacity = layout.buttonOpacity;

  // Slightly tighten max bottom-center scale on narrow phone screens so it never crowds pedals
  const bottomClusterScale = isMobile ? Math.min(hudScale, 1.12) : hudScale;

  const formatTime = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const rem = sec % 60;
    return `${mins}:${rem < 10 ? '0' : ''}${rem.toFixed(2)}`;
  };

  return (
    <>
      {/* LAYER 1 (z-20): MOBILE MULTI-TOUCH CONTROLS inside safe-area bounds */}
      {isMobile && (
        <div
          className="fixed z-20 pointer-events-none racing-touch-lock"
          style={{
            top: 'env(safe-area-inset-top)',
            bottom: 'env(safe-area-inset-bottom)',
            left: 'env(safe-area-inset-left)',
            right: 'env(safe-area-inset-right)',
            opacity: btnOpacity,
          }}
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
                type="button"
                aria-label="Steer Left"
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
                className={`absolute pointer-events-auto w-[clamp(48px,8.5vw,64px)] h-[clamp(48px,8.5vw,64px)] rounded-2xl border-2 flex flex-col items-center justify-center transition-transform touch-none select-none ${
                  pressedMap.left
                    ? 'bg-amber-500 text-slate-950 border-white scale-95'
                    : 'bg-[#0b0e16]/85 text-white border-white/25'
                }`}
              >
                <ArrowLeft className="w-[clamp(20px,3.6vw,28px)] h-[clamp(20px,3.6vw,28px)]" />
                <span className="text-[9px] font-bold leading-none">LEFT</span>
              </button>

              <button
                type="button"
                aria-label="Steer Right"
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
                className={`absolute pointer-events-auto w-[clamp(48px,8.5vw,64px)] h-[clamp(48px,8.5vw,64px)] rounded-2xl border-2 flex flex-col items-center justify-center transition-transform touch-none select-none ${
                  pressedMap.right
                    ? 'bg-amber-500 text-slate-950 border-white scale-95'
                    : 'bg-[#0b0e16]/85 text-white border-white/25'
                }`}
              >
                <ArrowRight className="w-[clamp(20px,3.6vw,28px)] h-[clamp(20px,3.6vw,28px)]" />
                <span className="text-[9px] font-bold leading-none">RIGHT</span>
              </button>
            </>
          )}

          {/* Mode 2: Tilt Calibrate Button */}
          {settings.controlMode === 'tilt' && (
            <button
              type="button"
              style={{
                left: `${layout.positions.wheel.xPct}%`,
                top: `${layout.positions.wheel.yPct}%`,
                transform: `translate(-50%, -50%) scale(${btnScale})`,
              }}
              onClick={() => onCalibrateTilt(rawTiltDegRef.current)}
              className="absolute pointer-events-auto px-3.5 py-2.5 min-h-[44px] rounded-xl bg-[#0b0e16]/85 border border-cyan-400/50 text-cyan-300 text-xs font-bold flex items-center gap-1.5"
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
              className="absolute pointer-events-auto w-[clamp(84px,14vw,112px)] h-[clamp(84px,14vw,112px)] rounded-full border-4 border-amber-400/80 bg-[#0b0e16]/85 flex items-center justify-center shadow-lg touch-none select-none"
            >
              <div className="w-full h-2 bg-slate-600/80 absolute" />
              <div className="w-2 h-1/2 bg-amber-400 absolute top-0 rounded-full" />
              <div className="w-7 h-7 rounded-full bg-slate-800 border border-amber-400 flex items-center justify-center text-[9px] font-bold text-amber-400 z-10">
                DK
              </div>
            </div>
          )}

          {/* Accelerate (Gas) Pedal */}
          <button
            type="button"
            aria-label="Gas Pedal"
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
            className={`absolute pointer-events-auto w-[clamp(48px,8.5vw,64px)] h-[clamp(56px,10.5vw,80px)] rounded-2xl border-2 flex flex-col items-center justify-center touch-none select-none ${
              pressedMap.accel
                ? 'bg-emerald-500 text-slate-950 border-white scale-95'
                : 'bg-[#0b0e16]/85 text-emerald-400 border-emerald-400/50'
            }`}
          >
            <ArrowUp className="w-[clamp(20px,3.6vw,28px)] h-[clamp(20px,3.6vw,28px)]" />
            <span className="text-[9px] font-bold leading-none">GAS</span>
          </button>

          {/* Brake / Reverse Pedal */}
          <button
            type="button"
            aria-label="Brake Pedal"
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
            className={`absolute pointer-events-auto w-[clamp(48px,8.5vw,64px)] h-[clamp(48px,8.5vw,64px)] rounded-2xl border-2 flex flex-col items-center justify-center touch-none select-none ${
              pressedMap.brake
                ? 'bg-red-500 text-white border-white scale-95'
                : 'bg-[#0b0e16]/85 text-red-400 border-red-400/50'
            }`}
          >
            <ArrowDown className="w-[clamp(18px,3.2vw,24px)] h-[clamp(18px,3.2vw,24px)]" />
            <span className="text-[9px] font-bold leading-none">BRAKE</span>
          </button>

          {/* Nitro */}
          <button
            type="button"
            aria-label="Nitro Boost"
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
            className={`absolute pointer-events-auto w-[clamp(44px,7.5vw,56px)] h-[clamp(44px,7.5vw,56px)] rounded-full border-2 flex flex-col items-center justify-center touch-none select-none ${
              pressedMap.nitro
                ? 'bg-cyan-400 text-slate-950 border-white scale-95'
                : 'bg-[#0b0e16]/85 text-cyan-300 border-cyan-400/50'
            }`}
          >
            <Flame className="w-4 h-4" />
            <span className="text-[8px] font-bold leading-none mt-0.5">NITRO</span>
          </button>

          {/* Handbrake */}
          <button
            type="button"
            aria-label="Handbrake Drift"
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
            className={`absolute pointer-events-auto w-[clamp(44px,7.5vw,56px)] h-[clamp(44px,7.5vw,56px)] rounded-full border-2 flex flex-col items-center justify-center touch-none select-none ${
              pressedMap.handbrake
                ? 'bg-amber-500 text-slate-950 border-white scale-95'
                : 'bg-[#0b0e16]/85 text-amber-300 border-amber-400/50'
            }`}
          >
            <OctagonAlert className="w-4 h-4" />
            <span className="text-[8px] font-bold leading-none mt-0.5">DRIFT</span>
          </button>

          {/* Horn */}
          <button
            type="button"
            aria-label="Horn"
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
            className={`absolute pointer-events-auto w-[clamp(38px,6.2vw,48px)] h-[clamp(38px,6.2vw,48px)] rounded-xl border flex flex-col items-center justify-center touch-none select-none ${
              pressedMap.horn
                ? 'bg-white text-slate-950 border-white'
                : 'bg-[#0b0e16]/85 text-slate-200 border-white/20'
            }`}
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span className="text-[7px] font-bold leading-none mt-0.5">HORN</span>
          </button>

          {/* Headlights */}
          <button
            type="button"
            aria-label="Headlights"
            style={{
              left: `${layout.positions.lights.xPct}%`,
              top: `${layout.positions.lights.yPct}%`,
              transform: `translate(-50%, -50%) scale(${btnScale})`,
            }}
            onClick={onToggleLights}
            className="absolute pointer-events-auto w-[clamp(38px,6.2vw,48px)] h-[clamp(38px,6.2vw,48px)] rounded-xl border border-white/20 bg-[#0b0e16]/85 text-amber-300 flex flex-col items-center justify-center touch-manipulation select-none"
          >
            <Lightbulb className="w-3.5 h-3.5" />
            <span className="text-[7px] font-bold leading-none mt-0.5">LIGHTS</span>
          </button>

          {/* Camera Switch */}
          <button
            type="button"
            aria-label="Switch Camera"
            style={{
              left: `${layout.positions.camera.xPct}%`,
              top: `${layout.positions.camera.yPct}%`,
              transform: `translate(-50%, -50%) scale(${btnScale})`,
            }}
            onClick={onCycleCamera}
            className="absolute pointer-events-auto w-[clamp(38px,6.2vw,48px)] h-[clamp(38px,6.2vw,48px)] rounded-xl border border-white/20 bg-[#0b0e16]/85 text-cyan-300 flex flex-col items-center justify-center touch-manipulation select-none"
          >
            <Camera className="w-3.5 h-3.5" />
            <span className="text-[7px] font-bold leading-none mt-0.5">CAM</span>
          </button>
        </div>
      )}

      {/* LAYER 2 (z-30): TELEMETRY HUD — always above 3D canvas & touch buttons, pointer-events: none */}
      <div className="fixed inset-0 z-30 pointer-events-none racing-touch-lock pt-[max(0.4rem,env(safe-area-inset-top))] pb-[max(0.4rem,env(safe-area-inset-bottom))] pl-[max(0.5rem,env(safe-area-inset-left))] pr-[max(0.5rem,env(safe-area-inset-right))]">
        {/* High-Speed Radial Speed Lines Effect */}
        {telemetry.speedKmh > 190 && (
          <div
            className="absolute inset-0 pointer-events-none transition-opacity duration-150"
            style={{
              opacity: Math.min(
                0.45,
                ((telemetry.speedKmh - 190) / 230) * (telemetry.nitroActive ? 0.5 : 0.32)
              ),
              background:
                'radial-gradient(circle at center, transparent 52%, rgba(56, 189, 248, 0.25) 88%, rgba(245, 158, 11, 0.35) 100%)',
            }}
          />
        )}

        {/* Non-blocking Portrait Orientation Tip (never hides HUD or 3D race) */}
        {isPortrait && !portraitHintDismissed && (
          <div className="absolute top-[max(3.6rem,calc(env(safe-area-inset-top)+3.4rem))] left-1/2 -translate-x-1/2 z-40 pointer-events-auto flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#0b0e16]/90 border border-amber-500/40 text-xs text-slate-200 whitespace-nowrap shadow-lg">
            <Smartphone className="w-3.5 h-3.5 text-amber-400 rotate-90 shrink-0" />
            <span>Rotate to landscape for widest view</span>
            <button
              type="button"
              aria-label="Dismiss rotate hint"
              onClick={() => setPortraitHintDismissed(true)}
              className="p-0.5 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Top HUD Safe Zone: Position/Lap/Time (Top-Left), Rear Mirror (Desktop), Minimap & Pause (Top-Right) */}
        <div className="relative flex items-start justify-between gap-2">
          {/* Top-Left Cluster: Position + Lap + Time */}
          {hud.position || hud.lapTime ? (
            <div
              style={{
                transform: `scale(${hudScale})`,
                transformOrigin: 'top left',
              }}
              className="bg-[#0b0e16]/88 border border-white/15 rounded-xl px-[clamp(0.55rem,1.4vw,0.9rem)] py-[clamp(0.35rem,0.9vh,0.625rem)] flex items-center gap-[clamp(0.5rem,1.4vw,1rem)] shadow-lg"
            >
              {hud.position && (
                <div>
                  <div className="text-[9px] sm:text-[10px] uppercase tracking-wider text-slate-400 leading-none mb-0.5">
                    Pos
                  </div>
                  <div className="font-display font-bold text-[clamp(1rem,2.6vw,1.5rem)] text-amber-400 font-mono-num leading-none">
                    {telemetry.position}
                    <span className="text-[11px] sm:text-xs text-slate-400">
                      {' '}
                      / {telemetry.totalCars}
                    </span>
                  </div>
                </div>
              )}

              {hud.position && hud.lapTime && (
                <div className="h-[clamp(1.25rem,3vh,1.75rem)] w-px bg-white/15" />
              )}

              {hud.lapTime && (
                <>
                  <div>
                    <div className="text-[9px] sm:text-[10px] uppercase tracking-wider text-slate-400 leading-none mb-0.5">
                      Lap
                    </div>
                    <div className="font-display font-bold text-[clamp(0.95rem,2.3vw,1.25rem)] text-white font-mono-num leading-none">
                      {telemetry.lap}/{telemetry.totalLaps}
                    </div>
                  </div>
                  <div className="h-[clamp(1.25rem,3vh,1.75rem)] w-px bg-white/15" />
                  <div>
                    <div className="text-[9px] sm:text-[10px] uppercase tracking-wider text-slate-400 leading-none mb-0.5">
                      Time
                    </div>
                    <div className="font-mono-num font-semibold text-[clamp(0.75rem,1.9vw,1rem)] text-slate-100 leading-none">
                      {formatTime(telemetry.raceTimeSec)}
                    </div>
                  </div>
                  {telemetry.ghostBestTimeSec !== null && (
                    <>
                      <div className="h-[clamp(1.25rem,3vh,1.75rem)] w-px bg-white/15" />
                      <div>
                        <div className="text-[9px] sm:text-[10px] uppercase tracking-wider text-cyan-300 leading-none mb-0.5">
                          PB Ghost
                        </div>
                        {telemetry.ghostDeltaSec !== null ? (
                          <div
                            className={`font-mono-num font-bold text-[clamp(0.72rem,1.8vw,0.95rem)] leading-none ${
                              telemetry.ghostDeltaSec <= 0
                                ? 'text-emerald-400'
                                : 'text-rose-400'
                            }`}
                          >
                            {telemetry.ghostDeltaSec <= 0 ? '' : '+'}
                            {telemetry.ghostDeltaSec.toFixed(2)}s
                          </div>
                        ) : (
                          <div className="font-mono-num font-semibold text-[clamp(0.72rem,1.8vw,0.95rem)] text-cyan-200 leading-none">
                            {formatTime(telemetry.ghostBestTimeSec)}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                  {telemetry.checkpointTimeLeftSec !== null && (
                    <>
                      <div className="h-[clamp(1.25rem,3vh,1.75rem)] w-px bg-white/15" />
                      <div>
                        <div className="text-[9px] sm:text-[10px] uppercase tracking-wider text-amber-300 leading-none mb-0.5">
                          Next CP
                        </div>
                        <div
                          className={`font-mono-num font-bold text-[clamp(0.75rem,1.9vw,1rem)] leading-none ${
                            telemetry.checkpointTimeLeftSec <= 6
                              ? 'text-red-400 animate-pulse'
                              : telemetry.checkpointTimeLeftSec <= 12
                                ? 'text-amber-300'
                                : 'text-cyan-300'
                          }`}
                        >
                          {telemetry.checkpointTimeLeftSec.toFixed(1)}s
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          ) : (
            <div />
          )}

          {/* Top-Center Rear-View Mirror Frame (Desktop / Tablet only so small phone screens stay uncluttered) */}
          {telemetry.cameraMode !== 'cinematic' && (
            <div className="hidden md:flex flex-col items-center">
              <div className="w-[210px] h-[64px] border-2 border-slate-600/80 rounded-lg shadow-lg relative overflow-hidden">
                <span className="absolute bottom-1 right-1.5 text-[9px] font-semibold tracking-wider text-slate-300/80 uppercase">
                  Rear Mirror
                </span>
              </div>
            </div>
          )}

          {/* Top-Right Safe Zone: Minimap + Pause */}
          <div className="flex items-start gap-2">
            {hud.minimap && (
              <div
                className="bg-[#0b0e16]/88 border border-white/15 rounded-xl p-1 shadow-lg shrink-0"
                style={{
                  width: `calc(clamp(68px, 13vw, 118px) * ${hudScale})`,
                  height: `calc(clamp(50px, 9.6vw, 88px) * ${hudScale})`,
                }}
              >
                <canvas
                  ref={minimapCanvasRef}
                  width={160}
                  height={120}
                  className="w-full h-full block"
                />
              </div>
            )}

            <div className="pointer-events-auto flex flex-col gap-1.5 shrink-0">
              <button
                type="button"
                onClick={onPause}
                aria-label="Pause race"
                className="w-10 h-10 sm:w-11 sm:h-11 rounded-lg bg-[#0b0e16]/90 hover:bg-slate-800 border border-white/15 flex items-center justify-center text-white cursor-pointer touch-manipulation"
              >
                <Pause className="w-5 h-5" />
              </button>
              {!isMobile && (
                <div className="flex flex-col gap-1">
                  <button
                    type="button"
                    onClick={onCycleCamera}
                    title="Camera (C)"
                    className="w-11 h-9 rounded-lg bg-[#0b0e16]/85 hover:bg-slate-800 border border-white/10 flex items-center justify-center text-slate-200 cursor-pointer"
                  >
                    <Camera className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
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
        <div className="absolute inset-x-0 top-[22%] flex flex-col items-center justify-center pointer-events-none gap-1.5 px-4">
          {telemetry.countdown >= 0 && (
            <div className="bg-[#0b0e16]/90 border border-amber-500/40 rounded-2xl px-6 sm:px-8 py-3 sm:py-4">
              <span className="font-display font-bold text-5xl sm:text-7xl text-amber-400 font-mono-num">
                {telemetry.countdown === 0 ? 'GO!' : telemetry.countdown}
              </span>
            </div>
          )}
          {telemetry.wrongWay && (
            <div className="bg-red-600/90 text-white px-4 py-1.5 rounded-lg font-display font-bold text-sm sm:text-lg tracking-wider text-center">
              WRONG WAY · TURN AROUND {!isMobile && '(R TO RESET)'}
            </div>
          )}
          {telemetry.checkpointNotice && (
            <div className="bg-[#0b0e16]/85 border border-cyan-400/50 text-cyan-300 px-3.5 py-1 rounded-lg font-display font-semibold text-xs sm:text-sm tracking-wider">
              {telemetry.checkpointNotice}
            </div>
          )}
          {telemetry.slipstreaming && telemetry.countdown < 0 && (
            <div className="bg-cyan-500/20 border border-cyan-400/60 text-cyan-200 px-3.5 py-1 rounded-lg font-display font-bold text-xs sm:text-sm tracking-wider">
              SLIPSTREAM DRAFT · +{telemetry.slipstreamBoostPct}% SPEED
            </div>
          )}
          {telemetry.drifting && (
            <div className="text-amber-400 font-display font-bold text-sm sm:text-base tracking-wider">
              DRIFT · {telemetry.driftScore} m
            </div>
          )}
        </div>

        {/* Bottom-Center Safe Zone: Digital Speedometer + Gear + RPM Bar + Nitro Bar */}
        {(hud.speedometer || hud.nitro) && (
          <div
            className={`absolute left-1/2 pointer-events-none ${
              isMobile && isPortrait
                ? 'bottom-[clamp(140px,24vh,175px)]'
                : 'bottom-[max(0.45rem,env(safe-area-inset-bottom))]'
            }`}
            style={{
              transform: `translateX(-50%) scale(${bottomClusterScale})`,
              transformOrigin: 'bottom center',
            }}
          >
            <div
              className={`bg-[#0b0e16]/90 border border-white/15 rounded-xl px-[clamp(0.65rem,1.8vw,1rem)] py-[clamp(0.4rem,1vh,0.65rem)] shadow-xl ${
                isMobile && isPortrait
                  ? 'w-[clamp(216px,66vw,270px)]'
                  : 'w-[clamp(174px,33vw,295px)]'
              }`}
            >
              {hud.speedometer && (
                <>
                  <div className="flex items-baseline justify-between gap-2">
                    <div className="flex items-baseline gap-1">
                      <span className="font-display font-bold text-[clamp(1.65rem,4.6vw,2.6rem)] text-white font-mono-num leading-none tracking-tight">
                        {displaySpeed}
                      </span>
                      <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase">
                        {settings.speedUnit === 'mph' ? 'MPH' : 'KM/H'}
                      </span>
                    </div>

                    <div className="flex items-baseline gap-2 text-xs">
                      <div className="text-slate-300 whitespace-nowrap">
                        <span className="text-[10px] text-slate-400 uppercase mr-0.5">G</span>
                        <span className="font-display font-bold text-[clamp(1.05rem,2.6vw,1.4rem)] text-amber-400 font-mono-num leading-none">
                          {telemetry.gear === 0 ? 'R' : telemetry.gear}
                        </span>
                      </div>
                      <div className="text-slate-400 font-mono-num text-[10px] sm:text-xs whitespace-nowrap">
                        {telemetry.rpm}
                        <span className="text-[9px] ml-0.5">RPM</span>
                      </div>
                    </div>
                  </div>

                  {/* Tachometer / RPM Bar */}
                  <div className="mt-1.5 h-[clamp(6px,1.1vh,8px)] w-full bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full transition-all duration-75"
                      style={{
                        width: `${rpmPct}%`,
                        backgroundColor:
                          rpmPct > 86 ? '#ef4444' : rpmPct > 65 ? '#f59e0b' : '#22d3ee',
                      }}
                    />
                  </div>
                </>
              )}

              {/* Nitro Bar + Desktop Indicators / Damage */}
              {(hud.nitro || !isMobile || telemetry.damagePct > 0) && (
                <div
                  className={`${hud.speedometer ? 'mt-1.5' : ''} flex items-center justify-between gap-2`}
                >
                  {hud.nitro && (
                    <div className="flex-1 flex items-center gap-1.5 min-w-0">
                      <Flame
                        className={`w-3.5 h-3.5 shrink-0 ${
                          telemetry.nitroActive ? 'text-cyan-400' : 'text-amber-400'
                        }`}
                      />
                      <div className="flex-1 h-[clamp(6px,1vh,8px)] bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-cyan-400 transition-all duration-75"
                          style={{ width: `${telemetry.nitro}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-mono-num font-bold text-cyan-300 shrink-0">
                        {Math.round(telemetry.nitro)}%
                      </span>
                    </div>
                  )}

                  {(!isMobile || telemetry.damagePct > 0) && (
                    <div className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-300 pointer-events-auto shrink-0">
                      {!isMobile && (
                        <>
                          <button
                            type="button"
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
                            type="button"
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
                            type="button"
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
                        </>
                      )}
                      {telemetry.damagePct > 0 && (
                        <span className="text-red-400 font-mono-num">
                          DMG {telemetry.damagePct}%
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Desktop Keyboard Hint Bar */}
        {!isMobile && settings.showDesktopHints && (
          <div className="absolute bottom-2 right-3 bg-[#0b0e16]/80 border border-white/10 rounded-lg px-3 py-1.5 text-[11px] text-slate-300 font-mono-num flex items-center gap-2">
            <span>
              W/↑ Gas · S/↓ Brake · A/D Steer · Shift Nitro · Space Drift · H Horn · L Lights · C Cam · R Reset
            </span>
            <button
              type="button"
              onClick={onResetCar}
              className="pointer-events-auto text-amber-400 hover:underline ml-1 cursor-pointer"
            >
              Reset
            </button>
          </div>
        )}
      </div>
    </>
  );
};
