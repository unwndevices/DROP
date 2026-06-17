// NDJSON telemetry protocol (v1) — see PROTOCOL.md for the full contract.
//
// The device prints one JSON object per line over USB serial. Lines that
// aren't JSON (boot logs, panics, etc.) are ignored, so the debug tool can
// share the same port the firmware already uses for its console.

import type { TelemetryFrame } from './types';

const OPEN_BRACE = 0x7b; // '{'

/** Parse a single serial line into a frame, or null if it isn't telemetry. */
export function parseLine(line: string): TelemetryFrame | null {
  // Cheap reject for non-JSON console output before paying for JSON.parse.
  if (line.charCodeAt(0) !== OPEN_BRACE) return null;
  let obj: unknown;
  try {
    obj = JSON.parse(line);
  } catch {
    return null;
  }
  return frameFromObject(obj);
}

/** Build a frame from an already-parsed object. Lenient and forward-compatible. */
export function frameFromObject(obj: unknown): TelemetryFrame | null {
  if (typeof obj !== 'object' || obj === null) return null;
  const o = obj as Record<string, unknown>;

  const hasPots = Array.isArray(o.pots);
  const hasOsc = Array.isArray(o.osc);
  // Accept an explicit `{"t":"tele"}` tag or any frame carrying known payloads.
  if (o.t !== 'tele' && !hasPots && !hasOsc) return null;

  const frame: TelemetryFrame = { at: performance.now() };
  if (typeof o.ms === 'number') frame.ms = o.ms;
  if (hasPots) frame.pots = (o.pots as unknown[]).map(toNumber);
  if (hasOsc) frame.osc = (o.osc as unknown[]).map(toNumber);
  return frame;
}

function toNumber(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
