import React from 'react';
import { SectionLabel } from '../../../design-system';
import { formatHz, hzToNote } from '../util/pitch';
import './PitchCard.css';

interface PitchCardProps {
  /** Latest oscillator frequencies in Hz, if any. */
  osc?: number[];
}

/** Shows each oscillator's pitch as both frequency and musical note + cents. */
export const PitchCard: React.FC<PitchCardProps> = ({ osc }) => {
  const hasData = Array.isArray(osc) && osc.length > 0;

  return (
    <section className="debug-card">
      <SectionLabel index={3}>oscillators</SectionLabel>
      <div className="pitch-card">
        {hasData ? (
          osc.map((hz, i) => <PitchRow key={i} idx={i} hz={hz} />)
        ) : (
          <p className="debug-empty">no oscillator telemetry — connect serial or start demo</p>
        )}
      </div>
    </section>
  );
};

const PitchRow: React.FC<{ idx: number; hz: number }> = ({ idx, hz }) => {
  const info = hzToNote(hz);
  const cents = info?.cents ?? 0;
  // Map -50..+50 cents onto 0..100% across the meter.
  const pos = Math.max(0, Math.min(100, cents + 50));
  const centsLabel = cents > 0 ? `+${cents}` : `${cents}`;

  return (
    <div className="pitch-row">
      <span className="pitch-row__idx">osc{idx}</span>
      <span className="pitch-row__note">{info ? info.label : '—'}</span>
      <span className="pitch-row__freq">{formatHz(hz)}</span>
      <div className="pitch-row__cents">
        <span className="pitch-row__cents-track">
          <span className="pitch-row__cents-mid" aria-hidden="true" />
          <span className="pitch-row__cents-dot" style={{ left: `${pos}%` }} />
        </span>
        <span className="pitch-row__cents-val">{centsLabel}c</span>
      </div>
    </div>
  );
};
