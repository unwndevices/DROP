import { useCallback, useEffect, useState } from 'react';

/**
 * Manuals live in the firmware repo under /manuals as
 * `eisei_manual_v108.pdf`-style files. The GitHub contents API lists the
 * directory with CORS enabled, so new manuals show up without a site deploy.
 */
const MANUALS_API_URL =
  'https://api.github.com/repos/unwndevices/unwn_fw/contents/manuals?ref=main';
const CACHE_TTL_MS = 5 * 60 * 1000;
const STORAGE_KEY = 'drop-manuals-cache';

export interface ManualEntry {
  /** Filename in the manuals folder — stable id. */
  file: string;
  /** Display label, e.g. "v1.0.8". */
  label: string;
  /** raw.githubusercontent download URL. */
  url: string;
  /** Numeric key for newest-first ordering. */
  sortKey: number;
}

interface ContentsItem {
  name: string;
  type: string;
  download_url: string | null;
}

interface CacheEntry {
  fetchedAt: number;
  data: ManualEntry[];
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

/** "108" → "v1.0.8"; tokens outside the d.d.d scheme fall back to "v108". */
function formatVersionToken(token: string): string {
  if (/^\d{3}$/.test(token)) return `v${token[0]}.${token[1]}.${token[2]}`;
  return `v${token}`;
}

function parseManuals(items: ContentsItem[]): ManualEntry[] {
  const entries: ManualEntry[] = [];
  for (const item of items) {
    if (item.type !== 'file' || !item.download_url) continue;
    const match = /_v(\d+)\.pdf$/i.exec(item.name);
    if (!match) continue;
    entries.push({
      file: item.name,
      label: formatVersionToken(match[1]),
      url: item.download_url,
      sortKey: Number(match[1]),
    });
  }
  return entries.sort((a, b) => b.sortKey - a.sortKey);
}

export interface UseManualsResult {
  /** Newest first. */
  manuals: ManualEntry[];
  loading: boolean;
  error: string | null;
  /** True when the data shown came from cache (memory or localStorage). */
  fromCache: boolean;
  refresh: () => Promise<void>;
}

export function useManuals(enabled = true): UseManualsResult {
  const [data, setData] = useState<ManualEntry[] | null>(null);
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
      const res = await fetch(MANUALS_API_URL, { cache: 'no-cache' });
      if (!res.ok) throw new Error(`manuals listing: ${res.status}`);
      const items = (await res.json()) as ContentsItem[];
      const manuals = parseManuals(items);
      const entry: CacheEntry = { fetchedAt: Date.now(), data: manuals };
      memoryCache = entry;
      writeLocalStorage(entry);
      setData(manuals);
      setFromCache(false);
    } catch (e) {
      const stored = readLocalStorage();
      if (stored) {
        memoryCache = stored;
        setData(stored.data);
        setFromCache(true);
        setError(null);
      } else {
        setError(e instanceof Error ? e.message : 'failed to fetch manuals');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (enabled) void load(false);
  }, [enabled, load]);

  return {
    manuals: data ?? [],
    loading,
    error,
    fromCache,
    refresh: () => load(true),
  };
}
