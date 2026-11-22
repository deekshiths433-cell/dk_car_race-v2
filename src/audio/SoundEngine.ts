import { EngineType, GameSettings } from '../types/game';

interface EngineHarmonicProfile {
  baseFreq: number;
  maxFreq: number;
  harmonics: number[];
  waveType: OscillatorType;
  subType: OscillatorType;
  turboWhine: number;
  growlCutoff: number;
}

const ENGINE_PROFILES: Record<EngineType, EngineHarmonicProfile> = {
  inline6: {
    baseFreq: 52,
    maxFreq: 210,
    harmonics: [1, 1.5, 2, 3],
    waveType: 'sawtooth',
    subType: 'triangle',
    turboWhine: 0.45,
    growlCutoff: 950,
  },
  flat6: {
    baseFreq: 58,
    maxFreq: 245,
    harmonics: [1, 1.33, 2, 2.66],
    waveType: 'sawtooth',
    subType: 'square',
    turboWhine: 0.12,
    growlCutoff: 1350,
  },
  v8: {
    baseFreq: 48,
    maxFreq: 225,
    harmonics: [1, 1.5, 2.02, 3.01],
    waveType: 'sawtooth',
    subType: 'sawtooth',
    turboWhine: 0.52,
    growlCutoff: 1150,
  },
  v10: {
    baseFreq: 60,
    maxFreq: 278,
    harmonics: [1, 1.5, 2, 2.5, 3.33],
    waveType: 'sawtooth',
    subType: 'triangle',
    turboWhine: 0.14,
    growlCutoff: 1580,
  },
  v12: {
    baseFreq: 66,
    maxFreq: 290,
    harmonics: [1, 1.5, 2, 3, 4],
    waveType: 'sawtooth',
    subType: 'triangle',
    turboWhine: 0.18,
    growlCutoff: 1650,
  },
  twin_turbo: {
    baseFreq: 50,
    maxFreq: 235,
    harmonics: [1, 1.5, 2, 3],
    waveType: 'sawtooth',
    subType: 'sawtooth',
    turboWhine: 0.78,
    growlCutoff: 1250,
  },
  w16: {
    baseFreq: 40,
    maxFreq: 185,
    harmonics: [1, 1.25, 1.5, 2, 2.5],
    waveType: 'sawtooth',
    subType: 'sine',
    turboWhine: 0.85,
    growlCutoff: 900,
  },
  hybrid_v12: {
    baseFreq: 64,
    maxFreq: 310,
    harmonics: [1, 1.5, 2, 3.5],
    waveType: 'sawtooth',
    subType: 'sine',
    turboWhine: 0.95,
    growlCutoff: 1850,
  },
  electric: {
    baseFreq: 120,
    maxFreq: 680,
    harmonics: [1, 2, 3, 4],
    waveType: 'sine',
    subType: 'triangle',
    turboWhine: 1.0,
    growlCutoff: 2400,
  },
};

/**
 * 100% Procedural Web Audio API racing sound synthesizer.
 * Zero external audio files required.
 */
export class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private engineGain: GainNode | null = null;
  private effectsGain: GainNode | null = null;
  private musicGain: GainNode | null = null;

  private engineOscs: OscillatorNode[] = [];
  private engineFilter: BiquadFilterNode | null = null;
  private turboOsc: OscillatorNode | null = null;
  private turboGain: GainNode | null = null;

  private tireGain: GainNode | null = null;
  private tireFilter: BiquadFilterNode | null = null;
  private windGain: GainNode | null = null;
  private windFilter: BiquadFilterNode | null = null;

  private hornOsc1: OscillatorNode | null = null;
  private hornOsc2: OscillatorNode | null = null;
  private hornGain: GainNode | null = null;

  private musicTimer: number | null = null;
  private musicStep = 0;

  private currentEngineType: EngineType = 'inline6';
  private initialized = false;
  private racingActive = false;
  private lastGear = 1;
  private lastThrottle = 0;

  private settings: GameSettings;

  constructor(settings: GameSettings) {
    this.settings = settings;
  }

  public updateSettings(settings: GameSettings): void {
    this.settings = settings;
    if (!this.ctx || !this.masterGain || !this.engineGain || !this.effectsGain || !this.musicGain) {
      return;
    }
    const now = this.ctx.currentTime;
    const muteMult = settings.muted ? 0 : 1;
    this.masterGain.gain.setTargetAtTime(muteMult, now, 0.04);
    this.engineGain.gain.setTargetAtTime(settings.engineVolume * (this.racingActive ? 0.36 : 0), now, 0.06);
    this.effectsGain.gain.setTargetAtTime(settings.effectsVolume * 0.6, now, 0.05);
    this.musicGain.gain.setTargetAtTime(settings.musicVolume * 0.28, now, 0.08);
  }

  public ensureStarted(): void {
    if (typeof window === 'undefined') return;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    if (!this.initialized && this.ctx) {
      this.setupGraph();
      this.initialized = true;
    }
    this.updateSettings(this.settings);
  }

  private createNoiseBuffer(seconds = 2): AudioBuffer {
    const ctx = this.ctx!;
    const length = Math.floor(ctx.sampleRate * seconds);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  private setupGraph(): void {
    const ctx = this.ctx!;
    this.masterGain = ctx.createGain();
    this.masterGain.connect(ctx.destination);

    this.engineGain = ctx.createGain();
    this.engineGain.gain.value = 0;
    this.engineGain.connect(this.masterGain);

    this.effectsGain = ctx.createGain();
    this.effectsGain.gain.value = 0.5;
    this.effectsGain.connect(this.masterGain);

    this.musicGain = ctx.createGain();
    this.musicGain.gain.value = 0.12;
    this.musicGain.connect(this.masterGain);

    // Engine filter + oscillators
    this.engineFilter = ctx.createBiquadFilter();
    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.value = 800;
    this.engineFilter.Q.value = 2.4;
    this.engineFilter.connect(this.engineGain);

    const profile = ENGINE_PROFILES[this.currentEngineType];
    profile.harmonics.forEach((mult, idx) => {
      const osc = ctx.createOscillator();
      osc.type = idx === 0 ? profile.subType : profile.waveType;
      osc.frequency.value = profile.baseFreq * mult;
      const g = ctx.createGain();
      g.gain.value = idx === 0 ? 0.5 : 0.26 / (idx + 0.4);
      osc.connect(g);
      g.connect(this.engineFilter!);
      osc.start();
      this.engineOscs.push(osc);
    });

    // Turbo whistle oscillator
    this.turboOsc = ctx.createOscillator();
    this.turboOsc.type = 'sine';
    this.turboOsc.frequency.value = 1800;
    this.turboGain = ctx.createGain();
    this.turboGain.gain.value = 0;
    this.turboOsc.connect(this.turboGain);
    this.turboGain.connect(this.engineGain);
    this.turboOsc.start();

    // Tire screech noise loop
    const noiseBuffer = this.createNoiseBuffer(2);
    const tireSrc = ctx.createBufferSource();
    tireSrc.buffer = noiseBuffer;
    tireSrc.loop = true;
    this.tireFilter = ctx.createBiquadFilter();
    this.tireFilter.type = 'bandpass';
    this.tireFilter.frequency.value = 1450;
    this.tireFilter.Q.value = 6.5;
    this.tireGain = ctx.createGain();
    this.tireGain.gain.value = 0;
    tireSrc.connect(this.tireFilter);
    this.tireFilter.connect(this.tireGain);
    this.tireGain.connect(this.effectsGain);
    tireSrc.start();

    // Wind noise loop
    const windSrc = ctx.createBufferSource();
    windSrc.buffer = noiseBuffer;
    windSrc.loop = true;
    this.windFilter = ctx.createBiquadFilter();
    this.windFilter.type = 'lowpass';
    this.windFilter.frequency.value = 420;
    this.windGain = ctx.createGain();
    this.windGain.gain.value = 0;
    windSrc.connect(this.windFilter);
    this.windFilter.connect(this.windGain);
    this.windGain.connect(this.effectsGain);
    windSrc.start();

    // Dual-tone supercar horn
    this.hornGain = ctx.createGain();
    this.hornGain.gain.value = 0;
    this.hornGain.connect(this.effectsGain);

    this.hornOsc1 = ctx.createOscillator();
    this.hornOsc1.type = 'sawtooth';
    this.hornOsc1.frequency.value = 415;
    this.hornOsc2 = ctx.createOscillator();
    this.hornOsc2.type = 'sawtooth';
    this.hornOsc2.frequency.value = 523;
    const hornFilter = ctx.createBiquadFilter();
    hornFilter.type = 'lowpass';
    hornFilter.frequency.value = 1800;
    this.hornOsc1.connect(hornFilter);
    this.hornOsc2.connect(hornFilter);
    hornFilter.connect(this.hornGain);
    this.hornOsc1.start();
    this.hornOsc2.start();
  }

  public setEngineType(type: EngineType): void {
    this.currentEngineType = type;
    if (!this.ctx || this.engineOscs.length === 0) return;
    const profile = ENGINE_PROFILES[type];
    this.engineOscs.forEach((osc, idx) => {
      osc.type = idx === 0 ? profile.subType : profile.waveType;
    });
  }

  public startRaceAudio(engineType: EngineType): void {
    this.ensureStarted();
    this.setEngineType(engineType);
    this.racingActive = true;
    this.updateSettings(this.settings);
    this.startMusicLoop();
  }

  public stopRaceAudio(): void {
    this.racingActive = false;
    this.setHorn(false);
    if (this.ctx && this.engineGain && this.tireGain && this.windGain) {
      const now = this.ctx.currentTime;
      this.engineGain.gain.setTargetAtTime(0, now, 0.08);
      this.tireGain.gain.setTargetAtTime(0, now, 0.05);
      this.windGain.gain.setTargetAtTime(0, now, 0.05);
    }
    this.stopMusicLoop();
  }

  public updateTelemetry(params: {
    rpm: number;
    idleRpm: number;
    redlineRpm: number;
    gear: number;
    throttle: number;
    speedKmh: number;
    slipRatio: number;
    nitroActive: boolean;
  }): void {
    if (!this.ctx || !this.initialized || !this.racingActive) return;
    const now = this.ctx.currentTime;
    const profile = ENGINE_PROFILES[this.currentEngineType];
    const rpmNorm = Math.max(
      0,
      Math.min(1.08, (params.rpm - params.idleRpm) / Math.max(1000, params.redlineRpm - params.idleRpm))
    );

    const isElectric = this.currentEngineType === 'electric';
    const fundamental = isElectric
      ? profile.baseFreq + (profile.maxFreq - profile.baseFreq) * Math.min(1, params.speedKmh / 330)
      : profile.baseFreq + (profile.maxFreq - profile.baseFreq) * Math.pow(rpmNorm, 0.92);

    this.engineOscs.forEach((osc, idx) => {
      const mult = profile.harmonics[idx] ?? (idx + 1);
      osc.frequency.setTargetAtTime(fundamental * mult, now, 0.025);
    });

    if (this.engineFilter) {
      const loadBoost = params.throttle * (isElectric ? 1100 : 750) + (params.nitroActive ? 500 : 0);
      this.engineFilter.frequency.setTargetAtTime(
        (isElectric ? 620 : 320) + rpmNorm * profile.growlCutoff + loadBoost,
        now,
        0.04
      );
    }

    if (this.engineGain) {
      const speedOrLoad = isElectric
        ? Math.min(1, params.speedKmh / 240) * 0.14 + 0.14 * params.throttle + 0.05
        : 0.18 + 0.22 * rpmNorm + 0.1 * params.throttle;
      const baseVol = this.settings.engineVolume * speedOrLoad;
      this.engineGain.gain.setTargetAtTime(baseVol, now, 0.03);
    }

    if (this.turboOsc && this.turboGain) {
      const spool = isElectric
        ? (0.2 + 0.8 * Math.min(1, params.speedKmh / 280)) * (0.35 + 0.65 * params.throttle)
        : Math.max(0, rpmNorm - 0.35) * profile.turboWhine * (0.4 + 0.6 * params.throttle);
      const whineHz = isElectric
        ? 1100 + Math.min(1, params.speedKmh / 340) * 4400 + (params.nitroActive ? 800 : 0)
        : 1600 + rpmNorm * 3200 + (params.nitroActive ? 900 : 0);
      this.turboOsc.frequency.setTargetAtTime(whineHz, now, 0.05);
      this.turboGain.gain.setTargetAtTime(spool * (isElectric ? 0.12 : 0.09), now, 0.05);
    }

    // Gear shift sound & exhaust pop on throttle lift (skip combustion pops for pure electric EV)
    if (params.gear !== this.lastGear && params.gear > 0) {
      if (!isElectric) {
        this.playGearShift();
        if (params.gear < this.lastGear) {
          this.playExhaustPop();
        }
      }
      this.lastGear = params.gear;
    }
    if (!isElectric && this.lastThrottle > 0.7 && params.throttle < 0.1 && rpmNorm > 0.55) {
      this.playExhaustPop();
    }
    this.lastThrottle = params.throttle;

    // Tire screech
    if (this.tireGain && this.tireFilter) {
      const screech = Math.min(1, Math.max(0, params.slipRatio));
      this.tireGain.gain.setTargetAtTime(screech * 0.28, now, 0.03);
      this.tireFilter.frequency.setTargetAtTime(1200 + screech * 650, now, 0.04);
    }

    // Wind noise
    if (this.windGain && this.windFilter) {
      const windNorm = Math.min(1, Math.max(0, (params.speedKmh - 50) / 350));
      this.windGain.gain.setTargetAtTime(windNorm * windNorm * 0.26, now, 0.06);
      this.windFilter.frequency.setTargetAtTime(300 + windNorm * 1400, now, 0.06);
    }
  }

  public setHorn(active: boolean): void {
    if (!this.ctx || !this.hornGain) return;
    const now = this.ctx.currentTime;
    this.hornGain.gain.setTargetAtTime(active ? 0.32 : 0, now, 0.02);
  }

  public playGearShift(): void {
    if (!this.ctx || !this.effectsGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(135, now);
    osc.frequency.exponentialRampToValueAtTime(48, now + 0.07);
    gain.gain.setValueAtTime(0.28, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc.connect(gain);
    gain.connect(this.effectsGain);
    osc.start(now);
    osc.stop(now + 0.085);
  }

  public playExhaustPop(): void {
    if (!this.ctx || !this.effectsGain) return;
    const now = this.ctx.currentTime;
    const buffer = this.createNoiseBuffer(0.12);
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 520;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.effectsGain);
    src.start(now);
  }

  public playCollision(intensity = 0.7): void {
    if (!this.ctx || !this.effectsGain) return;
    const now = this.ctx.currentTime;
    const clampInt = Math.min(1, Math.max(0.2, intensity));

    // Crunch noise
    const src = this.ctx.createBufferSource();
    src.buffer = this.createNoiseBuffer(0.28);
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(750, now);
    filter.frequency.exponentialRampToValueAtTime(160, now + 0.25);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.55 * clampInt, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.26);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.effectsGain);
    src.start(now);

    // Metallic thud
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(110, now);
    osc.frequency.exponentialRampToValueAtTime(34, now + 0.18);
    const thudGain = this.ctx.createGain();
    thudGain.gain.setValueAtTime(0.45 * clampInt, now);
    thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.19);
    osc.connect(thudGain);
    thudGain.connect(this.effectsGain);
    osc.start(now);
    osc.stop(now + 0.2);
  }

  public playIndicatorClick(on = true): void {
    if (!this.ctx || !this.effectsGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(on ? 980 : 760, now);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.025);
    osc.connect(gain);
    gain.connect(this.effectsGain);
    osc.start(now);
    osc.stop(now + 0.03);
  }

  public playCountdownBeep(go = false): void {
    this.ensureStarted();
    if (!this.ctx || !this.effectsGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(go ? 880 : 440, now);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.32, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + (go ? 0.42 : 0.18));
    osc.connect(gain);
    gain.connect(this.effectsGain);
    osc.start(now);
    osc.stop(now + (go ? 0.44 : 0.2));
  }

  public playCheckpointChime(): void {
    if (!this.ctx || !this.effectsGain) return;
    const now = this.ctx.currentTime;
    [660, 880].forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.05);
      const gain = this.ctx!.createGain();
      gain.gain.setValueAtTime(0.16, now + idx * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.2);
      osc.connect(gain);
      gain.connect(this.effectsGain!);
      osc.start(now + idx * 0.05);
      osc.stop(now + idx * 0.05 + 0.22);
    });
  }

  private startMusicLoop(): void {
    this.stopMusicLoop();
    const bassNotes = [55, 55, 65.41, 73.42, 55, 55, 82.41, 73.42];
    const leadNotes = [220, 261.63, 329.63, 293.66, 220, 329.63, 392, 329.63];

    this.musicTimer = window.setInterval(() => {
      if (!this.ctx || !this.musicGain || !this.racingActive) return;
      if (this.settings.muted || this.settings.musicVolume <= 0.01) return;
      const now = this.ctx.currentTime;
      const step = this.musicStep % 8;

      // Driving synth bass pulse
      const bass = this.ctx.createOscillator();
      bass.type = 'sawtooth';
      bass.frequency.setValueAtTime(bassNotes[step], now);
      const bFilter = this.ctx.createBiquadFilter();
      bFilter.type = 'lowpass';
      bFilter.frequency.setValueAtTime(340, now);
      const bGain = this.ctx.createGain();
      bGain.gain.setValueAtTime(0.22, now);
      bGain.gain.exponentialRampToValueAtTime(0.01, now + 0.16);
      bass.connect(bFilter);
      bFilter.connect(bGain);
      bGain.connect(this.musicGain);
      bass.start(now);
      bass.stop(now + 0.17);

      // Lead arpeggio on alternating beats
      if (step % 2 === 0) {
        const lead = this.ctx.createOscillator();
        lead.type = 'triangle';
        lead.frequency.setValueAtTime(leadNotes[step], now);
        const lGain = this.ctx.createGain();
        lGain.gain.setValueAtTime(0.11, now);
        lGain.gain.exponentialRampToValueAtTime(0.005, now + 0.24);
        lead.connect(lGain);
        lGain.connect(this.musicGain);
        lead.start(now);
        lead.stop(now + 0.25);
      }

      this.musicStep++;
    }, 185);
  }

  private stopMusicLoop(): void {
    if (this.musicTimer !== null) {
      window.clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }

  public dispose(): void {
    this.stopRaceAudio();
    if (this.ctx) {
      this.ctx.close().catch(() => {});
      this.ctx = null;
    }
  }
}
