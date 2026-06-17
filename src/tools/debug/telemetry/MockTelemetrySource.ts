// Synthetic telemetry for developing the debug UI without a device attached.
// Mirrors the v1 protocol exactly, so it doubles as living documentation of
// the frame shape the firmware should emit.

import type { SourceHandlers, TelemetryFrame, TelemetrySource } from './types';

const FRAME_INTERVAL_MS = 16; // ~60 Hz

export class MockTelemetrySource implements TelemetrySource {
  readonly kind = 'mock';

  private timer: ReturnType<typeof setInterval> | null = null;
  private t0 = 0;

  start(handlers: SourceHandlers): Promise<void> {
    handlers.onStatus('connecting');
    this.t0 = performance.now();
    this.timer = setInterval(() => handlers.onFrame(this.frame()), FRAME_INTERVAL_MS);
    handlers.onStatus('connected', 'demo source');
    return Promise.resolve();
  }

  stop(): Promise<void> {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
    return Promise.resolve();
  }

  private frame(): TelemetryFrame {
    const now = performance.now();
    const t = (now - this.t0) / 1000;
    const noise = (amp: number) => (Math.random() * 2 - 1) * amp;
    const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

    // A spread of pot behaviours to exercise the scope: a slow sweep, a noisy
    // pot, a clean pot, a small wobble, near-rail values, and a switch-like one.
    const pots = [
      clamp01(0.5 + 0.45 * Math.sin(t * 0.6) + noise(0.003)),
      clamp01(0.5 + noise(0.03)),
      clamp01(0.5 + noise(0.0015)),
      clamp01(0.25 + 0.02 * Math.sin(t * 3.1) + noise(0.004)),
      clamp01(0.002 + Math.abs(noise(0.0012))),
      clamp01(0.98 + noise(0.004)),
      clamp01(0.5 + 0.5 * Math.sign(Math.sin(t * 0.4))),
      clamp01(0.33 + noise(0.01)),
    ];

    // Two oscillators wandering a couple of semitones so note + cents animate.
    const osc = [
      440 * Math.pow(2, (2.2 * Math.sin(t * 0.25)) / 12),
      110 * Math.pow(2, (1.5 * Math.sin(t * 0.17 + 1)) / 12),
    ];

    return { at: now, ms: Math.round(now - this.t0), pots, osc };
  }
}
