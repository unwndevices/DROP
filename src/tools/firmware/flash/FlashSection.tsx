import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StatusBadge } from '../../../design-system';
import { fetchBinary, type Release } from '../releases';
import { DaisyFlasher } from './dfu';
import { Esp32Flasher } from './esp';
import './FlashSection.css';

type Phase = 'idle' | 'connecting' | 'connected' | 'flashing' | 'done' | 'error';

interface BaseProps {
  release: Release | undefined;
  /** Disable all controls while another section is busy. */
  busy?: boolean;
  onBusyChange?: (busy: boolean) => void;
}

export const DaisyFlashSection: React.FC<BaseProps> = ({
  release,
  busy: externalBusy,
  onBusyChange,
}) => {
  const flasherRef = useRef<DaisyFlasher | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [connected, setConnected] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState<{ kind: 'info' | 'ok' | 'warn' | 'err'; text: string } | null>(null);

  const busy = phase === 'connecting' || phase === 'flashing';
  useEffect(() => {
    onBusyChange?.(busy);
  }, [busy, onBusyChange]);

  const loggers = useMemo(
    () => ({
      onInfo: (m: string) => setMessage({ kind: 'info', text: m }),
      onWarn: (m: string) => setMessage({ kind: 'warn', text: m }),
      onError: (m: string) => setMessage({ kind: 'err', text: m }),
    }),
    [],
  );

  const connect = useCallback(async () => {
    setPhase('connecting');
    setMessage({ kind: 'info', text: 'requesting daisy in dfu mode…' });
    try {
      const f = flasherRef.current ?? new DaisyFlasher();
      flasherRef.current = f;
      const info = await f.connect(loggers);
      setConnected(true);
      setPhase('connected');
      setMessage({ kind: 'ok', text: info.name });
    } catch (e) {
      setMessage({ kind: 'err', text: (e as Error).message });
      setPhase('error');
    }
  }, [loggers]);

  const flash = useCallback(async () => {
    if (!release || !flasherRef.current) return;
    setPhase('flashing');
    setProgress(0);
    setMessage({ kind: 'info', text: `fetching daisy firmware ${release.version}…` });
    try {
      const bin = await fetchBinary(release.platforms.daisy);
      setMessage({ kind: 'info', text: `flashing ${bin.size} bytes via dfu…` });
      await flasherRef.current.flash(
        bin,
        (done, total) => setProgress(Math.round((done / total) * 100)),
        loggers,
      );
      setProgress(100);
      setMessage({ kind: 'ok', text: 'daisy flash complete — device will reset' });
      setPhase('done');
    } catch (e) {
      setMessage({ kind: 'err', text: (e as Error).message });
      setPhase('error');
    }
  }, [release, loggers]);

  const canConnect = !externalBusy && !busy && !connected;
  const canFlash = !externalBusy && connected && !busy && !!release;

  return (
    <div className="flash-section">
      <div className="flash-section__controls">
        <button
          type="button"
          className="flash-section__btn"
          onClick={connect}
          disabled={!canConnect}
        >
          {connected ? 'daisy connected' : 'connect daisy (dfu)'}
        </button>
        <button
          type="button"
          className="flash-section__btn flash-section__btn--primary"
          onClick={() => void flash()}
          disabled={!canFlash}
        >
          {phase === 'flashing' ? 'flashing…' : 'flash'}
        </button>
      </div>

      <p className="flash-section__hint">
        daisy can be powered or unpowered. enter dfu mode: hold boot, tap
        reset, release boot — the led pulses.
      </p>

      <ProgressBar pct={progress} active={phase === 'flashing'} />

      {message && <StatusBadge kind={message.kind}>{message.text}</StatusBadge>}
    </div>
  );
};

interface Esp32Props extends BaseProps {
  includeDaisy: boolean;
  onToggleIncludeDaisy: (next: boolean) => void;
}

export const Esp32FlashSection: React.FC<Esp32Props> = ({
  release,
  busy: externalBusy,
  onBusyChange,
  includeDaisy,
  onToggleIncludeDaisy,
}) => {
  const flasherRef = useRef<Esp32Flasher | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [connected, setConnected] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState<{ kind: 'info' | 'ok' | 'warn' | 'err'; text: string } | null>(null);

  const busy = phase === 'connecting' || phase === 'flashing';
  useEffect(() => {
    onBusyChange?.(busy);
  }, [busy, onBusyChange]);

  const loggers = useMemo(
    () => ({
      onInfo: (m: string) => setMessage({ kind: 'info', text: m }),
      onWarn: (m: string) => setMessage({ kind: 'warn', text: m }),
      onError: (m: string) => setMessage({ kind: 'err', text: m }),
    }),
    [],
  );

  const hasLittlefs = !!release?.platforms.littlefs;

  const connect = useCallback(async () => {
    setPhase('connecting');
    setMessage({ kind: 'info', text: 'requesting esp32 serial port…' });
    try {
      const f = flasherRef.current ?? new Esp32Flasher();
      flasherRef.current = f;
      const info = await f.connect(loggers);
      setConnected(true);
      setPhase('connected');
      setMessage({ kind: 'ok', text: info.name });
    } catch (e) {
      setMessage({ kind: 'err', text: (e as Error).message });
      setPhase('error');
    }
  }, [loggers]);

  const flash = useCallback(async () => {
    if (!release || !flasherRef.current) return;
    setPhase('flashing');
    setProgress(0);
    setMessage({ kind: 'info', text: `fetching esp32 firmware ${release.version}…` });
    try {
      const app = await fetchBinary(release.platforms.esp32);
      let lfs: Blob | null = null;
      if (includeDaisy && release.platforms.littlefs) {
        setMessage({ kind: 'info', text: 'fetching daisy firmware (littlefs)…' });
        lfs = await fetchBinary(release.platforms.littlefs);
      }
      setMessage({ kind: 'info', text: 'flashing esp32…' });
      await flasherRef.current.flash(
        { app, littlefs: lfs },
        (done, total) => setProgress(Math.round((done / total) * 100)),
        loggers,
      );
      setProgress(100);
      setMessage({ kind: 'ok', text: 'esp32 flash complete' });
      setPhase('done');
    } catch (e) {
      setMessage({ kind: 'err', text: (e as Error).message });
      setPhase('error');
    }
  }, [release, includeDaisy, loggers]);

  const canConnect = !externalBusy && !busy && !connected;
  const canFlash = !externalBusy && connected && !busy && !!release;

  return (
    <div className="flash-section">
      <label className="flash-section__option">
        <input
          type="checkbox"
          checked={includeDaisy}
          onChange={(e) => onToggleIncludeDaisy(e.target.checked)}
          disabled={busy || !hasLittlefs}
        />
        <span>
          include daisy firmware (littlefs)
          {!hasLittlefs && <em> — not available for this version</em>}
        </span>
      </label>

      <div className="flash-section__controls">
        <button
          type="button"
          className="flash-section__btn"
          onClick={connect}
          disabled={!canConnect}
        >
          {connected ? 'esp32 connected' : 'connect esp32 (serial)'}
        </button>
        <button
          type="button"
          className="flash-section__btn flash-section__btn--primary"
          onClick={() => void flash()}
          disabled={!canFlash}
        >
          {phase === 'flashing' ? 'flashing…' : 'flash'}
        </button>
      </div>

      <p className="flash-section__hint">
        plug in usb and pick the serial port — the esp32 enters bootloader
        automatically.
      </p>

      <ProgressBar pct={progress} active={phase === 'flashing'} />

      {message && <StatusBadge kind={message.kind}>{message.text}</StatusBadge>}
    </div>
  );
};

const ProgressBar: React.FC<{ pct: number; active: boolean }> = ({ pct, active }) => (
  <div className={`flash-progress${active ? ' flash-progress--active' : ''}`}>
    <span className="flash-progress__bar" aria-hidden="true">
      <span
        className="flash-progress__fill"
        style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
      />
    </span>
    <span className="flash-progress__pct">{pct.toString().padStart(3, ' ')}%</span>
  </div>
);
