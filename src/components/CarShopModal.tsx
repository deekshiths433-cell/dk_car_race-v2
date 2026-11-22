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
  showAdOption?: boolean;
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
      setFeedback({
        type: 'success',
        message: 'You already own this car. Tap Equip / Select to drive it.',
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
        showAdOption: true,
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
            type: 'error',
            message: `+${AD_REWARD_POINTS.toLocaleString()} pts added! Not enough points. You need ${remainingNeeded.toLocaleString()} more.`,
            showAdOption: true,
          });
        } else {
          setFeedback({
            type: 'success',
            message: `+${AD_REWARD_POINTS.toLocaleString()} pts earned! You now have enough points to buy ${spec.name}.`,
          });
        }
      } else {
        console.warn('[DK Car Race][CarShop] Rewarded ad was cancelled before completion.');
        if (spec && !ownedState.owned && save.points < spec.price) {
          const needed = spec.price - save.points;
          setFeedback({
            type: 'error',
            message: `Ad cancelled. Not enough points. You need ${needed.toLocaleString()} more.`,
            showAdOption: true,
          });
        }
      }
    } catch (err) {
      console.error('[DK Car Race][CarShop] Rewarded ad failed to run:', err);
      setFeedback({
        type: 'error',
        message: 'Could not load rewarded ad. Please try again.',
        showAdOption: true,
      });
    } finally {
      setAdBusy(false);
    }
  };

  const canAfford = save.points >= spec.price;

  return (
    <div className="fixed inset-0 z-40 bg-[#090b10] flex flex-col">
      <div className="flex items-center justify-between px-4 md:px-6 py-3 border-b border-white/10 bg-[#0b0e16]">
        <div>
          <h2 className="font-display text-lg md:text-xl font-bold text-white">
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
          className="w-11 h-11 rounded-lg bg-slate-800 hover:bg-slate-700 active:bg-slate-600 flex items-center justify-center text-white cursor-pointer touch-manipulation"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12">
        {/* Left: 3D Showcase + Spec Sheet */}
        <div className="lg:col-span-7 flex flex-col min-h-0 bg-[#090b10]">
          <div className="flex-1 min-h-[190px] relative">
            <ShowroomCanvas
              carId={previewId}
              customization={ownedState.customization}
            />
          </div>

          <div className="p-4 md:p-5 border-t border-white/10 bg-[#0b0e16]">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-3">
              <div>
                <div className="text-xs text-amber-400 font-semibold uppercase tracking-wider">
                  {spec.brand} · {spec.engineLabel}
                </div>
                <h3 className="font-display text-2xl font-bold text-white">{spec.name}</h3>
                <p className="text-xs text-slate-400">{spec.tagline}</p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                {ownedState.owned ? (
                  <button
                    type="button"
                    onClick={handleEquipClick}
                    className={`px-5 py-3 min-h-[44px] rounded-lg font-display font-bold text-sm inline-flex items-center gap-2 cursor-pointer touch-manipulation select-none whitespace-nowrap transition-colors ${
                      save.selectedCarId === previewId
                        ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                        : 'bg-amber-500 hover:bg-amber-400 active:bg-amber-300 text-slate-950'
                    }`}
                  >
                    <Check className="w-4 h-4 shrink-0" />
                    <span>
                      {save.selectedCarId === previewId ? 'EQUIPPED' : 'EQUIP / SELECT'}
                    </span>
                  </button>
                ) : levelLocked ? (
                  <button
                    type="button"
                    onClick={handleBuyClick}
                    className="px-4 py-3 min-h-[44px] rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold inline-flex items-center gap-2 cursor-pointer touch-manipulation select-none whitespace-nowrap"
                  >
                    <Lock className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Reach Level {spec.unlockLevelReq} to Unlock</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleBuyClick}
                    className={`px-5 py-3 min-h-[44px] rounded-lg font-display font-bold text-sm font-mono-num inline-flex items-center gap-2 cursor-pointer touch-manipulation select-none whitespace-nowrap transition-colors ${
                      canAfford
                        ? 'bg-amber-500 hover:bg-amber-400 active:bg-amber-300 text-slate-950'
                        : 'bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-amber-300 border border-amber-500/40'
                    }`}
                  >
                    <ShoppingBag className="w-4 h-4 shrink-0" />
                    <span>BUY CAR · {spec.price.toLocaleString()} PTS</span>
                  </button>
                )}
              </div>
            </div>

            {feedback && (
              <div
                role="status"
                aria-live="polite"
                className={`mb-3 px-3.5 py-2.5 rounded-lg border flex flex-wrap items-center justify-between gap-3 text-xs ${
                  feedback.type === 'success'
                    ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-200'
                    : 'bg-red-950/60 border-red-500/40 text-red-200'
                }`}
              >
                <div className="flex items-center gap-2 font-medium">
                  {feedback.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                  )}
                  <span>{feedback.message}</span>
                </div>

                {feedback.showAdOption && (
                  <button
                    type="button"
                    disabled={adBusy}
                    onClick={handleWatchAdForPoints}
                    className="px-3.5 py-2 min-h-[40px] rounded-lg bg-amber-500 hover:bg-amber-400 active:bg-amber-300 text-slate-950 font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer touch-manipulation select-none whitespace-nowrap disabled:opacity-60"
                  >
                    <Tv className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      {adBusy
                        ? 'Loading ad...'
                        : `Watch ad to earn +${AD_REWARD_POINTS} pts`}
                    </span>
                  </button>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs pt-3 border-t border-white/10">
              <div>
                <div className="text-slate-400">Top Speed</div>
                <div className="font-mono-num font-bold text-white text-sm">
                  {spec.stats.topSpeedKmh} km/h
                </div>
              </div>
              <div>
                <div className="text-slate-400">0–100 km/h</div>
                <div className="font-mono-num font-bold text-white text-sm">
                  {spec.stats.zeroToHundredSec} s
                </div>
              </div>
              <div>
                <div className="text-slate-400">Power</div>
                <div className="font-mono-num font-bold text-white text-sm">
                  {spec.stats.horsepower} HP
                </div>
              </div>
              <div>
                <div className="text-slate-400">Handling</div>
                <div className="font-mono-num font-bold text-cyan-400 text-sm">
                  {spec.stats.handling}/100
                </div>
              </div>
              <div>
                <div className="text-slate-400">Weight</div>
                <div className="font-mono-num font-bold text-white text-sm">
                  {spec.stats.weightKg} kg
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Car Catalog List */}
        <div className="lg:col-span-5 overflow-y-auto p-4 space-y-2.5 border-t lg:border-t-0 lg:border-l border-white/10 bg-[#0d111a] dk-scroll">
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
                  <div>
                    <div className="text-[11px] text-slate-400">
                      {cSpec.brand} {cSpec.isUnlockableHypercar ? '· Hypercar Prototype' : ''}
                    </div>
                    <div className="font-display font-bold text-base text-white">
                      {cSpec.name}
                    </div>
                  </div>
                  <div className="text-right font-mono-num text-xs">
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
                <div className="mt-2 flex items-center gap-3 text-[11px] text-slate-400 font-mono-num">
                  <span>{cSpec.stats.topSpeedKmh} km/h</span>
                  <span>·</span>
                  <span>0–100: {cSpec.stats.zeroToHundredSec}s</span>
                  <span>·</span>
                  <span>{cSpec.stats.horsepower} HP</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
