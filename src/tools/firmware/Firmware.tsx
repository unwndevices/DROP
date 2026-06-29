import React, { useEffect, useMemo, useRef, useState } from 'react';
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

const BETA_UNLOCK_KEY = 'drop-firmware-show-betas';

/** Whether the hidden beta gesture was unlocked in a previous session. */
function readBetaUnlock(): boolean {
  try {
    return localStorage.getItem(BETA_UNLOCK_KEY) === '1';
  } catch {
    return false;
  }
}

export const Firmware: React.FC = () => {
  const { releases, latestId, loading, error, fromCache, refresh } = useReleases();
  const [showBetas, setShowBetas] = useState<boolean>(readBetaUnlock);
  const [selectedVersion, setSelectedVersion] = useState<string>('');

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

    const preferLatest = latestId
      ? visibleReleases.find((r) => r.version === latestId)
      : undefined;
    const pick = preferLatest ?? latestStable(visibleReleases) ?? visibleReleases[0];
    setSelectedVersion(pick.version);
  }, [visibleReleases, latestId, selectedVersion]);

  // On beta unlock, jump to the newest build — the latest release is a beta.
  const prevShowBetas = useRef(showBetas);
  useEffect(() => {
    if (showBetas && !prevShowBetas.current) {
      const latest = latestId
        ? visibleReleases.find((r) => r.version === latestId)
        : undefined;
      if (latest) setSelectedVersion(latest.version);
    }
    prevShowBetas.current = showBetas;
  }, [showBetas, visibleReleases, latestId]);

  // Hidden gesture: type "beta" to reveal (or hide) pre-release builds. Keeps
  // the toggle out of the end-user UI while letting us dogfood betas via Drop.
  useEffect(() => {
    const secret = 'beta';
    let buffer = '';
    const onKeyDown = (e: KeyboardEvent) => {
      // Ignore keystrokes aimed at form controls (the select swallows them).
      const tag = (e.target as HTMLElement | null)?.tagName ?? '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key.length !== 1) return;
      buffer = (buffer + e.key.toLowerCase()).slice(-secret.length);
      if (buffer === secret) setShowBetas((v) => !v);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Remember the unlock across sessions so the gesture is one-and-done.
  useEffect(() => {
    try {
      if (showBetas) localStorage.setItem(BETA_UNLOCK_KEY, '1');
      else localStorage.removeItem(BETA_UNLOCK_KEY);
    } catch {
      // ignore quota / privacy errors
    }
  }, [showBetas]);

  const selectedRelease: Release | undefined = useMemo(
    () => visibleReleases.find((r) => r.version === selectedVersion),
    [visibleReleases, selectedVersion],
  );

  return (
    <div className="firmware-tool">
      <div className="firmware-tool__grid">
        <section className="firmware-section firmware-section--version">
          <SectionLabel>version</SectionLabel>

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
            <SectionLabel>download for microsd</SectionLabel>
            <DownloadPanel release={selectedRelease} />
          </section>

          <details className="firmware-section firmware-section--collapsible">
            <summary>
              <SectionLabel>flash esp32 (serial)</SectionLabel>
            </summary>
            <Esp32FlashSection
              release={selectedRelease}
              busy={daisyBusy}
              onBusyChange={setEspBusy}
            />
          </details>

          <details className="firmware-section firmware-section--collapsible">
            <summary>
              <SectionLabel>flash daisy (dfu) — fallback</SectionLabel>
            </summary>
            <DaisyFlashSection
              release={selectedRelease}
              busy={espBusy}
              onBusyChange={setDaisyBusy}
            />
          </details>
        </div>
      </div>
    </div>
  );
};
