import { useCallback, useEffect, useState } from 'react';

export type ThemeMode = 'light' | 'dark';

const STORAGE_KEY = 'drop-theme';
const DEFAULT_MODE: ThemeMode = 'light';

const apply = (mode: ThemeMode) => {
  document.documentElement.setAttribute('data-theme', mode);
};

const read = (): ThemeMode => {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === 'dark' ? 'dark' : 'light';
  } catch {
    return DEFAULT_MODE;
  }
};

export function useTheme(): { mode: ThemeMode; toggle: () => void } {
  const [mode, setMode] = useState<ThemeMode>(() => {
    const m = read();
    apply(m);
    return m;
  });

  useEffect(() => {
    apply(mode);
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      /* ignore */
    }
  }, [mode]);

  const toggle = useCallback(
    () => setMode((m) => (m === 'light' ? 'dark' : 'light')),
    [],
  );

  return { mode, toggle };
}
