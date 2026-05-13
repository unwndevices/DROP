import React from 'react';
import { SpectralAnalysis } from './spectral-analysis/SpectralAnalysis';
import { DatumViewer } from './datum-viewer/DatumViewer';
import { UIGraphicsConverter } from './ui-graphics/UIGraphicsConverter';
import { DeviceBridge } from './device-bridge/DeviceBridge';
import { Wav2Datum } from './wav2datum/Wav2Datum';
import { PixelArtGenerator } from './pixel-art-generator/PixelArtGenerator';
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
 * Canonical tool registry. The TopBar tab strip renders the visible entries
 * in declaration order. `firmware` (phase 2) and `wav2datum` (phase 3) are
 * the post-rework tool surface; others stay hidden until phase 4 cleanup.
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
    id: 'device-bridge',
    label: 'device bridge',
    description: 'connect to eisei devices via Bluetooth or USB for real-time control',
    component: DeviceBridge,
  },
  {
    id: 'ui-graphics',
    label: 'graphic to ui',
    description: 'convert image sequences to UI graphics format',
    component: UIGraphicsConverter,
    hidden: true,
  },
  {
    id: 'datum-viewer',
    label: 'datum viewer',
    description: 'import and preview spectral datum files',
    component: DatumViewer,
    hidden: true,
  },
  {
    id: 'spectral-analysis',
    label: 'datum editor',
    description: 'lua-based spectral data generation and visualization',
    component: SpectralAnalysis,
    hidden: true,
  },
  {
    id: 'pixel-art-generator',
    label: 'pixel art',
    description: "lua-powered pixel art generator for eisei's 127x127 OLED display",
    component: PixelArtGenerator,
    hidden: true,
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
