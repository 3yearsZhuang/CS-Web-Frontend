/**
 * @file 音乐播放器 widget — 环境音 + 已上传音乐（目录即模块：use-music + music-panel）。
 * - 经共享 audioBus 与番茄钟互斥抢占（后播放者抢占前音）
 * - 环境音选择 / 上传音乐管理（播放/删除/上传）
 */
'use client';

import { useTranslations } from 'next-intl';
import { Music2, Square } from 'lucide-react';
import { WorkbenchCard } from '../../workbench-card';
import { AMBIENT_KINDS } from '../../lib/audio-bus';
import { MusicPanel } from './music-panel';
import { useMusic } from './use-music';

export function MusicPlayer() {
  const t = useTranslations('workbench');
  const music = useMusic();

  const currentLabel = (() => {
    const s = music.current;
    if (!s || s === 'silence') return t('silence');
    if (s.startsWith('upload:')) return t('myMusic');
    const hit = AMBIENT_KINDS.find((k) => k.value === s);
    return hit ? t(hit.labelKey as Parameters<typeof t>[0]) : s;
  })();

  return (
    <WorkbenchCard
      corner="MUS"
      title={
        <>
          <Music2 className="w-3.5 h-3.5" />
          {t('music')}
        </>
      }
      actions={
        <button
          type="button"
          aria-label="stop sound"
          title={t('silence')}
          className="p-2 rounded hover:bg-[var(--border)] text-[var(--muted-foreground)]"
          onClick={music.stop}
        >
          <Square className="w-4 h-4" />
        </button>
      }
    >
      <div className="flex-1 min-h-0 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2 text-[12px] text-[var(--muted-foreground)]">
          <span className="truncate">{t('playing')}: {currentLabel}</span>
          <span className="meta-mono text-[10px] uppercase tracking-wider shrink-0">
            {music.current ? 'ON' : '—'}
          </span>
        </div>

        {/* 环境音选择 */}
        <div className="flex flex-wrap gap-1.5">
          {AMBIENT_KINDS.map((k) => {
            const active = music.current === k.value;
            return (
              <button
                key={k.value}
                type="button"
                onClick={() => music.playAmbient(k.value)}
                className={`px-2.5 py-1 rounded-md border text-[12px] transition-colors ${
                  active
                    ? 'bg-[var(--primary)] text-white border-[var(--primary)]'
                    : 'hover:bg-[var(--border)]/40 border-[var(--border)] text-[var(--muted-foreground)]'
                }`}
              >
                {t(k.labelKey as Parameters<typeof t>[0])}
              </button>
            );
          })}
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto">
          <MusicPanel
            musicItems={music.musicItems}
            currentSound={music.current}
            onPlay={music.playUploaded}
            onUpload={(file) => void music.uploadFile(file)}
            onRemove={(id) => void music.removeItem(id)}
          />
        </div>
      </div>
    </WorkbenchCard>
  );
}