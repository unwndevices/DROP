import React, { useEffect, useMemo, useState } from 'react';
import { SectionLabel, Segmented, StatusBadge } from '../../design-system';
import {
  filterReleases,
  isBeta,
  latestStable,
  useReleases,
  type Release,
} from './releases';
import { ReleaseNotes } from './ReleaseNotes';
import { FlashPanel } from './flash/FlashPanel';
import { DownloadPanel } from './download/DownloadPanel';
import './Firmware.css';

export type FirmwareMode = 'flash' | 'download';
export type FirmwareTarget = 'daisy' | 'esp32' | 'both';

const MODE_OPTIONS: { value: FirmwareMode; label: string }[] = [
  { value: 'flash', label: 'flash' },
  { value: 'download', label: 'download' },
];

const TARGET_OPTIONS: { value: FirmwareTarget; label: string }[] = [
  { value: 'daisy', label: 'daisy' },
  { value: 'esp32', label: 'esp32' },
  { value: 'both', label: 'both' },
];

export const Firmware: React.FC = () => {
  const { releases, latestId, loading, error, fromCache, refresh } = useReleases();
  const [mode, setMode] = useState<FirmwareMode>('flash');
  const [target, setTarget] = useState<FirmwareTarget>('daisy');
  const [showBetas, setShowBetas] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<string>('');
  const [useDaisyDebug, setUseDaisyDebug] = useState(false);

  const visibleReleases = useMemo(
    () => filterReleases(releases, { showBetas }),
    [releases, showBetas],
  );

  useEffect(() => {
    if (visibleReleases.length === 0) {
      if (selectedVersion !== '') setSelectedVersion('');
      return;
    }
    const stillVisible = visibleReleases.some((r) => r.version === selectedVersion);
    if (stillVisible) return;

    const preferLatest =
      latestId && visibleReleases.find((r) => r.version === latestId);
    const pick = preferLatest ?? latestStable(visibleReleases) ?? visibleReleases[0];
    setSelectedVersion(pick.version);
  }, [visibleReleases, latestId, selectedVersion]);

  const selectedRelease: Release | undefined = useMemo(
    () => visibleReleases.find((r) => r.version === selectedVersion),
    [visibleReleases, selectedVersion],
  );

  return (
    <div className="firmware-tool">
      <header className="firmware-tool__header">
        <h1 className="firmware-tool__title">
          <span className="firmware-tool__bracket">[</span>
          <span>firmware</span>
          <span className="firmware-tool__bracket">]</span>
        </h1>
        <Segmented<FirmwareMode>
          options={MODE_OPTIONS}
          value={mode}
          onChange={setMode}
          ariaLabel="firmware mode"
        />
      </header>

      <section className="firmware-section">
        <SectionLabel index={1}>target</SectionLabel>
        <Segmented<FirmwareTarget>
          options={TARGET_OPTIONS}
          value={target}
          onChange={setTarget}
          ariaLabel="firmware target"
        />
      </section>

      <section className="firmware-section">
        <SectionLabel index={2}>version</SectionLabel>

        <div className="firmware-version">
          <span className="firmware-version__prompt" aria-hidden="true">›</span>
          <select
            className="firmware-version__select"
            value={selectedVersion}
            onChange={(e) => setSelectedVersion(e.target.value)}
            disabled={loading || visibleReleases.length === 0}
            aria-label="firmware version"
          >
            {visibleReleases.length === 0 && (
              <option value="">{loading ? 'loading…' : 'no versions'}</option>
            )}
            {visibleReleases.map((r) => {
              const beta = isBeta(r.version);
              const tagLatest = r.version === latestId ? '  (latest)' : '';
              const tagBeta = beta ? '  [BETA]' : '';
              return (
                <option key={r.version} value={r.version}>
                  {r.version}{tagLatest}{tagBeta}
                </option>
              );
            })}
          </select>

          <label className="firmware-version__beta">
            <input
              type="checkbox"
              checked={showBetas}
              onChange={(e) => setShowBetas(e.target.checked)}
            />
            <span>show betas</span>
          </label>
        </div>

        <div className="firmware-version__meta">
          {error && <StatusBadge kind="err">{error}</StatusBadge>}
          {!error && fromCache && (
            <StatusBadge kind="info">cached releases.json</StatusBadge>
          )}
          {!error && !loading && (
            <button
              type="button"
              className="firmware-version__refresh"
              onClick={() => void refresh()}
            >
              refresh
            </button>
          )}
        </div>

        <ReleaseNotes release={selectedRelease} />
      </section>

      <section className="firmware-section">
        <SectionLabel index={3}>action</SectionLabel>
        {mode === 'flash' ? (
          <FlashPanel target={target} release={selectedRelease} />
        ) : (
          <DownloadPanel
            target={target}
            release={selectedRelease}
            useDaisyDebug={useDaisyDebug}
            onToggleDaisyDebug={setUseDaisyDebug}
          />
        )}
      </section>
    </div>
  );
};
