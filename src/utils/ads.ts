/**
 * Placeholder Rewarded Ad Provider.
 * Replace `triggerRewardedAd` internals with AdMob, Unity Ads, CrazyGames SDK,
 * or web rewarded video SDK when deploying to mobile stores or ad networks.
 */
export interface RewardedAdRequest {
  title: string;
  rewardLabel: string;
  durationSec?: number;
}

export interface RewardedAdResult {
  completed: boolean;
  provider: string;
}

type AdModalListener = (
  req: RewardedAdRequest,
  resolve: (result: RewardedAdResult) => void
) => void;

let activeListener: AdModalListener | null = null;

export function registerRewardedAdHandler(listener: AdModalListener | null): void {
  activeListener = listener;
}

export function showRewardedAd(req: RewardedAdRequest): Promise<RewardedAdResult> {
  return new Promise((resolve) => {
    if (activeListener) {
      activeListener(req, resolve);
    } else {
      // Fallback instant resolve if no modal mounted
      setTimeout(() => resolve({ completed: true, provider: 'placeholder_sdk' }), 800);
    }
  });
}
