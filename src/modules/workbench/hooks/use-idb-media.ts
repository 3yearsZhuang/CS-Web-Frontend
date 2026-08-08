/**
 * @file IndexedDB 媒体库 — 存用户上传的音乐（ArrayBuffer），供播放器使用
 */
'use client';

import { useCallback, useEffect, useState } from 'react';
import type { MediaItem } from '../types';

const DB_NAME = 'wb-media';
const STORE = 'audio';
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

async function tx<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const req = fn(t.objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export interface MediaRecord extends MediaItem {
  data: ArrayBuffer;
}

async function listRecords(): Promise<MediaRecord[]> {
  try {
    const records = await tx<MediaRecord[]>('readonly', (s) => s.getAll() as IDBRequest<MediaRecord[]>);
    return (records ?? []).sort((a, b) => b.uploadedAt - a.uploadedAt);
  } catch {
    return [];
  }
}

export function useIdbMedia() {
  const [items, setItems] = useState<MediaItem[]>([]);

  const refresh = useCallback(async () => {
    const records = await listRecords();
    setItems(records.map(({ data: _data, ...meta }) => meta));
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const upload = useCallback(
    async (file: File) => {
      const buffer = await file.arrayBuffer();
      const record: MediaRecord = {
        id: `m_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        name: file.name,
        size: file.size,
        uploadedAt: Date.now(),
        data: buffer,
      };
      await tx('readwrite', (s) => s.put(record));
      await refresh();
      return record.id;
    },
    [refresh],
  );

  const remove = useCallback(
    async (id: string) => {
      await tx('readwrite', (s) => s.delete(id));
      await refresh();
    },
    [refresh],
  );

  /** 取音频 Blob URL（播放时再建，用完由调用方 revoke） */
  const getObjectUrl = useCallback(async (id: string): Promise<{ url: string; name: string } | null> => {
    const records = await listRecords();
    const rec = records.find((r) => r.id === id);
    if (!rec) return null;
    const blob = new Blob([rec.data], { type: 'audio/*' });
    return { url: URL.createObjectURL(blob), name: rec.name };
  }, []);

  return { items, upload, remove, getObjectUrl, refresh };
}
