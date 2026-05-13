import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StatusBadge, Terminal, type TerminalLine } from '../../../design-system';
import { fetchBinary, type Release } from '../releases';
import type { FirmwareTarget } from '../Firmware';
import { useDeviceStatus } from '../../../contexts/DeviceStatusContext';
import { DaisyFlasher } from './dfu';
import { Esp32Flasher } from './esp';
import { CombinedFlasher } from './CombinedFlasher';
import './FlashPanel.css';

export interface FlashPanelProps {
  target: FirmwareTarget;
  release: Release | undefined;
}

type Phase = 'idle' | 'connecting' | 'connected' | 'flashing' | 'done' | 'error';

interface ProgressState {
  daisy: number;
  esp: number;
}

const EMPTY_PROGRESS: ProgressState = { daisy: 0, esp: 0 };

export const FlashPanel: React.FC<FlashPanelProps> = ({
  target,
  release,
}) => {
  const { setState: setGlobalConnection } = useDeviceStatus();
  const [lines, setLines] = useState<TerminalLine[]>([]);
  const [phase, setPhase] = useState<Phase>('idle');
  const [progress, setProgress] = useState<ProgressState>(EMPTY_PROGRESS);
  const [daisyConnected, setDaisyConnected] = useState(false);
  const [espConnected, setEspConnected] = useState(false);

  useEffect(() => {
    setGlobalConnection({ daisy: daisyConnected, esp: espConnected });
  }, [daisyConnected, espConnected, setGlobalConnection]);

  useEffect(() => {
    return () => {
      // Reset top-bar status when the firmware tool unmounts.
      setGlobalConnection({ daisy: false, esp: false });
    };
  }, [setGlobalConnection]);

  const daisyRef = useRef<DaisyFlasher | null>(null);
  const espRef = useRef<Esp32Flasher | null>(null);
  const combinedRef = useRef<CombinedFlasher | null>(null);

  const log = useCallback(
    (level: TerminalLine['level'], text: string) => {
      setLines((prev) => [...prev, { level, text }]);
    },
    [],
  );

  const notifyConnections = useCallback((d: boolean, e: boolean) => {
    setDaisyConnected(d);
    setEspConnected(e);
  }, []);

  const loggers = useMemo(
    () => ({
      onInfo: (m: string) => log('info', m),
      onWarn: (m: string) => log('warn', m),
      onError: (m: string) => log('err', m),
    }),
    [log],
  );

  const reset = useCallback(() => {
    setLines([]);
    setProgress(EMPTY_PROGRESS);
    setPhase('idle');
  }, []);

  // ──────────────────────── connect ────────────────────────
  const connectDaisy = useCallback(async () => {
    setPhase('connecting');
    try {
      const f = daisyRef.current ?? new DaisyFlasher();
      daisyRef.current = f;
      const info = await f.connect(loggers);
      log('ok', info.name);
      notifyConnections(true, espConnected);
      setPhase(target === 'both' && !espConnected ? 'connecting' : 'connected');
    } catch (e) {
      log('err', (e as Error).message);
      setPhase('error');
    }
  }, [loggers, log, notifyConnections, espConnected, target]);

  const connectEsp = useCallback(async () => {
    setPhase('connecting');
    try {
      const f = espRef.current ?? new Esp32Flasher();
      espRef.current = f;
      const info = await f.connect(loggers);
      log('ok', info.name);
      notifyConnections(daisyConnected, true);
      setPhase(target === 'both' && !daisyConnected ? 'connecting' : 'connected');
    } catch (e) {
      log('err', (e as Error).message);
      setPhase('error');
    }
  }, [loggers, log, notifyConnections, daisyConnected, target]);

  // ──────────────────────── flash ────────────────────────
  const flashDaisy = useCallback(async () => {
    if (!release || !daisyRef.current) return;
    setPhase('flashing');
    setProgress(EMPTY_PROGRESS);
    try {
      log('info', `fetching daisy firmware ${release.version}`);
      const bin = await fetchBinary(release.platforms.daisy);
      log('info', `firmware loaded (${bin.size} bytes)`);
      await daisyRef.current.flash(
        bin,
        (done, total) =>
          setProgress({ daisy: Math.round((done / total) * 100), esp: 0 }),
        loggers,
      );
      setProgress({ daisy: 100, esp: 0 });
      log('ok', 'daisy flash complete — device will reset');
      setPhase('done');
    } catch (e) {
      log('err', (e as Error).message);
      setPhase('error');
    }
  }, [release, log, loggers]);

  const flashEsp = useCallback(async () => {
    if (!release || !espRef.current) return;
    setPhase('flashing');
    setProgress(EMPTY_PROGRESS);
    try {
      log('info', `fetching esp32 firmware ${release.version}`);
      const app = await fetchBinary(release.platforms.esp32);
      log('info', `esp32 app loaded (${app.size} bytes)`);
      let lfs: Blob | null = null;
      if (release.platforms.littlefs) {
        log('info', 'fetching littlefs (daisy payload)');
        lfs = await fetchBinary(release.platforms.littlefs);
        log('info', `littlefs loaded (${lfs.size} bytes)`);
      }
      await espRef.current.flash(
        { app, littlefs: lfs },
        (done, total) =>
          setProgress({ daisy: 0, esp: Math.round((done / total) * 100) }),
        loggers,
      );
      setProgress({ daisy: 0, esp: 100 });
      log('ok', 'esp32 flash complete');
      setPhase('done');
    } catch (e) {
      log('err', (e as Error).message);
      setPhase('error');
    }
  }, [release, log, loggers]);

  const flashBoth = useCallback(async () => {
    if (!release) return;
    if (!combinedRef.current) {
      combinedRef.current = new CombinedFlasher();
    }
    // Reuse already-connected flasher instances.
    const c = combinedRef.current;
    if (daisyRef.current) (c as unknown as { daisy: DaisyFlasher }).daisy = daisyRef.current;
    if (espRef.current) (c as unknown as { esp: Esp32Flasher }).esp = espRef.current;

    setPhase('flashing');
    setProgress(EMPTY_PROGRESS);
    try {
      log('info', `fetching daisy firmware ${release.version}`);
      const daisyBin = await fetchBinary(release.platforms.daisy);
      log('info', `fetching esp32 firmware ${release.version}`);
      const espApp = await fetchBinary(release.platforms.esp32);
      let lfs: Blob | null = null;
      if (release.platforms.littlefs) {
        log('info', 'fetching littlefs (daisy payload)');
        lfs = await fetchBinary(release.platforms.littlefs);
      }

      await c.flash(
        { daisyBin, espApp, littlefs: lfs },
        {
          onDaisy: (done, total) =>
            setProgress((p) => ({ ...p, daisy: Math.round((done / total) * 100) })),
          onEsp: (done, total) =>
            setProgress((p) => ({ ...p, esp: Math.round((done / total) * 100) })),
        },
        loggers,
      );
      setProgress({ daisy: 100, esp: 100 });
      log('ok', 'both targets flashed');
      setPhase('done');
    } catch (e) {
      log('err', (e as Error).message);
      setPhase('error');
    }
  }, [release, log, loggers]);

  // ──────────────────────── derived ────────────────────────
  const requiresDaisy = target === 'daisy' || target === 'both';
  const requiresEsp = target === 'esp32' || target === 'both';
  const ready =
    !!release &&
    (!requiresDaisy || daisyConnected) &&
    (!requiresEsp || espConnected);
  const busy = phase === 'flashing' || phase === 'connecting';

  const onFlash = () => {
    if (target === 'daisy') return flashDaisy();
    if (target === 'esp32') return flashEsp();
    return flashBoth();
  };

  return (
    <div className="flash-panel">
      <div className="flash-panel__connect">
        {requiresDaisy && (
          <button
            type="button"
            className="flash-panel__btn"
            onClick={connectDaisy}
            disabled={busy || daisyConnected}
          >
            {daisyConnected ? '[ daisy connected ]' : '[ connect daisy (dfu) ]'}
          </button>
        )}
        {requiresEsp && (
          <button
            type="button"
            className="flash-panel__btn"
            onClick={connectEsp}
            disabled={busy || espConnected}
          >
            {espConnected ? '[ esp32 connected ]' : '[ connect esp32 (serial) ]'}
          </button>
        )}
      </div>

      <div className="flash-panel__hint">
        <StatusBadge kind="info">
          {target === 'daisy' && 'connect daisy in dfu mode (reset, then boot — led pulses)'}
          {target === 'esp32' && 'hold boot, press reset on the esp32 to enter download mode'}
          {target === 'both' && 'connect each interface in turn — daisy (dfu) first, then esp32 (serial)'}
        </StatusBadge>
      </div>

      <div className="flash-panel__action">
        <button
          type="button"
          className="flash-panel__primary"
          onClick={() => void onFlash()}
          disabled={!ready || busy}
        >
          {busy ? '[ flashing… ]' : '[ flash ]'}
        </button>
        {phase === 'done' && <StatusBadge kind="ok">flash complete</StatusBadge>}
        {phase === 'error' && <StatusBadge kind="err">flash failed — see log</StatusBadge>}
      </div>

      <div className="flash-panel__progress">
        {requiresDaisy && (
          <ProgressRow label="daisy" pct={progress.daisy} active={phase === 'flashing'} />
        )}
        {requiresEsp && (
          <ProgressRow label="esp32" pct={progress.esp} active={phase === 'flashing'} />
        )}
      </div>

      <Terminal lines={lines} maxHeight={200} ariaLabel="flash log" />

      {phase === 'done' || phase === 'error' ? (
        <button
          type="button"
          className="flash-panel__reset"
          onClick={reset}
        >
          [ reset log ]
        </button>
      ) : null}
    </div>
  );
};

const ProgressRow: React.FC<{ label: string; pct: number; active: boolean }> = ({
  label,
  pct,
  active,
}) => (
  <div className={`flash-progress${active ? ' flash-progress--active' : ''}`}>
    <span className="flash-progress__label">{label}</span>
    <span className="flash-progress__bar" aria-hidden="true">
      <span
        className="flash-progress__fill"
        style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
      />
    </span>
    <span className="flash-progress__pct">{pct.toString().padStart(3, ' ')}%</span>
  </div>
);
