import React from 'react';
import { SectionLabel, StatusBadge } from '../../design-system';
import { useTelemetry } from './telemetry/useTelemetry';
import { PotScopeCard } from './cards/PotScopeCard';
import { PitchCard } from './cards/PitchCard';
import './Debug.css';

/**
 * Live debug surface for eisei. Connects to the running device over Web Serial
 * (or a built-in demo source), then visualizes telemetry the device exposes but
 * doesn't show on its own screen. Built to grow card-by-card.
 */
export const Debug: React.FC = () => {
  const {
    status,
    kind,
    error,
    serialSupported,
    rateHz,
    history,
    latest,
    connectSerial,
    connectMock,
    disconnect,
  } = useTelemetry();

  const connected = status === 'connected';
  const connecting = status === 'connecting';

  const statusBadge = error ? (
    <StatusBadge kind="err">{error}</StatusBadge>
  ) : connected ? (
    <StatusBadge kind="ok">
      {kind === 'mock' ? 'demo' : 'serial'} · {rateHz.toFixed(0)} hz
    </StatusBadge>
  ) : connecting ? (
    <StatusBadge kind="info">connecting…</StatusBadge>
  ) : (
    <StatusBadge kind="info">disconnected</StatusBadge>
  );

  return (
    <div className="debug-tool">
      <section className="debug-conn">
        <SectionLabel index={1}>device</SectionLabel>

        <div className="debug-conn__controls">
          <button
            type="button"
            className="debug-btn"
            onClick={() => void connectSerial()}
            disabled={connected || connecting || !serialSupported}
          >
            connect serial
          </button>
          <button
            type="button"
            className="debug-btn"
            onClick={() => void connectMock()}
            disabled={connected || connecting}
          >
            demo
          </button>
          <button
            type="button"
            className="debug-btn"
            onClick={() => void disconnect()}
            disabled={!connected && status !== 'error'}
          >
            disconnect
          </button>
          <span className="debug-conn__status">{statusBadge}</span>
        </div>

        {!serialSupported && (
          <p className="debug-hint">
            web serial needs a chromium browser (chrome / edge). demo mode works anywhere.
          </p>
        )}
        <p className="debug-hint">
          reads newline-delimited json telemetry over usb serial @ 115200 — see
          telemetry/PROTOCOL.md.
        </p>
      </section>

      <div className="debug-tool__cards">
        <PotScopeCard history={history} />
        <PitchCard osc={latest?.osc} />
      </div>
    </div>
  );
};
