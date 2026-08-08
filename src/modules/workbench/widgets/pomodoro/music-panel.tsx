/**
 * @file 音乐面板：IndexedDB 已上传音乐列表 + 播放/删除/上传入口。
 */
'use client';

import { useTranslations } from 'next-intl';
import { CheckCircle2, Play, Trash2, Upload } from 'lucide-react';
import { useRef } from 'react';

interface Props {
  musicItems: { id: string; name: string }[];
  currentSound: string | null;
  onPlay: (id: string) => void;
  onUpload: (file: File | null) => void;
  onRemove: (id: string) => void;
}

export function MusicPanel({ musicItems, currentSound, onPlay, onUpload, onRemove }: Props) {
  const t = useTranslations('workbench');
  const fileRef = useRef<HTMLInputElement | null>(null);

  return (
    <div className="flex flex-col gap-1.5">
      {musicItems.length === 0 && (
        <p className="text-[12px] text-[var(--muted-foreground)]">{t('uploadMusic')}…</p>
      )}
      {musicItems.map((m) => (
        <div key={m.id} className="flex items-center justify-between gap-2 text-[13px]">
          <button
            type="button"
            className="flex items-center gap-2 min-w-0 flex-1 text-left hover:text-[var(--foreground)]"
            onClick={() => onPlay(m.id)}
          >
            <Play className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate text-[var(--muted-foreground)]">{m.name}</span>
            {currentSound === `upload:${m.id}` && (
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-500" />
            )}
          </button>
          <button
            type="button"
            aria-label="delete"
            className="p-1.5 rounded hover:bg-[var(--border)]"
            onClick={() => onRemove(m.id)}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
      <label className="flex items-center gap-1.5 text-[12px] text-[var(--muted-foreground)] cursor-pointer hover:text-[var(--foreground)]">
        <Upload className="w-3.5 h-3.5" />
        {t('uploadMusic')}
        <input
          ref={fileRef}
          type="file"
          accept="audio/*"
          className="hidden"
          onChange={(e) => {
            onUpload(e.target.files?.[0] ?? null);
            if (fileRef.current) fileRef.current.value = '';
          }}
        />
      </label>
    </div>
  );
}
