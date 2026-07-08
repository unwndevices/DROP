import { useSyncExternalStore } from 'react';

/**
 * Selected manual file, shared between the TopBar version selector and the
 * manual tool. Module-level store instead of lifted state because tools are
 * mounted generically from the registry and can't receive props from App.
 */
let selectedFile: string | null = null;
const listeners = new Set<() => void>();

export function setSelectedManualFile(file: string | null): void {
  if (file === selectedFile) return;
  selectedFile = file;
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function useSelectedManualFile(): string | null {
  return useSyncExternalStore(subscribe, () => selectedFile);
}
