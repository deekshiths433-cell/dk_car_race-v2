import { useCallback, useEffect, useRef, useState } from 'react';
import { SoundEngine } from './audio/SoundEngine';
import { AboutModal } from './components/AboutModal';
import { CarShopModal } from './components/CarShopModal';
import { DailyRewardsModal } from './components/DailyRewardsModal';
import { GarageModal } from './components/GarageModal';
import { ActiveModal, HomePage } from './components/HomePage';
import { HowToPlayModal } from './components/HowToPlayModal';
import { LevelSelectModal } from './components/LevelSelectModal';
import { PauseModal } from './components/PauseModal';
import { OfflineIndicator } from './components/PWAInstallButton';
import { RaceHUD } from './components/RaceHUD';
import { RepairShopModal } from './components/RepairShopModal';
import { ResultsModal } from './components/ResultsModal';
import { RewardedAdModal } from './components/RewardedAdModal';
import { SettingsModal } from './components/SettingsModal';
import { CAR_SPECS } from './data/cars';
import { getLevelConfig } from './data/levels';
import { ExternalControlInput, RaceEngine } from './engine/RaceEngine';
import { ShowroomCanvas } from './engine/ShowroomCanvas';
import { isRunningAsInstalledPWA } from './hooks/usePWAInstall';
import {
  CarCustomization,
  CarId,
  CarUpgrades,
  GameSettings,
  RaceResult,
  RaceTelemetry,
  SaveState,
} from './types/game';
import { registerRewardedAdHandler, RewardedAdRequest, RewardedAdResult } from './utils/ads';
import {
  isMobileDevice,
  loadSaveState,
  persistSaveState,
} from './utils/storage';

export default function App() {
  const [save, setSave] = useState<SaveState>(() => loadSaveState());
  const [screen, setScreen] = useState<'home' | 'race'>('home');
  const [activeModal, setActiveModal] = useState<ActiveModal>(() =>
    loadSaveState().hasSeenTutorial ? 'none' : 'howto'
  );
  const [settingsTab, setSettingsTab] = useState<'general' | 'audio' | 'controls'>('general');

  const [isMobile, setIsMobile] = useState(() => isMobileDevice());
  const [raceRunSalt, setRaceRunSalt] = useState(0);
  const [paused, setPaused] = useState(false);
  const [raceResult, setRaceResult] = useState<RaceResult | null>(null);
  const [telemetry, setTelemetry] = useState<RaceTelemetry | null>(null);

  const [pendingAd, setPendingAd] = useState<{
    req: RewardedAdRequest;
    resolve: (res: RewardedAdResult) => void;
  } | null>(null);

  const raceMountRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<RaceEngine | null>(null);
  const soundRef = useRef<SoundEngine | null>(null);
  const saveRef = useRef<SaveState>(save);
  saveRef.current = save;

  if (!soundRef.current) {
    soundRef.current = new SoundEngine(save.settings);
  }

  // Persist save state whenever it changes
  useEffect(() => {
    persistSaveState(save);
    soundRef.current?.updateSettings(save.settings);
    engineRef.current?.setSettings(save.settings);
  }, [save]);

  // Register Rewarded Ad UI bridge
  useEffect(() => {
    registerRewardedAdHandler((req, resolve) => {
      setPendingAd({ req, resolve });
    });
    return () => registerRewardedAdHandler(null);
  }, []);

  // Responsive device check
  useEffect(() => {
    const onResize = () => setIsMobile(isMobileDevice());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Lock page scrolling strictly while actively racing; menus remain scrollable
  useEffect(() => {
    document.documentElement.classList.toggle('dk-in-race', screen === 'race');
    return () => {
      document.documentElement.classList.remove('dk-in-race');
    };
  }, [screen]);

  // Keep game fullscreen and landscape when launched from home screen as installed PWA
  useEffect(() => {
    if (!isRunningAsInstalledPWA()) return;
    const lockLandscapeFullscreen = () => {
      try {
        const orient = screenOrientation();
        orient?.lock?.('landscape').catch(() => {});
        const el = document.documentElement;
        if (isMobile && !document.fullscreenElement && el.requestFullscreen) {
          el.requestFullscreen().catch(() => {});
        }
      } catch {
        // Ignore browser permission restrictions
      }
    };
    lockLandscapeFullscreen();
    window.addEventListener('pointerdown', lockLandscapeFullscreen, { once: true });
    return () => {
      window.removeEventListener('pointerdown', lockLandscapeFullscreen);
    };
  }, [isMobile]);

  const updateSave = useCallback((updater: (prev: SaveState) => SaveState) => {
    setSave((prev) => updater(prev));
  }, []);

  const requestLandscapeFullscreen = () => {
    if (!isMobile) return;
    try {
      const el = document.documentElement;
      if (!document.fullscreenElement && el.requestFullscreen) {
        el.requestFullscreen().catch(() => {});
      }
      const orient = screenOrientation();
      if (orient && orient.lock) {
        orient.lock('landscape').catch(() => {});
      }
    } catch {
      // Orientation/fullscreen permissions vary by browser
    }
  };

  function screenOrientation(): { lock?: (o: string) => Promise<void> } | null {
    return (window.screen as unknown as { orientation?: { lock?: (o: string) => Promise<void> } })
      ?.orientation ?? null;
  }

  const startRace = (levelNumber = save.currentLevel) => {
    soundRef.current?.ensureStarted();
    requestLandscapeFullscreen();
    setRaceResult(null);
    setPaused(false);
    setActiveModal('none');
    updateSave((prev) => ({ ...prev, currentLevel: levelNumber }));
    setRaceRunSalt((s) => s + 1);
    setScreen('race');
  };

  // Mount & lifecycle of Three.js RaceEngine
  useEffect(() => {
    if (screen !== 'race' || !raceMountRef.current) return;

    const level = getLevelConfig(save.currentLevel, raceRunSalt);
    const ownedCarState = save.cars[save.selectedCarId];

    const engine = new RaceEngine({
      container: raceMountRef.current,
      level,
      carId: save.selectedCarId,
      ownedCarState,
      settings: save.settings,
      sound: soundRef.current!,
      onTelemetry: (t) => setTelemetry(t),
      onPauseRequested: () => {
        setPaused((p) => {
          const next = !p;
          engine.setPaused(next);
          return next;
        });
      },
      onFinish: (res) => {
        // Apply rewards, damage, missions, achievements, and leaderboard record
        updateSave((prev) => {
          const prevBest = prev.bestTimesByLevel[res.level.levelNumber];
          const isNewBest = !prevBest || res.finishTimeSec < prevBest;
          res.isNewBestTime = isNewBest;

          const nextHighest = res.unlockedNextLevel
            ? Math.max(prev.highestUnlockedLevel, res.level.levelNumber + 1)
            : prev.highestUnlockedLevel;

          // Update car damage
          const updatedCars = {
            ...prev.cars,
            [res.carId]: {
              ...prev.cars[res.carId],
              damage: res.newDamage,
            },
          };

          // Update daily missions
          const updatedMissions = prev.missions.map((m) => {
            if (m.type === 'races') return { ...m, progress: m.progress + 1 };
            if (m.type === 'wins' && res.position === 1) return { ...m, progress: m.progress + 1 };
            if (m.type === 'drift_meters') return { ...m, progress: m.progress + Math.round(res.driftBonus / 0.8) };
            if (m.type === 'nitro_uses') return { ...m, progress: m.progress + Math.round(res.nitroBonus / 30) };
            return m;
          });

          // Unlock achievements
          let bonusAchPts = 0;
          const updatedAch = prev.achievements.map((a) => {
            if (a.unlocked) return a;
            let unlock = false;
            if (a.id === 'ach_first_win' && res.position === 1) unlock = true;
            if (a.id === 'ach_clean_driver' && (res.newDamage.body + res.newDamage.engine + res.newDamage.tires) / 3 < 5)
              unlock = true;
            if (a.id === 'ach_night_rain' && res.level.biome === 'night_neon') unlock = true;
            if (a.id === 'ach_300_club' && CAR_SPECS[res.carId].stats.topSpeedKmh >= 300)
              unlock = true;
            if (a.id === 'ach_400_club' && CAR_SPECS[res.carId].stats.topSpeedKmh >= 400)
              unlock = true;
            if (unlock) bonusAchPts += a.reward;
            return unlock ? { ...a, unlocked: true } : a;
          });

          const spec = CAR_SPECS[res.carId];
          const newLbEntry = {
            id: `run_${Date.now()}`,
            driverName: 'You',
            carName: `${spec.brand} ${spec.name}`,
            levelNumber: res.level.levelNumber,
            biome: res.level.biome,
            bestTimeSec: res.finishTimeSec,
            points: res.totalPointsEarned,
            dateISO: new Date().toISOString().slice(0, 10),
          };
          const updatedLb = [...prev.leaderboard, newLbEntry]
            .sort((a, b) => a.bestTimeSec - b.bestTimeSec)
            .slice(0, 15);

          return {
            ...prev,
            points: prev.points + res.totalPointsEarned + bonusAchPts,
            totalRaces: prev.totalRaces + 1,
            totalWins: prev.totalWins + (res.position === 1 ? 1 : 0),
            highestUnlockedLevel: nextHighest,
            cars: updatedCars,
            bestTimesByLevel: {
              ...prev.bestTimesByLevel,
              [res.level.levelNumber]: isNewBest ? res.finishTimeSec : prevBest,
            },
            missions: updatedMissions,
            achievements: updatedAch,
            leaderboard: updatedLb,
          };
        });
        setRaceResult(res);
      },
    });

    engineRef.current = engine;
    return () => {
      engine.dispose();
      engineRef.current = null;
    };
    // Intentionally recreate only when starting a new race run
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, raceRunSalt]);

  const handleTouchInput = useCallback((patch: Partial<ExternalControlInput>) => {
    engineRef.current?.setTouchInput(patch);
  }, []);

  const handleUpdateSettings = useCallback(
    (patch: Partial<GameSettings>) => {
      updateSave((prev) => ({
        ...prev,
        settings: { ...prev.settings, ...patch },
      }));
    },
    [updateSave]
  );

  const selectedCarState = save.cars[save.selectedCarId];

  return (
    <div
      className={
        screen === 'race'
          ? 'fixed inset-0 w-full h-dvh overflow-hidden bg-[#090b10]'
          : 'relative w-full min-h-dvh bg-[#090b10]'
      }
    >
      {/* HOME SCREEN & LIVE 3D SHOWROOM */}
      {screen === 'home' && (
        <>
          <div className="fixed inset-0 z-0 pointer-events-none">
            {activeModal !== 'garage' && activeModal !== 'shop' && activeModal !== 'repair' && (
              <ShowroomCanvas
                carId={save.selectedCarId}
                customization={selectedCarState.customization}
                damageBodyPct={selectedCarState.damage.body}
                cameraShiftX={-0.95}
              />
            )}
          </div>
          <HomePage
            save={save}
            isDesktop={!isMobile}
            onStartRace={() => startRace(save.currentLevel)}
            onOpenModal={(m) => {
              soundRef.current?.ensureStarted();
              setSettingsTab('general');
              setActiveModal(m);
            }}
          />
        </>
      )}

      {/* ACTIVE RACE VIEWPORT */}
      {screen === 'race' && (
        <>
          <div ref={raceMountRef} className="relative z-0 w-full h-full" />
          {!raceResult && (
            <RaceHUD
              telemetry={telemetry}
              settings={save.settings}
              isMobile={isMobile}
              onTouchInput={handleTouchInput}
              onCycleCamera={() => engineRef.current?.cycleCamera()}
              onToggleLights={() => engineRef.current?.toggleHeadlights()}
              onToggleLeftIndicator={() => engineRef.current?.toggleLeftIndicator()}
              onToggleRightIndicator={() => engineRef.current?.toggleRightIndicator()}
              onToggleHazard={() => engineRef.current?.toggleHazardLights()}
              onResetCar={() => engineRef.current?.resetPlayerToTrack()}
              onPause={() => {
                setPaused(true);
                engineRef.current?.setPaused(true);
              }}
              onCalibrateTilt={(offsetDeg) =>
                handleUpdateSettings({ tiltCalibrationOffset: offsetDeg })
              }
            />
          )}

          {paused && !raceResult && (
            <PauseModal
              controlMode={save.settings.controlMode}
              onChangeControlMode={(mode) => handleUpdateSettings({ controlMode: mode })}
              onResume={() => {
                setPaused(false);
                engineRef.current?.setPaused(false);
              }}
              onRestart={() => startRace(save.currentLevel)}
              onOpenSettings={() => {
                setSettingsTab('controls');
                setActiveModal('settings');
              }}
              onQuitHome={() => {
                setPaused(false);
                setScreen('home');
              }}
            />
          )}

          {raceResult && (
            <ResultsModal
              result={raceResult}
              onNextLevel={() =>
                startRace(
                  raceResult.unlockedNextLevel
                    ? raceResult.level.levelNumber + 1
                    : raceResult.level.levelNumber
                )
              }
              onRetry={() => startRace(raceResult.level.levelNumber)}
              onOpenGarage={() => {
                setScreen('home');
                setActiveModal('garage');
              }}
              onHome={() => setScreen('home')}
            />
          )}
        </>
      )}

      {/* MODALS */}
      {activeModal === 'garage' && (
        <GarageModal
          save={save}
          onUpdateCustomization={(carId, patch, cost = 0, unlockKey) => {
            updateSave((prev) => {
              if (prev.points < cost) return prev;
              const cur = prev.cars[carId];
              const nextUnlocked =
                unlockKey && !cur.customization.unlockedItems.includes(unlockKey)
                  ? [...cur.customization.unlockedItems, unlockKey]
                  : cur.customization.unlockedItems;
              return {
                ...prev,
                points: prev.points - cost,
                cars: {
                  ...prev.cars,
                  [carId]: {
                    ...cur,
                    customization: {
                      ...cur.customization,
                      ...patch,
                      unlockedItems: nextUnlocked,
                    },
                  },
                },
              };
            });
          }}
          onUpgradePart={(carId: CarId, part: keyof CarUpgrades, cost: number) => {
            updateSave((prev) => {
              if (prev.points < cost) return prev;
              const cur = prev.cars[carId];
              if (cur.upgrades[part] >= 5) return prev;
              return {
                ...prev,
                points: prev.points - cost,
                cars: {
                  ...prev.cars,
                  [carId]: {
                    ...cur,
                    upgrades: {
                      ...cur.upgrades,
                      [part]: cur.upgrades[part] + 1,
                    },
                  },
                },
              };
            });
          }}
          onClose={() => setActiveModal('none')}
        />
      )}

      {activeModal === 'shop' && (
        <CarShopModal
          save={save}
          onSelectCar={(carId) => {
            const current = saveRef.current;
            if (!current.cars[carId]?.owned) {
              console.error('[DK Car Race][CarShop] Cannot equip unowned car:', { carId });
              return;
            }
            const nextState: SaveState = {
              ...current,
              selectedCarId: carId,
            };
            const persisted = persistSaveState(nextState);
            if (!persisted) {
              console.error('[DK Car Race][CarShop] Failed to save equipped car to localStorage:', {
                carId,
              });
            }
            saveRef.current = nextState;
            setSave(nextState);
          }}
          onAddPoints={(amount) => {
            if (!Number.isFinite(amount) || amount <= 0) {
              console.error('[DK Car Race][CarShop] Invalid points reward amount:', { amount });
              return;
            }
            const current = saveRef.current;
            const nextState: SaveState = {
              ...current,
              points: current.points + Math.round(amount),
            };
            const persisted = persistSaveState(nextState);
            if (!persisted) {
              console.error('[DK Car Race][CarShop] Failed to persist earned ad points to localStorage.');
            }
            saveRef.current = nextState;
            setSave(nextState);
          }}
          onBuyCar={(carId) => {
            const current = saveRef.current;
            const spec = CAR_SPECS[carId];
            if (!spec) {
              console.error('[DK Car Race][CarShop] Purchase error: Unknown carId.', { carId });
              return { ok: false, error: 'Car specification not found.' };
            }
            const targetCar = current.cars[carId];
            if (!targetCar) {
              console.error('[DK Car Race][CarShop] Purchase error: Car entry missing in save state.', {
                carId,
              });
              return { ok: false, error: 'Car save record is missing.' };
            }
            if (targetCar.owned) {
              console.error('[DK Car Race][CarShop] Purchase error: Car already owned.', { carId });
              return { ok: false, error: 'You already own this car.' };
            }
            if (spec.unlockLevelReq && current.highestUnlockedLevel < spec.unlockLevelReq) {
              console.error('[DK Car Race][CarShop] Purchase error: Level locked.', {
                carId,
                requiredLevel: spec.unlockLevelReq,
                highestUnlockedLevel: current.highestUnlockedLevel,
              });
              return {
                ok: false,
                error: `Reach Level ${spec.unlockLevelReq} to unlock ${spec.name}.`,
              };
            }
            if (current.points < spec.price) {
              const needed = spec.price - current.points;
              console.error('[DK Car Race][CarShop] Purchase error: Insufficient points.', {
                carId,
                price: spec.price,
                balance: current.points,
                needed,
              });
              return {
                ok: false,
                error: `Not enough points. You need ${needed.toLocaleString()} more.`,
              };
            }

            const ownedCount = Object.values(current.cars).filter((c) => c.owned).length + 1;
            let achBonus = 0;
            const updatedAch = current.achievements.map((a) => {
              if (!a.unlocked && a.id === 'ach_collector' && ownedCount >= 3) {
                achBonus += a.reward;
                return { ...a, unlocked: true };
              }
              return a;
            });

            const nextState: SaveState = {
              ...current,
              points: current.points - spec.price + achBonus,
              cars: {
                ...current.cars,
                [carId]: { ...targetCar, owned: true },
              },
              achievements: updatedAch,
            };

            const persisted = persistSaveState(nextState);
            if (!persisted) {
              console.error('[DK Car Race][CarShop] Failed to save purchased car to localStorage.', {
                carId,
              });
              return {
                ok: false,
                error: 'Could not save purchase to local storage. Please free browser storage and retry.',
              };
            }

            saveRef.current = nextState;
            setSave(nextState);
            return { ok: true };
          }}
          onClose={() => setActiveModal('none')}
        />
      )}

      {activeModal === 'repair' && (
        <RepairShopModal
          save={save}
          onRepairCar={(carId, cost) => {
            updateSave((prev) => {
              if (prev.points < cost) return prev;
              return {
                ...prev,
                points: prev.points - cost,
                cars: {
                  ...prev.cars,
                  [carId]: {
                    ...prev.cars[carId],
                    damage: { body: 0, engine: 0, tires: 0 },
                  },
                },
              };
            });
          }}
          onClose={() => setActiveModal('none')}
        />
      )}

      {activeModal === 'levels' && (
        <LevelSelectModal
          save={save}
          onSelectAndPlay={(lvl) => startRace(lvl)}
          onClose={() => setActiveModal('none')}
        />
      )}

      {activeModal === 'rewards' && (
        <DailyRewardsModal
          save={save}
          onClaimDaily={() => {
            const now = new Date();
            const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
              2,
              '0'
            )}-${String(now.getDate()).padStart(2, '0')}`;
            updateSave((prev) => {
              if (prev.lastDailyClaimDate === todayStr) return prev;
              const dayNum = (prev.dailyStreak % 7) + 1;
              const reward = 250 + dayNum * 150;
              return {
                ...prev,
                points: prev.points + reward,
                dailyStreak: prev.dailyStreak + 1,
                lastDailyClaimDate: todayStr,
              };
            });
          }}
          onClaimMission={(missionId) => {
            updateSave((prev) => {
              const target = prev.missions.find((m) => m.id === missionId);
              if (!target || target.claimed || target.progress < target.target) return prev;
              return {
                ...prev,
                points: prev.points + target.reward,
                missions: prev.missions.map((m) =>
                  m.id === missionId ? { ...m, claimed: true } : m
                ),
              };
            });
          }}
          onClose={() => setActiveModal('none')}
        />
      )}

      {activeModal === 'howto' && (
        <HowToPlayModal
          isFirstTime={!save.hasSeenTutorial}
          isMobile={isMobile}
          onClose={() => {
            if (!save.hasSeenTutorial) {
              updateSave((prev) => ({ ...prev, hasSeenTutorial: true }));
            }
            setActiveModal('none');
          }}
        />
      )}

      {activeModal === 'about' && <AboutModal onClose={() => setActiveModal('none')} />}

      {activeModal === 'settings' && (
        <SettingsModal
          settings={save.settings}
          initialTab={settingsTab}
          onChange={handleUpdateSettings}
          onClose={() => setActiveModal('none')}
        />
      )}

      {pendingAd && (
        <RewardedAdModal
          request={pendingAd.req}
          onComplete={(completed) => {
            pendingAd.resolve({ completed, provider: 'placeholder_sdk' });
            setPendingAd(null);
          }}
        />
      )}

      <OfflineIndicator />
    </div>
  );
}
