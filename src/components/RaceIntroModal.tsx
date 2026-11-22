import React, { useEffect, useMemo, useRef } from 'react';
import {
  ArrowLeft,
  Bookmark,
  Cloud,
  Flag,
  MapPin,
  Play,
  Shuffle,
  Sun,
} from 'lucide-react';
import { BIOME_META } from '../data/levels';
import { LevelConfig } from '../types/game';
import { generateTrackLayout } from '../utils/trackLayout';

interface RaceIntroModalProps {
  level: LevelConfig;
  isFavorite: boolean;
  onStartCountdown: () => void;
  onRerollMap: () => void;
  onToggleFavorite: () => void;
  onCancel: () => void;
}

export const RaceIntroModal: React.FC<RaceIntroModalProps> = ({
  level,
  isFavorite,
  onStartCountdown,
  onRerollMap,
  onToggleFavorite,
  onCancel,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const layout = useMemo(() => generateTrackLayout(level), [level]);
  const biome = BIOME_META[level.biome];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // Subtle dark slate grid backdrop
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

    // Outer shoulder glow
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

    // Main asphalt road outline
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 10;
    ctx.stroke();

    // Inner track surface
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 3.2;
    ctx.stroke();

    // Racing centerline dash
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 1.1;
    ctx.setLineDash([5, 5]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Direction arrow near 15% track progress
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

    // Checkpoints
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

    // Start point marker (grid behind line)
    const startP = toCanvas(layout.startPoint.x, layout.startPoint.z);
    // Finish line marker
    const finishP = toCanvas(layout.finishPoint.x, layout.finishPoint.z);

    // Draw perpendicular finish checkered strip across road
    const fTan = layout.samples[0].tangent;
    const fRight = layout.samples[0].right;
    const perpLen = 9;
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(finishP.x - fRight.x * perpLen, finishP.y - fRight.z * perpLen);
    ctx.lineTo(finishP.x + fRight.x * perpLen, finishP.y + fRight.z * perpLen);
    ctx.stroke();

    // Start circle (emerald)
    ctx.fillStyle = '#10b981';
    ctx.beginPath();
    ctx.arc(startP.x, startP.y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ecfdf5';
    ctx.lineWidth = 1.8;
    ctx.stroke();

    // Finish diamond (amber)
    ctx.save();
    ctx.translate(finishP.x, finishP.y);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(-5, -5, 10, 10);
    ctx.strokeStyle = '#fffbeb';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(-5, -5, 10, 10);
    ctx.restore();

    // Clear Start & Finish callout tags positioned cleanly away from each other
    const tanScreenX = fTan.x;
    const tanScreenY = fTan.z;
    const startLabelX = Math.max(36, Math.min(w - 36, startP.x - tanScreenX * 22 - 18));
    const startLabelY = Math.max(14, Math.min(h - 14, startP.y - tanScreenY * 22 + 12));
    const finishLabelX = Math.max(38, Math.min(w - 38, finishP.x + tanScreenX * 22 + 18));
    const finishLabelY = Math.max(14, Math.min(h - 14, finishP.y + tanScreenY * 22 - 12));

    // START badge
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

    // FINISH badge
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
              <span className="font-mono-num text-slate-400">
                Seed #{level.seed}
              </span>
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
              className="w-full h-[155px] sm:h-[185px] max-lg:landscape:h-[135px] rounded-lg block"
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

          <div className="sm:col-span-5 max-lg:landscape:col-span-6 flex flex-col justify-between gap-2.5 bg-slate-900/90 border border-white/10 rounded-xl p-3">
            <p className="text-xs text-slate-300 leading-relaxed max-lg:landscape:text-[11px]">
              {biome.summary}
            </p>

            <div className="grid grid-cols-2 gap-2 text-xs font-mono-num">
              <div className="bg-slate-950/70 rounded-lg px-2.5 py-2 border border-white/5">
                <div className="text-[10px] text-slate-400 uppercase font-sans">Length</div>
                <div className="font-bold text-white">{kmLength} km</div>
              </div>
              <div className="bg-slate-950/70 rounded-lg px-2.5 py-2 border border-white/5">
                <div className="text-[10px] text-slate-400 uppercase font-sans">Race</div>
                <div className="font-bold text-white">
                  {level.laps} Laps · {level.rivalCount} Rivals
                </div>
              </div>
              <div className="bg-slate-950/70 rounded-lg px-2.5 py-2 border border-white/5 flex items-center gap-1.5">
                <Sun className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="capitalize text-slate-200 truncate">{level.timeOfDay}</span>
              </div>
              <div className="bg-slate-950/70 rounded-lg px-2.5 py-2 border border-white/5 flex items-center gap-1.5">
                <Cloud className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span className="capitalize text-slate-200 truncate">{level.weather}</span>
              </div>
            </div>

            <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1 border-t border-white/10">
              <span>Difficulty Tier</span>
              <span className="font-mono-num font-semibold text-amber-300">
                {Math.round(level.rivalSkill * 100)}% AI Pace · {level.obstacleCount} Hazards
              </span>
            </div>
          </div>
        </div>

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
