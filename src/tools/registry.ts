import React from 'react';
import { DatumViewer } from './datum-viewer/DatumViewer';
import { Wav2Datum } from './wav2datum/Wav2Datum';
import { Firmware } from './firmware';
import { Debug } from './debug';

export interface ToolEntry {
  /** Stable id used for routing + localStorage. */
  id: string;
  /** Lowercase mono label shown in the tab strip (NFO). */
  label: string;
  /** Compact label shown in the tab strip on small viewports. */
  shortLabel: string;
  /** Long-form description for tooltips / tool header subtitle. */
  description: string;
  /** Mounted component for the tool. */
  component: React.ComponentType;
  /** Hidden from the tab strip but still resolvable by id (e.g. unstyled tools). */
  hidden?: boolean;
  /** Only shown in the tab strip once the beta gesture is unlocked. */
  beta?: boolean;
}

/**
 * Canonical tool registry — eisei launch surface.
 */
export const TOOL_REGISTRY: ToolEntry[] = [
  {
    id: 'firmware',
    label: 'firmware',
    shortLabel: 'fw',
    description: 'flash & download firmware for eisei',
    component: Firmware,
  },
  {
    id: 'debug',
    label: 'debug',
    shortLabel: 'dbg',
    description: 'live telemetry & debug for eisei',
    component: Debug,
    beta: true,
  },
  {
    id: 'wav2datum',
    label: 'wav2datum',
    shortLabel: 'w2d',
    description: 'convert WAV audio files to spectral datum format',
    component: Wav2Datum,
  },
  {
    id: 'datum-viewer',
    label: 'datum viewer',
    shortLabel: 'dv',
    description: 'import and preview spectral datum files',
    component: DatumViewer,
  },
];

export const VISIBLE_TOOLS = TOOL_REGISTRY.filter((t) => !t.hidden);

/** Tools shown in the tab strip, minus beta-gated ones unless unlocked. */
export function betaVisibleTools(unlocked: boolean): ToolEntry[] {
  return VISIBLE_TOOLS.filter((t) => unlocked || !t.beta);
}

export const ACTIVE_TOOL_STORAGE_KEY = 'drop-active-tool';

export function resolveActiveTool(id: string | null | undefined): ToolEntry {
  if (id) {
    const hit = TOOL_REGISTRY.find((t) => t.id === id);
    if (hit) return hit;
  }
  return VISIBLE_TOOLS[0] ?? TOOL_REGISTRY[0];
}
