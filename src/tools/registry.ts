import React from 'react';
import { DatumViewer } from './datum-viewer/DatumViewer';
import { Wav2Datum } from './wav2datum/Wav2Datum';
import { Firmware } from './firmware';

export interface ToolEntry {
  /** Stable id used for routing + localStorage. */
  id: string;
  /** Lowercase mono label shown in the tab strip (NFO). */
  label: string;
  /** Long-form description for tooltips / tool header subtitle. */
  description: string;
  /** Mounted component for the tool. */
  component: React.ComponentType;
  /** Hidden from the tab strip but still resolvable by id (e.g. unstyled tools). */
  hidden?: boolean;
}

/**
 * Canonical tool registry — eisei launch surface.
 */
export const TOOL_REGISTRY: ToolEntry[] = [
  {
    id: 'firmware',
    label: 'firmware',
    description: 'flash & download firmware for eisei',
    component: Firmware,
  },
  {
    id: 'wav2datum',
    label: 'wav2datum',
    description: 'convert WAV audio files to spectral datum format',
    component: Wav2Datum,
  },
  {
    id: 'datum-viewer',
    label: 'datum viewer',
    description: 'import and preview spectral datum files',
    component: DatumViewer,
  },
];

export const VISIBLE_TOOLS = TOOL_REGISTRY.filter((t) => !t.hidden);

export const ACTIVE_TOOL_STORAGE_KEY = 'drop-active-tool';

export function resolveActiveTool(id: string | null | undefined): ToolEntry {
  if (id) {
    const hit = TOOL_REGISTRY.find((t) => t.id === id);
    if (hit) return hit;
  }
  return VISIBLE_TOOLS[0] ?? TOOL_REGISTRY[0];
}
