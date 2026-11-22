import React, { useState } from 'react';
import { Download, Share, Smartphone, WifiOff, X } from 'lucide-react';
import { useOnlineStatus, usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  // Hide once launched as an installed fullscreen/standalone PWA
  if (isInstalled) {
    return null;
  }

  const handleClick = async () => {
    if (isInstallable) {
      const accepted = await install();
      if (!accepted) return;
      return;
    }
    setShowGuide(true);
  };

  const inIframe =
    typeof window !== 'undefined' && window.self !== window.top;

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[40px] rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-400/40 text-cyan-300 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer touch-manipulation"
      >
        <Download className="w-4 h-4 shrink-0" />
        <span>Install App</span>
      </button>

      {showGuide && (
        <div className="fixed inset-0 z-50 h-dvh w-full bg-black/80 dk-scroll flex flex-col p-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))]">
          <div className="w-full max-w-md my-auto mx-auto bg-[#0f1420] border border-white/15 rounded-2xl p-5 sm:p-6 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0">
                  <Smartphone className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h3 className="font-display text-lg font-bold text-white leading-tight">
                    Install DK Car Race
                  </h3>
                  <p className="text-xs text-slate-400">
                    Fullscreen landscape · Plays offline after first load
                  </p>
                </div>
              </div>
              <button
                type="button"
                aria-label="Close install guide"
                onClick={() => setShowGuide(false)}
                className="w-10 h-10 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-200 cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {isIOS ? (
              <div className="space-y-2.5 text-xs sm:text-sm text-slate-300 bg-slate-900/90 border border-white/10 rounded-xl p-4 leading-relaxed">
                <div className="flex items-center gap-2 font-semibold text-white">
                  <Share className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>Install on iPhone / iPad (Safari)</span>
                </div>
                <p>
                  1. Tap the <strong className="text-white">Share</strong> icon in Safari&apos;s toolbar.
                </p>
                <p>
                  2. Scroll down and tap{' '}
                  <strong className="text-white">Add to Home Screen</strong>.
                </p>
                <p>
                  3. Tap <strong className="text-white">Add</strong> to launch DK Race fullscreen.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5 text-xs sm:text-sm text-slate-300 bg-slate-900/90 border border-white/10 rounded-xl p-4 leading-relaxed">
                <p className="font-semibold text-white">
                  Add DK Car Race to your device
                </p>
                <p>
                  • On <strong className="text-white">Android Chrome</strong>: tap the{' '}
                  <strong className="text-white">⋮ menu</strong> and select{' '}
                  <strong className="text-white">Install app</strong> or{' '}
                  <strong className="text-white">Add to Home screen</strong>.
                </p>
                <p>
                  • On <strong className="text-white">Desktop Chrome / Edge</strong>: click the{' '}
                  <strong className="text-white">Install icon</strong> in the browser address bar.
                </p>
                {inIframe && (
                  <p className="text-amber-300 text-xs pt-1">
                    Note: If viewing inside an embedded preview frame, open the app URL directly in its own browser tab to trigger one-tap install.
                  </p>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowGuide(false)}
              className="w-full py-3 min-h-[44px] rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-display font-bold text-sm cursor-pointer touch-manipulation"
            >
              Got It
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();
  if (isOnline) return null;

  return (
    <div className="fixed bottom-3 left-3 z-50 pointer-events-none flex items-center gap-2 rounded-lg bg-[#0b0e16]/95 border border-amber-500/40 px-3 py-1.5 text-xs font-semibold text-amber-300 shadow-lg">
      <WifiOff className="w-3.5 h-3.5 shrink-0" />
      <span>Offline Mode — Cached Ready</span>
    </div>
  );
};
