import React, { useState } from 'react';
import { AlertCircle, Check, CheckCircle2, Lock, ShoppingBag, Tv, X } from 'lucide-react';
import { CAR_ORDER, CAR_SPECS } from '../data/cars';
import { ShowroomCanvas } from '../engine/ShowroomCanvas';
import { CarId, SaveState } from '../types/game';
import { showRewardedAd } from '../utils/ads';

export interface CarPurchaseResult {
  ok: boolean;
  error?: string;
}

interface CarShopModalProps {
  save: SaveState;
  onSelectCar: (carId: CarId) => void;
  onBuyCar: (carId: CarId) => CarPurchaseResult;
  onAddPoints: (amount: number) => void;
  onClose: () => void;
}

interface ShopFeedback {
  type: 'success' | 'error';
  message: string;
}

const AD_REWARD_POINTS = 500;

export const CarShopModal: React.FC<CarShopModalProps> = ({
  save,
  onSelectCar,
  onBuyCar,
  onAddPoints,
  onClose,
}) => {
  const [previewId, setPreviewId] = useState<CarId>(save.selectedCarId);
  const [feedback, setFeedback] = useState<ShopFeedback | null>(null);
  const [adBusy, setAdBusy] = useState(false);

  const spec = CAR_SPECS[previewId];
  const ownedState = save.cars[previewId];
  const levelLocked =
    Boolean(spec?.unlockLevelReq) && save.highestUnlockedLevel < (spec?.unlockLevelReq ?? 1);

  const canAfford = save.points >= spec.price;
  const pointsNeeded = Math.max(0, spec.price - save.points);
  const isOwned = Boolean(ownedState?.owned);
  const isEquipped = save.selectedCarId === previewId;

  const handleSelectPreview = (id: CarId) => {
    setPreviewId(id);
    setFeedback(null);
  };

  const handleBuyClick = () => {
    if (!spec || !ownedState) {
      console.error('[DK Car Race][CarShop] Purchase failed: Unknown car or missing save entry.', {
        carId: previewId,
      });
      setFeedback({
        type: 'error',
        message: 'Unable to load car data. Check console for error details.',
      });
      return;
    }

    if (ownedState.owned) {
      console.warn('[DK Car Race][CarShop] Purchase skipped: Car is already owned.', {
        carId: previewId,
      });
      return;
    }

    if (levelLocked) {
      console.error('[DK Car Race][CarShop] Purchase blocked: Level requirement not reached.', {
        carId: previewId,
        requiredLevel: spec.unlockLevelReq,
        highestUnlockedLevel: save.highestUnlockedLevel,
      });
      setFeedback({
        type: 'error',
        message: `Reach Level ${spec.unlockLevelReq} to unlock ${spec.name}.`,
      });
      return;
    }

    if (save.points < spec.price) {
      const needed = spec.price - save.points;
      console.error('[DK Car Race][CarShop] Purchase failed: Not enough points.', {
        carId: previewId,
        carName: spec.name,
        price: spec.price,
        currentPoints: save.points,
        pointsNeeded: needed,
      });
      setFeedback({
        type: 'error',
        message: `Not enough points. You need ${needed.toLocaleString()} more.`,
      });
      return;
    }

    const result = onBuyCar(previewId);
    if (!result.ok) {
      console.error('[DK Car Race][CarShop] Purchase handler returned an error.', {
        carId: previewId,
        error: result.error,
      });
      setFeedback({
        type: 'error',
        message: result.error || 'Purchase could not be completed.',
      });
      return;
    }

    setFeedback({
      type: 'success',
      message: 'Car purchased!',
    });
  };

  const handleEquipClick = () => {
    if (!ownedState?.owned) {
      console.error('[DK Car Race][CarShop] Equip failed: Car is not owned yet.', {
        carId: previewId,
      });
      return;
    }
    onSelectCar(previewId);
    setFeedback({
      type: 'success',
      message: `${spec.name} equipped! Updated in Garage and Home page.`,
    });
  };

  const handleWatchAdForPoints = async () => {
    if (adBusy) return;
    setAdBusy(true);
    try {
      const res = await showRewardedAd({
        title: 'Earn Dealership Points',
        rewardLabel: `+${AD_REWARD_POINTS.toLocaleString()} Points`,
      });
      if (res.completed) {
        onAddPoints(AD_REWARD_POINTS);
        const projectedPoints = save.points + AD_REWARD_POINTS;
        if (spec && !ownedState.owned && projectedPoints < spec.price) {
          const remainingNeeded = spec.price - projectedPoints;
          setFeedback({
            type: 'success',
            message: `+${AD_REWARD_POINTS.toLocaleString()} pts earned! Need ${remainingNeeded.toLocaleString()} more pts for ${spec.name}.`,
          });
        } else {
          setFeedback({
            type: 'success',
            message: `+${AD_REWARD_POINTS.toLocaleString()} pts earned! You can now buy ${spec.name}.`,
          });
        }
      } else {
        console.warn('[DK Car Race][CarShop] Rewarded ad was cancelled before completion.');
        setFeedback({
          type: 'error',
          message: 'Ad cancelled before completion. No points added.',
        });
      }
    } catch (err) {
      console.error('[DK Car Race][CarShop] Rewarded ad failed to run:', err);
      setFeedback({
        type: 'error',
        message: 'Could not load rewarded ad. Please try again.',
      });
    } finally {
      setAdBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 h-dvh w-full bg-[#090b10] flex flex-col overflow-hidden">
      {/* Pinned Top Header with notch/safe-area padding */}
      <header className="shrink-0 flex items-center justify-between gap-3 border-b border-white/10 bg-[#0b0e16] pt-[max(0.5rem,env(safe-area-inset-top))] pb-2.5 max-lg:landscape:py-1.5 pl-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))] lg:px-6 lg:py-3">
        <div className="min-w-0">
          <h2 className="font-display text-base sm:text-lg lg:text-xl font-bold text-white leading-tight">
            SUPERCAR DEALERSHIP
          </h2>
          <p className="text-xs text-slate-400">
            Balance:{' '}
            <span className="text-amber-400 font-mono-num font-bold">
              {save.points.toLocaleString()} pts
            </span>
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close Car Shop"
          className="w-11 h-11 shrink-0 rounded-lg bg-slate-800 hover:bg-slate-700 active:bg-slate-600 flex items-center justify-center text-white cursor-pointer touch-manipulation"
        >
          <X className="w-5 h-5" />
        </button>
      </header>

      {/* Scrollable Middle Content on Mobile / Split View on Desktop */}
      <div className="flex-1 min-h-0 flex flex-col lg:grid lg:grid-cols-12 max-lg:overflow-y-auto max-lg:overscroll-contain dk-scroll">
        {/* Showcase + Full Car Description */}
        <div className="lg:col-span-7 flex flex-col lg:min-h-0 lg:overflow-y-auto dk-scroll bg-[#090b10]">
          {/* Car Preview: ~28% height in phone portrait, <=25% in phone landscape, full flex on desktop */}
          <div className="w-full relative shrink-0 max-lg:h-[28dvh] max-lg:min-h-[128px] max-lg:max-h-[195px] max-lg:landscape:h-[25dvh] max-lg:landscape:min-h-[88px] max-lg:landscape:max-h-[106px] lg:flex-1 lg:min-h-[180px]">
            <ShowroomCanvas
              carId={previewId}
              customization={ownedState.customization}
            />
          </div>

          {/* Full Car Description & Stats */}
          <div className="p-3.5 sm:p-5 border-t border-white/10 bg-[#0b0e16] pl-[max(0.875rem,env(safe-area-inset-left))] pr-[max(0.875rem,env(safe-area-inset-right))] lg:pl-5 lg:pr-5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="text-[11px] sm:text-xs text-amber-400 font-semibold uppercase tracking-wider">
                  {spec.brand} · {spec.engineLabel}
                </div>
                <h3 className="font-display text-xl sm:text-2xl font-bold text-white leading-snug">
                  {spec.name}
                </h3>
              </div>

              <div className="text-right font-mono-num text-xs sm:text-sm font-bold shrink-0 pt-0.5">
                {isEquipped ? (
                  <span className="text-emerald-400">EQUIPPED</span>
                ) : isOwned ? (
                  <span className="text-cyan-400">OWNED</span>
                ) : levelLocked ? (
                  <span className="text-slate-300">
                    LVL {spec.unlockLevelReq} · {spec.price.toLocaleString()} pts
                  </span>
                ) : (
                  <span className="text-amber-400">{spec.price.toLocaleString()} pts</span>
                )}
              </div>
            </div>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mt-1.5">
              {spec.tagline}. Engineered with a {spec.engineLabel.toLowerCase()} producing{' '}
              {spec.stats.horsepower} HP, reaching {spec.stats.topSpeedKmh} km/h with a{' '}
              {spec.stats.zeroToHundredSec}s 0–100 km/h sprint.
            </p>

            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5 sm:gap-3 text-xs pt-3 mt-3 border-t border-white/10">
              <div>
                <div className="text-slate-400 text-[11px]">Top Speed</div>
                <div className="font-mono-num font-bold text-white text-xs sm:text-sm">
                  {spec.stats.topSpeedKmh} km/h
                </div>
              </div>
              <div>
                <div className="text-slate-400 text-[11px]">0–100 km/h</div>
                <div className="font-mono-num font-bold text-white text-xs sm:text-sm">
                  {spec.stats.zeroToHundredSec} s
                </div>
              </div>
              <div>
                <div className="text-slate-400 text-[11px]">Power</div>
                <div className="font-mono-num font-bold text-white text-xs sm:text-sm">
                  {spec.stats.horsepower} HP
                </div>
              </div>
              <div>
                <div className="text-slate-400 text-[11px]">Handling</div>
                <div className="font-mono-num font-bold text-cyan-400 text-xs sm:text-sm">
                  {spec.stats.handling}/100
                </div>
              </div>
              <div>
                <div className="text-slate-400 text-[11px]">Braking</div>
                <div className="font-mono-num font-bold text-cyan-400 text-xs sm:text-sm">
                  {spec.stats.braking}/100
                </div>
              </div>
              <div>
                <div className="text-slate-400 text-[11px]">Weight</div>
                <div className="font-mono-num font-bold text-white text-xs sm:text-sm">
                  {spec.stats.weightKg} kg
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Supercar Catalog List (scrolls inline on mobile, independent pane on desktop) */}
        <div className="lg:col-span-5 lg:min-h-0 lg:overflow-y-auto p-3.5 sm:p-4 space-y-2.5 border-t lg:border-t-0 lg:border-l border-white/10 bg-[#0d111a] pl-[max(0.875rem,env(safe-area-inset-left))] pr-[max(0.875rem,env(safe-area-inset-right))] lg:pl-4 lg:pr-4 dk-scroll">
          <div className="lg:hidden text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Select a Supercar ({CAR_ORDER.length})
          </div>
          {CAR_ORDER.map((id) => {
            const cSpec = CAR_SPECS[id];
            const cState = save.cars[id];
            const isSelected = save.selectedCarId === id;
            const isPreview = previewId === id;
            return (
              <button
                type="button"
                key={id}
                onClick={() => handleSelectPreview(id)}
                className={`w-full text-left p-3.5 rounded-xl border transition-colors cursor-pointer touch-manipulation ${
                  isPreview
                    ? 'bg-amber-500/15 border-amber-400'
                    : 'bg-slate-900/80 border-white/10 hover:border-white/25'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-[11px] text-slate-400">
                      {cSpec.brand} {cSpec.isUnlockableHypercar ? '· Hypercar Prototype' : ''}
                    </div>
                    <div className="font-display font-bold text-base text-white">
                      {cSpec.name}
                    </div>
                  </div>
                  <div className="text-right font-mono-num text-xs shrink-0">
                    {isSelected ? (
                      <span className="text-emerald-400 font-bold">EQUIPPED</span>
                    ) : cState.owned ? (
                      <span className="text-cyan-400 font-semibold">OWNED</span>
                    ) : (
                      <span className="text-amber-400 font-bold">
                        {cSpec.price.toLocaleString()} pts
                      </span>
                    )}
                  </div>
                </div>
                <p className="mt-1 text-[11px] text-slate-400 leading-snug">
                  {cSpec.tagline}
                </p>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-slate-300 font-mono-num">
                  <span>{cSpec.stats.topSpeedKmh} km/h</span>
                  <span className="text-slate-600">·</span>
                  <span>0–100: {cSpec.stats.zeroToHundredSec}s</span>
                  <span className="text-slate-600">·</span>
                  <span>{cSpec.stats.horsepower} HP</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Sticky Bottom Action Bar (always visible with safe-area padding) */}
      <div className="shrink-0 sticky bottom-0 z-20 border-t border-white/15 bg-[#0b0e16] pt-2 pb-[max(0.625rem,env(safe-area-inset-bottom))] max-lg:landscape:pt-1.5 max-lg:landscape:pb-[max(0.375rem,env(safe-area-inset-bottom))] pl-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))] lg:px-6 lg:py-3">
        {feedback && (
          <div
            role="status"
            aria-live="polite"
            className={`mb-2 max-lg:landscape:mb-1.5 px-3 py-1.5 rounded-lg border flex items-center gap-2 text-xs font-medium ${
              feedback.type === 'success'
                ? 'bg-emerald-950/70 border-emerald-500/40 text-emerald-200'
                : 'bg-red-950/70 border-red-500/40 text-red-200'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-1.5 lg:gap-4">
          {/* Selected Car Summary in Sticky Bar */}
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="font-semibold text-white">
              {spec.brand} {spec.name}
            </span>
            <span className="font-mono-num text-amber-400 font-bold shrink-0">
              {isOwned ? (isEquipped ? 'Active Ride' : 'In Garage') : `${spec.price.toLocaleString()} pts`}
            </span>
          </div>

          {/* Primary Action Button(s) — minimum 56px height */}
          {isOwned ? (
            <button
              type="button"
              onClick={handleEquipClick}
              disabled={isEquipped}
              className={`w-full lg:w-auto lg:min-w-[260px] min-h-[56px] px-5 py-3 rounded-xl font-display font-bold text-sm sm:text-base inline-flex items-center justify-center gap-2 touch-manipulation select-none transition-colors ${
                isEquipped
                  ? 'bg-emerald-500 text-slate-950 cursor-default'
                  : 'bg-amber-500 hover:bg-amber-400 active:bg-amber-300 text-slate-950 cursor-pointer'
              }`}
            >
              <Check className="w-5 h-5 shrink-0" />
              <span>{isEquipped ? 'EQUIPPED' : 'EQUIP'}</span>
            </button>
          ) : levelLocked ? (
            <button
              type="button"
              disabled
              className="w-full lg:w-auto lg:min-w-[260px] min-h-[56px] px-4 py-3 rounded-xl bg-slate-800 text-slate-400 border border-white/10 font-display font-bold text-xs sm:text-sm inline-flex items-center justify-center gap-2 cursor-not-allowed select-none"
            >
              <Lock className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Reach Level {spec.unlockLevelReq} to Unlock</span>
            </button>
          ) : canAfford ? (
            <button
              type="button"
              onClick={handleBuyClick}
              className="w-full lg:w-auto lg:min-w-[260px] min-h-[56px] px-5 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-300 text-slate-950 font-display font-bold text-sm sm:text-base font-mono-num inline-flex items-center justify-center gap-2 cursor-pointer touch-manipulation select-none transition-colors"
            >
              <ShoppingBag className="w-5 h-5 shrink-0" />
              <span>BUY - {spec.price.toLocaleString()} pts</span>
            </button>
          ) : (
            <div className="grid grid-cols-2 lg:flex lg:items-center gap-2 w-full lg:w-auto">
              <button
                type="button"
                disabled
                className="min-h-[56px] px-2.5 sm:px-4 py-2 rounded-xl bg-slate-800 text-slate-400 border border-white/10 font-display font-bold text-xs sm:text-sm font-mono-num leading-tight text-center inline-flex items-center justify-center cursor-not-allowed select-none"
              >
                <span>Need {pointsNeeded.toLocaleString()} more pts</span>
              </button>

              <button
                type="button"
                disabled={adBusy}
                onClick={handleWatchAdForPoints}
                className="min-h-[56px] px-2.5 sm:px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-300 text-slate-950 font-display font-bold text-xs sm:text-sm leading-tight text-center inline-flex items-center justify-center gap-1.5 cursor-pointer touch-manipulation select-none transition-colors disabled:opacity-60"
              >
                <Tv className="w-4 h-4 shrink-0" />
                <span>{adBusy ? 'Loading ad...' : 'Watch ad to earn points'}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
