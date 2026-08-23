/**
 * @file use-music — 音乐 widget 逻辑层：环境音 + 上传音乐播放（互斥抢占经共享 audioBus）。
 * - 上传音乐库复用 index.ts 级 useIdbMedia（IndexedDB 持久化）
 * - 与番茄钟共用 audioBus：后播放者抢占前音
 */
'use client';

import { useCallback, useState } from 'react';
import { audioBus, isAmbient } from '../../lib/audio-bus';
import { useIdbMedia } from '../../hooks/use-idb-media';
import type { SoundSource } from '../../types';

export function useMusic() {
  const { items: musicItems, upload, remove, getObjectUrl } = useIdbMedia();
  const [current, setCurrent] = useState<SoundSource | null>(null);

  /** 按 source 播放（环境音 / 音乐 / 静音），后调用者抢占 */
  const play = useCallback(
    async (source: SoundSource) => {
      audioBus.ensureCtx();
      setCurrent(source);
      if (source === 'silence') {
        audioBus.stop();
        return;
      }
      if (isAmbient(source)) {
        audioBus.play(source);
        return;
      }
      if (source.startsWith('upload:')) {
        const rec = await getObjectUrl(source.slice(7));
        if (rec) audioBus.playUrl(rec.url);
      }
    },
    [getObjectUrl],
  );

  const playUploaded = useCallback(
    (id: string) => {
      void play(`upload:${id}` as SoundSource);
    },
    [play],
  );

  const playAmbient = useCallback(
    (kind: string | null) => {
      void play((kind ?? 'silence') as SoundSource);
    },
    [play],
  );

  const uploadFile = useCallback(
    async (file: File | null) => {
      if (!file) return;
      const id = await upload(file);
      await playUploaded(id);
    },
    [upload, playUploaded],
  );

  const removeItem = useCallback(
    async (id: string) => {
      await remove(id);
      if (current === `upload:${id}`) {
        audioBus.stop();
        setCurrent('silence');
      }
    },
    [remove, current],
  );

  const stop = useCallback(() => {
    audioBus.stop();
    setCurrent('silence');
  }, []);

  return {
    current,
    musicItems,
    playUploaded,
    playAmbient,
    uploadFile,
    removeItem,
    stop,
  };
}