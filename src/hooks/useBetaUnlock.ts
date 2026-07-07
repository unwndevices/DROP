import { useSyncExternalStore } from 'react';

// Shared "beta unlock" — a hidden dev switch that reveals pre-release firmware
// builds and beta-gated tools (e.g. the debug tab). Unlocked by typing the
// secret word anywhere on the page (outside form controls) and remembered
// across sessions. Lives in one module-level store so every consumer — the
// tab strip, the firmware tool — reacts to the same state and a single
// keyboard listener drives it.

const STORAGE_KEY = 'drop-beta-unlock';
const SECRET = 'beta';

function read(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

function write(value: boolean): void {
  try {
    if (value) localStorage.setItem(STORAGE_KEY, '1');
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore quota / privacy errors
  }
}

let unlocked = read();
const listeners = new Set<() => void>();

export function setBetaUnlocked(next: boolean): void {
  if (next === unlocked) return;
  unlocked = next;
  write(unlocked);
  listeners.forEach((notify) => notify());
}

function subscribe(notify: () => void): () => void {
  listeners.add(notify);
  return () => listeners.delete(notify);
}

/** Reactive read of the beta-unlock flag. */
export function useBetaUnlock(): boolean {
  return useSyncExternalStore(subscribe, () => unlocked);
}

// Install the hidden gesture once, for the app's lifetime.
if (typeof window !== 'undefined') {
  let buffer = '';
  window.addEventListener('keydown', (e) => {
    // Ignore keystrokes aimed at form controls (selects/inputs swallow them).
    const tag = (e.target as HTMLElement | null)?.tagName ?? '';
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    if (e.key.length !== 1) return;
    buffer = (buffer + e.key.toLowerCase()).slice(-SECRET.length);
    if (buffer === SECRET) setBetaUnlocked(!unlocked);
  });
}
