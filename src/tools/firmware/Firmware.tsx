import React, { useEffect, useMemo, useState } from 'react';
import { SectionLabel, StatusBadge } from '../../design-system';
import {
  filterReleases,
  isBeta,
  latestStable,
  useReleases,
  type Release,
} from './releases';
import { ReleaseNotes } from './ReleaseNotes';
import { DaisyFlashSection, Esp32FlashSection } from './flash/FlashSection';
import { DownloadPanel } from './download/DownloadPanel';
import './Firmware.css';

export const Firmware: React.FC = () => {
  const { releases, latestId, loading, error, fromCache, refresh } = useReleases();
  const [showBetas, setShowBetas] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<string>('');
  const [useDaisyDebug, setUseDaisyDebug] = useState(false);

  // Track which section is mid-flash to lock the other.
  const [daisyBusy, setDaisyBusy] = useState(false);
  const [espBusy, setEspBusy] = useState(false);

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
        <h1 className="firmware-tool__title">firmware</h1>
      </header>

      <div className="firmware-tool__grid">
        <section className="firmware-section firmware-section--version">
          <SectionLabel index={1}>version</SectionLabel>

          <div className="firmware-version">
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
                const tagBeta = beta ? '  (beta)' : '';
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

          {(error || fromCache) && (
            <div className="firmware-version__meta">
              {error && <StatusBadge kind="err">{error}</StatusBadge>}
              {!error && fromCache && (
                <StatusBadge kind="info">cached releases.json</StatusBadge>
              )}
            </div>
          )}

          <ReleaseNotes release={selectedRelease} />
        </section>

        <div className="firmware-tool__column">
          <section className="firmware-section firmware-section--download">
            <SectionLabel index={2}>download for microsd</SectionLabel>
            <DownloadPanel
              release={selectedRelease}
              useDaisyDebug={useDaisyDebug}
              onToggleDaisyDebug={setUseDaisyDebug}
            />
          </section>

          <section className="firmware-section">
            <SectionLabel index={3}>flash esp32 (serial)</SectionLabel>
            <Esp32FlashSection
              release={selectedRelease}
              busy={daisyBusy}
              onBusyChange={setEspBusy}
            />
          </section>

          <section className="firmware-section">
            <SectionLabel index={4}>flash daisy (dfu) — fallback</SectionLabel>
            <DaisyFlashSection
              release={selectedRelease}
              busy={espBusy}
              onBusyChange={setDaisyBusy}
            />
          </section>
        </div>
      </div>
    </div>
  );
};
