import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { MockTelemetrySource } from './MockTelemetrySource';
import { SerialTelemetrySource } from './SerialTelemetrySource';
import type { SourceStatus, TelemetryFrame, TelemetrySource } from './types';

/** How many frames to retain. ~33s at 60 Hz — enough for any single card window. */
const HISTORY_CAP = 2000;
/** How many recent frames to average the displayed rate over. */
const RATE_WINDOW = 30;

/**
 * Owns the active telemetry source and the rolling frame history.
 *
 * Incoming frames are written straight into refs (no React state) and merely
 * flag the buffer dirty; a requestAnimationFrame loop then triggers at most one
 * render per animation frame while connected. This decouples the device frame
 * rate from React's render rate so a fast stream can't thrash the UI.
 */
export function useTelemetry() {
  const sourceRef = useRef<TelemetrySource | null>(null);
  const historyRef = useRef<TelemetryFrame[]>([]);
  const latestRef = useRef<TelemetryFrame | null>(null);
  const dirtyRef = useRef(false);

  const [status, setStatus] = useState<SourceStatus>('idle');
  const [kind, setKind] = useState<'serial' | 'mock' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, render] = useReducer((n: number) => n + 1, 0);

  const onFrame = useCallback((frame: TelemetryFrame) => {
    latestRef.current = frame;
    const h = historyRef.current;
    h.push(frame);
    if (h.length > HISTORY_CAP) h.splice(0, h.length - HISTORY_CAP);
    dirtyRef.current = true;
  }, []);

  // Coalesce frame bursts into one render per animation frame.
  useEffect(() => {
    if (status !== 'connected') return;
    let raf = 0;
    let alive = true;
    const loop = () => {
      if (!alive) return;
      if (dirtyRef.current) {
        dirtyRef.current = false;
        render();
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
    };
  }, [status]);

  const disconnect = useCallback(async () => {
    const src = sourceRef.current;
    sourceRef.current = null;
    if (src) {
      try {
        await src.stop();
      } catch {
        // ignore teardown errors
      }
    }
    setStatus('idle');
    setKind(null);
  }, []);

  const connect = useCallback(
    async (src: TelemetrySource) => {
      const prev = sourceRef.current;
      sourceRef.current = null;
      if (prev) {
        try {
          await prev.stop();
        } catch {
          // ignore teardown errors
        }
      }

      historyRef.current = [];
      latestRef.current = null;
      setError(null);
      setKind(src.kind);
      sourceRef.current = src;

      try {
        await src.start({
          onFrame,
          onStatus: (s, detail) => {
            setStatus(s);
            if (s === 'error' && detail) setError(detail);
          },
        });
      } catch (e) {
        sourceRef.current = null;
        const msg = (e as Error).message ?? 'connection failed';
        // The Web Serial port picker throws when the user dismisses it —
        // treat that as a quiet return to idle rather than an error.
        if (/no port selected|cancel|aborted|chosen/i.test(msg)) {
          setStatus('idle');
          setKind(null);
        } else {
          setStatus('error');
          setError(msg);
        }
      }
    },
    [onFrame],
  );

  const connectSerial = useCallback(() => connect(new SerialTelemetrySource()), [connect]);
  const connectMock = useCallback(() => connect(new MockTelemetrySource()), [connect]);

  // Tear down the source if the tool unmounts while connected.
  useEffect(() => () => void sourceRef.current?.stop(), []);

  // Displayed frame rate, averaged over the most recent frames.
  const h = historyRef.current;
  let rateHz = 0;
  if (h.length >= 2) {
    const n = Math.min(RATE_WINDOW, h.length);
    const dt = (h[h.length - 1].at - h[h.length - n].at) / 1000;
    if (dt > 0) rateHz = (n - 1) / dt;
  }

  const serialSupported = typeof navigator !== 'undefined' && 'serial' in navigator;

  return {
    status,
    kind,
    error,
    serialSupported,
    rateHz,
    history: historyRef.current,
    latest: latestRef.current,
    connectSerial,
    connectMock,
    disconnect,
  };
}
