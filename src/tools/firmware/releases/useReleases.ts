import { useCallback, useEffect, useState } from 'react';
import type { Release, ReleaseIndex } from './releases.types';

const FEED_URL =
  'https://raw.githubusercontent.com/unwndevices/unwn_fw/main/releases.json';
const CACHE_TTL_MS = 5 * 60 * 1000;
const STORAGE_KEY = 'drop-firmware-releases-cache';

interface CacheEntry {
  fetchedAt: number;
  data: ReleaseIndex;
}

let memoryCache: CacheEntry | null = null;

function readLocalStorage(): CacheEntry | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CacheEntry;
  } catch {
    return null;
  }
}

function writeLocalStorage(entry: CacheEntry): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entry));
  } catch {
    // ignore quota / privacy errors
  }
}

export interface UseReleasesResult {
  releases: Release[];
  latestId: string | null;
  loading: boolean;
  error: string | null;
  /** True when the data shown came from cache (memory or localStorage). */
  fromCache: boolean;
  refresh: () => Promise<void>;
}

export function useReleases(): UseReleasesResult {
  const [data, setData] = useState<ReleaseIndex | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState(false);

  const load = useCallback(async (force = false) => {
    const now = Date.now();
    if (!force && memoryCache && now - memoryCache.fetchedAt < CACHE_TTL_MS) {
      setData(memoryCache.data);
      setFromCache(true);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(FEED_URL, { cache: 'no-cache' });
      if (!res.ok) throw new Error(`releases.json: ${res.status}`);
      const json = (await res.json()) as ReleaseIndex;
      const entry: CacheEntry = { fetchedAt: Date.now(), data: json };
      memoryCache = entry;
      writeLocalStorage(entry);
      setData(json);
      setFromCache(false);
    } catch (e) {
      const stored = readLocalStorage();
      if (stored) {
        memoryCache = stored;
        setData(stored.data);
        setFromCache(true);
        setError(null);
      } else {
        setError(e instanceof Error ? e.message : 'failed to fetch releases');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(false);
  }, [load]);

  return {
    releases: data?.releases ?? [],
    latestId: data?.latest ?? null,
    loading,
    error,
    fromCache,
    refresh: () => load(true),
  };
}
