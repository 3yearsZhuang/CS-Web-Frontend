/**
 * @file WebAudio 环境音引擎 — 零依赖合成白噪音/雨声/海浪/篝火 + 番茄钟提示音。
 * 全部通过 AudioContext 实时合成，无外部音频文件，离线可用。
 */
'use client';

export type AmbientKind = 'rain' | 'waves' | 'fire' | 'white';

interface ActiveSource {
  stop: () => void;
}

function makeNoiseBuffer(ctx: AudioContext, seconds = 2): AudioBuffer {
  const buffer = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  return buffer;
}

class AmbientEngine {
  private ctx: AudioContext | null = null;
  private active: ActiveSource | null = null;

  /** 必须由用户手势触发后调用（浏览器自动播放策略） */
  ensureCtx(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    if (!this.ctx) this.ctx = new Ctor();
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return this.ctx;
  }

  stop(): void {
    this.active?.stop();
    this.active = null;
  }

  /** 播放环境音；kind 为 null/undefined 视为静音 */
  play(kind: AmbientKind | null | undefined): void {
    this.stop();
    if (!kind) return;
    const ctx = this.ensureCtx();
    if (!ctx) return;
    try {
      switch (kind) {
        case 'white':
          this.active = this.buildWhite(ctx);
          break;
        case 'rain':
          this.active = this.buildRain(ctx);
          break;
        case 'waves':
          this.active = this.buildWaves(ctx);
          break;
        case 'fire':
          this.active = this.buildFire(ctx);
          break;
      }
    } catch {
      this.stop();
    }
  }

  /** 阶段切换提示音（短促双音） */
  beep(): void {
    const ctx = this.ensureCtx();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      [880, 660].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.0001, now + i * 0.18);
        gain.gain.exponentialRampToValueAtTime(0.2, now + i * 0.18 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.18 + 0.16);
        osc.connect(gain).connect(ctx.destination);
        osc.start(now + i * 0.18);
        osc.stop(now + i * 0.18 + 0.2);
      });
    } catch {
      // 忽略
    }
  }

  private buildWhite(ctx: AudioContext): ActiveSource {
    const src = ctx.createBufferSource();
    src.buffer = makeNoiseBuffer(ctx);
    src.loop = true;
    const gain = ctx.createGain();
    gain.gain.value = 0.05;
    src.connect(gain).connect(ctx.destination);
    src.start();
    return { stop: () => src.stop() };
  }

  /** 雨声：带通噪声 + 随机增益尖峰（模拟雨滴密度） */
  private buildRain(ctx: AudioContext): ActiveSource {
    const src = ctx.createBufferSource();
    src.buffer = makeNoiseBuffer(ctx);
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1400;
    filter.Q.value = 0.4;
    const gain = ctx.createGain();
    gain.gain.value = 0.1;
    src.connect(filter).connect(gain).connect(ctx.destination);
    src.start();
    const jitter = setInterval(() => {
      gain.gain.setTargetAtTime(0.06 + Math.random() * 0.07, ctx.currentTime, 0.05);
    }, 120);
    return { stop: () => { src.stop(); clearInterval(jitter); } };
  }

  /** 海浪：低通噪声 + 0.12Hz 低频振荡调制增益（潮汐起伏） */
  private buildWaves(ctx: AudioContext): ActiveSource {
    const src = ctx.createBufferSource();
    src.buffer = makeNoiseBuffer(ctx);
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 420;
    const gain = ctx.createGain();
    gain.gain.value = 0.08;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.12;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.05;
    lfo.connect(lfoGain).connect(gain.gain);
    src.connect(filter).connect(gain).connect(ctx.destination);
    src.start();
    lfo.start();
    return { stop: () => { src.stop(); lfo.stop(); } };
  }

  /** 篝火：棕噪声（低频主体）+ 随机爆裂尖峰 */
  private buildFire(ctx: AudioContext): ActiveSource {
    const src = ctx.createBufferSource();
    src.buffer = makeNoiseBuffer(ctx);
    src.loop = true;
    // 棕噪声近似：低通强衰减
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 180;
    const gain = ctx.createGain();
    gain.gain.value = 0.16;
    const crackle = ctx.createBiquadFilter();
    crackle.type = 'highpass';
    crackle.frequency.value = 900;
    const crackleGain = ctx.createGain();
    crackleGain.gain.value = 0;
    src.connect(filter).connect(gain).connect(ctx.destination);
    src.connect(crackle).connect(crackleGain).connect(ctx.destination);
    src.start();
    const pop = setInterval(() => {
      const spike = Math.random() > 0.7 ? 0.08 + Math.random() * 0.14 : 0;
      crackleGain.gain.setTargetAtTime(spike, ctx.currentTime, 0.02);
    }, 90);
    return { stop: () => { src.stop(); clearInterval(pop); } };
  }
}

/** 全局单例（一个页面只允许一个 AudioContext） */
export const ambientEngine = new AmbientEngine();
