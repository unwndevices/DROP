import React, { useEffect, useMemo, useRef, useState } from 'react';
import UplotReact from 'uplot-react';
import type uPlot from 'uplot';
import { SectionLabel, Segmented } from '../../../design-system';
import type { TelemetryFrame } from '../telemetry/types';
import 'uplot/dist/uPlot.min.css';
import './PotScopeCard.css';

interface PotScopeCardProps {
  /** Rolling frame history (mutated in place by the telemetry hook). */
  history: TelemetryFrame[];
}

type YMode = 'auto' | 'full';

/** Number of most-recent frames shown in the scope window. */
const WINDOW = 600;
const CHART_HEIGHT = 220;

const Y_OPTIONS = [
  { value: 'auto' as const, label: 'auto' },
  { value: 'full' as const, label: '0–1' },
];

/**
 * Live, multi-trace scope for potentiometer values. Pots are selectable so the
 * user can isolate one and judge its noise / drift / oscillation even at rest;
 * "auto" range zooms into the jitter, "0–1" shows absolute position.
 */
export const PotScopeCard: React.FC<PotScopeCardProps> = ({ history }) => {
  const colors = useNfoColors();
  const [selected, setSelected] = useState<number[]>([]);
  const [yMode, setYMode] = useState<YMode>('auto');
  const initedRef = useRef(false);

  // Width is measured so uplot gets an explicit pixel size.
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      setWidth(Math.floor(entries[0].contentRect.width));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Pot count from the most recent frame that carries pots.
  let potCount = 0;
  for (let i = history.length - 1, seen = 0; i >= 0 && seen < 60; i--, seen++) {
    const p = history[i].pots;
    if (p) {
      potCount = p.length;
      break;
    }
  }

  // Default to plotting the first pot once data starts flowing.
  useEffect(() => {
    if (!initedRef.current && potCount > 0) {
      initedRef.current = true;
      setSelected([0]);
    }
  }, [potCount]);

  const toggle = (idx: number) =>
    setSelected((prev) =>
      prev.includes(idx) ? prev.filter((x) => x !== idx) : [...prev, idx].sort((a, b) => a - b),
    );

  // Windowed slice + aligned data for uplot. Rebuilt every render on purpose:
  // `history` is mutated in place by the telemetry hook so its reference never
  // changes — memoizing on it would freeze the chart until the selection
  // changed (uplot-react bails on an unchanged data reference). uplot-react
  // deep-compares values before redrawing, so a fresh array per tick is cheap.
  const frames =
    history.length > WINDOW ? history.slice(history.length - WINDOW) : history;
  const t0 = frames.length ? frames[0].at : 0;
  const xs = frames.map((f) => (f.at - t0) / 1000);
  const series = selected.map((idx) =>
    frames.map((f) => (typeof f.pots?.[idx] === 'number' ? f.pots[idx] : null)),
  );
  const data: uPlot.AlignedData = [xs, ...series];

  const options = useMemo<uPlot.Options>(() => {
    const axis: uPlot.Axis = {
      stroke: colors.ink3,
      grid: { stroke: colors.border, width: 1 },
      ticks: { stroke: colors.border, width: 1, size: 4 },
      font: '10px "Departure Mono", "Fira Mono", monospace',
      gap: 4,
    };
    return {
      width: Math.max(width, 1),
      height: CHART_HEIGHT,
      legend: { show: false },
      cursor: { points: { show: false } },
      scales: { x: { time: false }, y: yMode === 'full' ? { range: [0, 1] } : {} },
      axes: [axis, { ...axis, size: 44 }],
      series: [
        {},
        ...selected.map((idx, i) => ({
          label: `P${idx}`,
          stroke: seriesColor(colors, i),
          width: 1.25,
          points: { show: false },
        })),
      ],
      padding: [8, 8, 0, 0],
    };
  }, [width, yMode, colors, selected]);

  return (
    <section className="debug-card">
      <SectionLabel
        index={2}
        actions={
          <Segmented<YMode>
            size="sm"
            options={Y_OPTIONS}
            value={yMode}
            onChange={setYMode}
            ariaLabel="scope y-axis range"
          />
        }
      >
        pot scope
      </SectionLabel>

      <div className="pot-scope">
        {potCount > 0 && (
          <div className="pot-scope__chips">
            {Array.from({ length: potCount }, (_, idx) => {
              const on = selected.includes(idx);
              const swatch = on ? seriesColor(colors, selected.indexOf(idx)) : 'transparent';
              return (
                <button
                  key={idx}
                  type="button"
                  className={`pot-chip${on ? ' is-on' : ''}`}
                  onClick={() => toggle(idx)}
                >
                  <span className="pot-chip__swatch" style={{ background: swatch }} />
                  P{idx}
                </button>
              );
            })}
          </div>
        )}

        <div className="pot-scope__chart" ref={wrapRef} style={{ minHeight: CHART_HEIGHT }}>
          {potCount === 0 ? (
            <p className="debug-empty">no pot telemetry — connect serial or start demo</p>
          ) : selected.length === 0 ? (
            <p className="debug-empty">select a pot to plot</p>
          ) : width > 0 ? (
            <UplotReact options={options} data={data} />
          ) : null}
        </div>

        {selected.length > 0 && (
          <div className="pot-scope__readouts">
            {selected.map((idx, i) => {
              const stats = potStats(frames, idx);
              return (
                <span className="pot-readout" key={idx}>
                  <span className="pot-readout__swatch" style={{ background: seriesColor(colors, i) }} />
                  <span className="pot-readout__k">P{idx}</span>
                  <span className="pot-readout__v">
                    {stats.cur === null ? '—' : stats.cur.toFixed(4)}
                  </span>
                  <span className="pot-readout__k">p2p</span>
                  <span className="pot-readout__v">{stats.p2p.toFixed(4)}</span>
                </span>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};

/** Current value and peak-to-peak (noise indicator) for one pot over the window. */
function potStats(frames: TelemetryFrame[], idx: number): { cur: number | null; p2p: number } {
  let cur: number | null = null;
  let lo = Infinity;
  let hi = -Infinity;
  let count = 0;
  for (const f of frames) {
    const v = f.pots?.[idx];
    if (typeof v === 'number') {
      cur = v;
      if (v < lo) lo = v;
      if (v > hi) hi = v;
      count++;
    }
  }
  return { cur, p2p: count ? hi - lo : 0 };
}

interface NfoColors {
  ink1: string;
  ink3: string;
  border: string;
  accent: string;
  info: string;
  ok: string;
  warn: string;
}

function seriesColor(colors: NfoColors, i: number): string {
  const palette = [colors.accent, colors.info, colors.ok, colors.warn, colors.ink1];
  return palette[i % palette.length];
}

/** Reads NFO palette from CSS variables and refreshes on light/dark toggle. */
function useNfoColors(): NfoColors {
  const read = (): NfoColors => {
    const cs = getComputedStyle(document.documentElement);
    const g = (name: string, fallback: string) => cs.getPropertyValue(name).trim() || fallback;
    return {
      ink1: g('--nfo-ink-1', '#1a1c1e'),
      ink3: g('--nfo-ink-3', '#878a8f'),
      border: g('--nfo-border-faint', '#c9cbcd'),
      accent: g('--nfo-accent', '#da532c'),
      info: g('--nfo-info', '#2e6098'),
      ok: g('--nfo-ok', '#3d7a4f'),
      warn: g('--nfo-warn', '#b57a1f'),
    };
  };
  const [colors, setColors] = useState<NfoColors>(read);
  useEffect(() => {
    const obs = new MutationObserver(() => setColors(read()));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => obs.disconnect();
  }, []);
  return colors;
}
