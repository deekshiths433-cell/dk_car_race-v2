import React, { useEffect, useMemo, useRef } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  Bookmark,
  Clock,
  Cloud,
  Flag,
  MapPin,
  Play,
  ShoppingBag,
  Shuffle,
  Sun,
  Wrench,
} from 'lucide-react';
import { getCarDisplayName } from '../data/brandConfig';
import { CAR_SPECS } from '../data/cars';
import { computeMatchedRivalStats } from '../data/difficulty';
import { BIOME_META } from '../data/levels';
import {
  CarId,
  DifficultySetting,
  LevelConfig,
  OwnedCarState,
} from '../types/game';
import { generateTrackLayout } from '../utils/trackLayout';

interface RaceIntroModalProps {
  level: LevelConfig;
  playerCarId: CarId;
  ownedCarState: OwnedCarState;
  difficultySetting: DifficultySetting;
  isFavorite: boolean;
  onStartCountdown: () => void;
  onRerollMap: () => void;
  onToggleFavorite: () => void;
  onOpenGarage: () => void;
  onOpenShop: () => void;
  onCancel: () => void;
}

export const RaceIntroModal: React.FC<RaceIntroModalProps> = ({
  level,
  playerCarId,
  ownedCarState,
  difficultySetting,
  isFavorite,
  onStartCountdown,
  onRerollMap,
  onToggleFavorite,
  onOpenGarage,
  onOpenShop,
  onCancel,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const layout = useMemo(() => generateTrackLayout(level), [level]);
  const biome = BIOME_META[level.biome];
  const playerSpec = CAR_SPECS[playerCarId] ?? CAR_SPECS.bmw_m4;

  const matched = useMemo(
    () =>
      computeMatchedRivalStats(
        playerSpec,
        ownedCarState,
        level.levelNumber,
        difficultySetting
      ),
    [playerSpec, ownedCarState, level.levelNumber, difficultySetting]
  );

  useEffect(() => {
    console.log(
      `[DK Car Race][Intro] Level ${level.levelNumber} (${matched.difficultyName}) | Your car: ${matched.playerEffectiveTopSpeedKmh} km/h (stock ${matched.playerBaseTopSpeedKmh}, upgraded ${matched.playerUpgradedTopSpeedKmh}, ref ${matched.referenceTopSpeedKmh}). Rivals: ${matched.rivalTargetTopSpeedKmh} km/h (factor ${matched.difficultyFactor.toFixed(2)})`
    );
  }, [level.levelNumber, matched]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = 'rgba(148, 163, 184, 0.08)';
    ctx.lineWidth = 1;
    for (let x = 24; x < w; x += 28) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 24; y < h; y += 28) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    const { minX, maxX, minZ, maxZ } = layout.minimapBounds;
    const spanX = Math.max(10, maxX - minX);
    const spanZ = Math.max(10, maxZ - minZ);
    const pad = 34;
    const scale = Math.min((w - pad * 2) / spanX, (h - pad * 2) / spanZ);
    const cx = w * 0.5;
    const cy = h * 0.5;
    const midX = (minX + maxX) * 0.5;
    const midZ = (minZ + maxZ) * 0.5;

    const toCanvas = (x: number, z: number) => ({
      x: cx + (x - midX) * scale,
      y: cy + (z - midZ) * scale,
    });

    const pts = layout.minimapPoints.map((p) => toCanvas(p.x, p.z));
    if (pts.length < 3) return;

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = biome.accent;
    ctx.globalAlpha = 0.28;
    ctx.lineWidth = 14;
    ctx.beginPath();
    pts.forEach((p, idx) => {
      if (idx === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.closePath();
    ctx.stroke();
    ctx.globalAlpha = 1;

    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 10;
    ctx.stroke();

    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 3.2;
    ctx.stroke();

    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 1.1;
    ctx.setLineDash([5, 5]);
    ctx.stroke();
    ctx.setLineDash([]);

    const arrowSample = layout.samples[Math.floor(layout.samples.length * 0.14)];
    if (arrowSample) {
      const ap = toCanvas(arrowSample.point.x, arrowSample.point.z);
      const ang = Math.atan2(arrowSample.tangent.z, arrowSample.tangent.x);
      ctx.save();
      ctx.translate(ap.x, ap.y);
      ctx.rotate(ang);
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.moveTo(7, 0);
      ctx.lineTo(-4, -4.5);
      ctx.lineTo(-2, 0);
      ctx.lineTo(-4, 4.5);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    ctx.font = '600 9px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    layout.checkpoints.forEach((cp, idx) => {
      const p = toCanvas(cp.point.x, cp.point.z);
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 7.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 1.6;
      ctx.stroke();
      ctx.fillStyle = '#67e8f9';
      ctx.fillText(`${idx + 1}`, p.x, p.y + 0.5);
    });

    const startP = toCanvas(layout.startPoint.x, layout.startPoint.z);
    const finishP = toCanvas(layout.finishPoint.x, layout.finishPoint.z);

    const fTan = layout.samples[0].tangent;
    const fRight = layout.samples[0].right;
    const perpLen = 9;
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(finishP.x - fRight.x * perpLen, finishP.y - fRight.z * perpLen);
    ctx.lineTo(finishP.x + fRight.x * perpLen, finishP.y + fRight.z * perpLen);
    ctx.stroke();

    ctx.fillStyle = '#10b981';
    ctx.beginPath();
    ctx.arc(startP.x, startP.y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ecfdf5';
    ctx.lineWidth = 1.8;
    ctx.stroke();

    ctx.save();
    ctx.translate(finishP.x, finishP.y);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(-5, -5, 10, 10);
    ctx.strokeStyle = '#fffbeb';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(-5, -5, 10, 10);
    ctx.restore();

    const tanScreenX = fTan.x;
    const tanScreenY = fTan.z;
    const startLabelX = Math.max(36, Math.min(w - 36, startP.x - tanScreenX * 22 - 18));
    const startLabelY = Math.max(14, Math.min(h - 14, startP.y - tanScreenY * 22 + 12));
    const finishLabelX = Math.max(38, Math.min(w - 38, finishP.x + tanScreenX * 22 + 18));
    const finishLabelY = Math.max(14, Math.min(h - 14, finishP.y + tanScreenY * 22 - 12));

    ctx.fillStyle = 'rgba(6, 78, 59, 0.92)';
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(startLabelX - 24, startLabelY - 9, 48, 18, 4);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ecfdf5';
    ctx.font = 'bold 9px sans-serif';
    ctx.fillText('START', startLabelX, startLabelY + 0.5);

    ctx.fillStyle = 'rgba(120, 53, 15, 0.92)';
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(finishLabelX - 26, finishLabelY - 9, 52, 18, 4);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#fef3c7';
    ctx.fillText('FINISH', finishLabelX, finishLabelY + 0.5);
  }, [layout, biome.accent]);

  const kmLength = (layout.totalLength / 1000).toFixed(2);
  const diffColor =
    matched.difficultyName === 'Easy'
      ? 'text-emerald-400'
      : matched.difficultyName === 'Medium'
        ? 'text-cyan-400'
        : matched.difficultyName === 'Hard'
          ? 'text-amber-400'
          : 'text-red-400';

  return (
    <div className="fixed inset-0 z-40 h-dvh w-full bg-[#090b10]/78 dk-scroll flex flex-col p-3 sm:p-5 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))] pl-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))]">
      <div className="w-full max-w-2xl my-auto mx-auto bg-[#0f1420]/96 border border-white/15 rounded-2xl p-4 sm:p-5 space-y-3.5 max-lg:landscape:p-3 max-lg:landscape:space-y-2.5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] font-semibold uppercase tracking-wider">
              <span style={{ color: biome.accent }}>
                Level {level.levelNumber} · {biome.label}
              </span>
              <span className="text-slate-600">·</span>
              <span className={diffColor}>
                {matched.difficultyName} ({Math.round(matched.difficultyFactor * 100)}%)
              </span>
              <span className="text-slate-600">·</span>
              <span className="font-mono-num text-slate-400">Seed #{level.seed}</span>
              {level.isFavoriteReplay && (
                <>
                  <span className="text-slate-600">·</span>
                  <span className="text-amber-300">Saved Favorite</span>
                </>
              )}
            </div>
            <h2 className="font-display text-xl sm:text-2xl font-bold text-white leading-tight mt-0.5 truncate">
              {level.name}
            </h2>
          </div>

          <button
            type="button"
            onClick={onToggleFavorite}
            aria-label={isFavorite ? 'Remove saved map seed' : 'Save map seed to favorites'}
            className={`inline-flex items-center gap-1.5 px-3 py-2 min-h-[40px] rounded-lg border text-xs font-semibold shrink-0 cursor-pointer touch-manipulation transition-colors ${
              isFavorite
                ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                : 'bg-slate-800/90 hover:bg-slate-700 border-white/10 text-slate-200'
            }`}
          >
            <Bookmark className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
            <span className="hidden sm:inline">{isFavorite ? 'Saved' : 'Save Seed'}</span>
          </button>
        </div>

        {/* Route Minimap + Circuit Telemetry */}
        <div className="grid grid-cols-1 sm:grid-cols-12 max-lg:landscape:grid-cols-12 gap-3 items-stretch">
          <div className="sm:col-span-7 max-lg:landscape:col-span-6 bg-[#090d16] border border-white/10 rounded-xl p-2 flex flex-col">
            <canvas
              ref={canvasRef}
              width={360}
              height={210}
              className="w-full h-[150px] sm:h-[180px] max-lg:landscape:h-[128px] rounded-lg block"
            />
            <div className="flex items-center justify-between px-1.5 pt-1.5 text-[10px] text-slate-400">
              <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold">
                <MapPin className="w-3 h-3" /> Start Grid
              </span>
              <span className="text-cyan-400 font-mono-num">4 Checkpoints</span>
              <span className="inline-flex items-center gap-1 text-amber-400 font-semibold">
                <Flag className="w-3 h-3" /> Finish Line
              </span>
            </div>
          </div>

          <div className="sm:col-span-5 max-lg:landscape:col-span-6 flex flex-col justify-between gap-2 bg-slate-900/90 border border-white/10 rounded-xl p-3">
            {/* Player Speed vs Rivals Top Speed Matchup */}
            <div className="bg-slate-950/80 border border-white/10 rounded-lg p-2.5 space-y-1.5">
              <div className="flex items-center justify-between gap-2 text-[10px] uppercase font-semibold tracking-wider">
                <span className="text-slate-400 truncate">
                  {getCarDisplayName(playerSpec)} vs Grid
                </span>
                <span className={`${diffColor} shrink-0 font-bold`}>
                  {matched.difficultyName} · {Math.round(matched.difficultyFactor * 100)}%
                </span>
              </div>
              <div className="flex items-center justify-between text-xs font-mono-num">
                <div>
                  <div className="text-[10px] text-slate-400">Your Car</div>
                  <div className="font-bold text-emerald-400">
                    {matched.playerEffectiveTopSpeedKmh} km/h
                  </div>
                </div>
                <div className="text-slate-600 text-[10px] font-bold">VS</div>
                <div className="text-right">
                  <div className="text-[10px] text-slate-400">Rivals Top</div>
                  <div className="font-bold text-amber-300">
                    {matched.rivalTargetTopSpeedKmh} km/h
                  </div>
                </div>
              </div>
              <div className="text-[10px] font-mono-num text-cyan-300/95 bg-slate-900/90 rounded px-2 py-1 border border-white/5">
                Your car: {matched.playerEffectiveTopSpeedKmh} km/h. Rivals:{' '}
                {matched.rivalTargetTopSpeedKmh} km/h (factor{' '}
                {matched.difficultyFactor.toFixed(2)})
              </div>
              <div className="text-[10px] text-slate-400 leading-tight pt-0.5">
                {level.levelNumber <= 2
                  ? 'Constant pace from start (+-2% spread) · Pack holds behind clean laps'
                  : 'Constant full level pace from start (+-2% spread) · 50% upgrade edge'}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-1.5 text-xs font-mono-num">
              <div className="bg-slate-950/70 rounded-lg px-2.5 py-1.5 border border-white/5">
                <div className="text-[10px] text-slate-400 uppercase font-sans">Length</div>
                <div className="font-bold text-white">{kmLength} km</div>
              </div>
              <div className="bg-slate-950/70 rounded-lg px-2.5 py-1.5 border border-white/5">
                <div className="text-[10px] text-slate-400 uppercase font-sans">Race</div>
                <div className="font-bold text-white">
                  {level.laps} Laps · {level.rivalCount} Rivals
                </div>
              </div>
              <div className="bg-slate-950/70 rounded-lg px-2 py-1.5 border border-white/5 flex items-center gap-1.5">
                <Sun className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="capitalize text-slate-200 truncate">{level.timeOfDay}</span>
              </div>
              <div className="bg-slate-950/70 rounded-lg px-2 py-1.5 border border-white/5 flex items-center gap-1.5">
                <Cloud className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span className="capitalize text-slate-200 truncate">{level.weather}</span>
              </div>
            </div>

            <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1 border-t border-white/10">
              <span>Hazards · Timer</span>
              <span className="font-mono-num font-semibold text-amber-300 inline-flex items-center gap-1">
                <span>
                  {level.obstacleCount === 0 ? 'Clean Track' : `${level.obstacleCount} Cones`}
                </span>
                {level.checkpointTimeLimitSec !== null && (
                  <>
                    <span className="text-slate-600">·</span>
                    <Clock className="w-3 h-3 text-cyan-400" />
                    <span className="text-cyan-300">{level.checkpointTimeLimitSec}s CP</span>
                  </>
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Underpowered / Damage Advisory Banner */}
        {matched.isUnderpowered && matched.underpoweredReason && (
          <div className="p-2.5 sm:p-3 rounded-xl bg-amber-950/55 border border-amber-400/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-start gap-2 text-amber-100">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>{matched.underpoweredReason}</span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={onOpenGarage}
                className="px-2.5 py-1.5 min-h-[34px] rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px] inline-flex items-center gap-1 cursor-pointer touch-manipulation"
              >
                <Wrench className="w-3.5 h-3.5" />
                <span>Open Garage</span>
              </button>
              <button
                type="button"
                onClick={onOpenShop}
                className="px-2.5 py-1.5 min-h-[34px] rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-[11px] inline-flex items-center gap-1 cursor-pointer touch-manipulation"
              >
                <ShoppingBag className="w-3.5 h-3.5 text-emerald-400" />
                <span>Car Shop</span>
              </button>
            </div>
          </div>
        )}

        {/* Action Row */}
        <div className="flex flex-wrap sm:flex-nowrap items-stretch gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 min-h-[46px] rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer touch-manipulation"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>

          <button
            type="button"
            onClick={onRerollMap}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 min-h-[46px] rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/10 text-cyan-300 text-xs font-semibold cursor-pointer touch-manipulation"
          >
            <Shuffle className="w-4 h-4" />
            <span>New Map</span>
          </button>

          <button
            type="button"
            onClick={onStartCountdown}
            className="flex-1 min-w-[160px] inline-flex items-center justify-center gap-2 px-5 py-3 min-h-[48px] rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-[0.99] text-slate-950 font-display font-bold text-base tracking-wide cursor-pointer touch-manipulation"
          >
            <Play className="w-5 h-5 fill-current" />
            <span>START RACE</span>
          </button>
        </div>
      </div>
    </div>
  );
};

