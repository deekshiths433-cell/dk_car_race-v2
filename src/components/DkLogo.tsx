import React from 'react';

interface DkLogoProps {
  size?: 'sm' | 'md' | 'lg';
}

export const DkLogo: React.FC<DkLogoProps> = ({ size = 'md' }) => {
  const dims =
    size === 'lg' ? 'h-14' : size === 'sm' ? 'h-8' : 'h-10';
  return (
    <div className={`inline-flex items-center gap-3 select-none ${dims}`}>
      <svg
        viewBox="0 0 64 48"
        className="h-full w-auto shrink-0"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="dkWing" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#ef4444" />
          </linearGradient>
        </defs>
        <polygon points="4,40 16,8 46,8 38,20 22,20 17,32 35,32 29,40" fill="url(#dkWing)" />
        <polygon points="36,40 44,8 58,8 47,23 59,40 48,40 41,28 36,40" fill="#f8fafc" />
        <rect x="6" y="43" width="52" height="2.5" fill="#06b6d4" />
      </svg>
      <div className="flex flex-col leading-none">
        <span
          className={`font-display font-bold tracking-wider text-white ${
            size === 'lg' ? 'text-3xl md:text-4xl' : size === 'sm' ? 'text-lg' : 'text-2xl'
          }`}
        >
          DK CAR RACE
        </span>
        {size !== 'sm' && (
          <span className="text-[11px] font-medium tracking-[0.22em] text-amber-400 uppercase mt-1">
            Apex Telemetry Series
          </span>
        )}
      </div>
    </div>
  );
};
