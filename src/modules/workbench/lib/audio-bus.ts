/**
 * @file 共享音频总线 — 工作台全局唯一「出声设备」。
 * - 统一持有 WebAudio 环境音引擎（ambientEngine）+ 共享 <audio> 元素（上传音乐）
 * - 互斥抢占：任何新播放（环境音/音乐）先停掉上一声源，后调用者天然抢占（§ 番茄钟×音乐冲突策略）
 * - 同时导出音源选项 AMBIENT_KINDS / 判定工具 isAmbient，供番茄钟与音乐 widget 共用
 */
'use client';

import type { SoundSource } from '../types';
import { ambientEngine, type AmbientKind } from './ambient-audio';

/** 是否为内置合成环境音（环境音 vs 静音 vs 上传音乐） */
export function isAmbient(s: string): s is AmbientKind {
  return s === 'rain' || s === 'waves' || s === 'fire' || s === 'white';
}

/** 音源选择项（环境音/静音），番茄钟阶段音与音乐 widget 环境音选择共用 */
export const AMBIENT_KINDS: { value: SoundSource; labelKey: string; kind?: AmbientKind }[] = [
  { value: 'rain', labelKey: 'soundRain', kind: 'rain' },
  { value: 'waves', labelKey: 'soundWaves', kind: 'waves' },
  { value: 'fire', labelKey: 'soundFire', kind: 'fire' },
  { value: 'white', labelKey: 'soundWhite', kind: 'white' },
  { value: 'silence', labelKey: 'silence' },
];

class AudioBus {
  private musicEl: HTMLAudioElement | null = null;
  private musicUrl: string | null = null;

  private ensureEl(): HTMLAudioElement | null {
    if (typeof document === 'undefined') return null;
    if (!this.musicEl) {
      const el = document.createElement('audio');
      el.loop = true;
      el.volume = 0.7;
      el.style.display = 'none';
      document.body.appendChild(el);
      this.musicEl = el;
    }
    return this.musicEl;
  }

  /** 停止一切声音（环境音 + 音乐），互斥总闸 */
  private halt(): void {
    ambientEngine.stop();
    if (this.musicEl) this.musicEl.pause();
    if (this.musicUrl) {
      URL.revokeObjectURL(this.musicUrl);
      this.musicUrl = null;
    }
  }

  /** 打开/恢复 AudioContext（必须由用户手势触发，浏览器自动播放策略） */
  ensureCtx(): void {
    ambientEngine.ensureCtx();
  }

  /** 阶段切换提示音（短促双音，不参与互斥抢占） */
  beep(): void {
    ambientEngine.beep();
  }

  /** 播放合成环境音；kind 为 null/undefined → 静音。后调用者抢占前音 */
  play(kind: AmbientKind | null | undefined): void {
    this.halt();
    ambientEngine.play(kind);
  }

  /** 播放用户上传音乐 URL（最后调用者抢占环境音等） */
  playUrl(url: string): void {
    this.halt();
    const el = this.ensureEl();
    if (!el) return;
    this.musicUrl = url;
    el.src = url;
    void el.play().catch(() => {});
  }

  /** 停止出声（切到静音） */
  stop(): void {
    this.halt();
  }
}

/** 全局单例（一个页面只允许一个 AudioContext / 一个出声源） */
export const audioBus = new AudioBus();