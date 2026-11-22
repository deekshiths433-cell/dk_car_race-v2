export interface RacingTip {
  title: string;
  body: string;
}

export const RACING_TIPS: RacingTip[] = [
  {
    title: 'Brake Before the Corner',
    body: 'Brake smoothly in a straight line before entering a tight turn, then accelerate cleanly past the apex.',
  },
  {
    title: 'Slipstream Drafting',
    body: 'Tuck closely behind a rival car on straights to catch its aero slipstream and gain a +9% speed surge for clean overtakes.',
  },
  {
    title: 'Upgrade Advantage',
    body: 'Rivals only receive 50% of the speed benefit from your engine and turbo upgrades—every Garage upgrade builds a real edge.',
  },
  {
    title: 'Smart Nitro Timing',
    body: 'Save your Nitro burst for long exit straights rather than corners. Light drifting recharges your Nitro canister faster.',
  },
  {
    title: 'Keep Your Machine Mint',
    body: 'Wall hits and rival collisions cut your top speed and tire grip. Visit the Repair Shop between races or restore free via pit crew.',
  },
  {
    title: 'Match Your Tire Compound',
    body: 'Unlock Track Semi-Slick or P-Zero Slick tires in the Garage to hold speed through wet city streets and mountain switchbacks.',
  },
  {
    title: 'Watch Traffic & Cones from Level 3',
    body: 'Higher championships narrow the racing line and place chicane hazards on the track—stay focused when passing rivals.',
  },
];

export function pickRacingTip(seedOrIndex?: number): RacingTip {
  const idx =
    typeof seedOrIndex === 'number' && Number.isFinite(seedOrIndex)
      ? Math.abs(Math.floor(seedOrIndex)) % RACING_TIPS.length
      : Math.floor(Math.random() * RACING_TIPS.length);
  return RACING_TIPS[idx];
}
