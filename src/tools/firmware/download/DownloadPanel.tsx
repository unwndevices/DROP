import React, { useState } from 'react';
import { StatusBadge } from '../../../design-system';
import type { Release } from '../releases';
import './DownloadPanel.css';

export interface DownloadPanelProps {
  release: Release | undefined;
  useDaisyDebug: boolean;
  onToggleDaisyDebug: (next: boolean) => void;
}

const stripV = (v: string) => v.replace(/^v/i, '');

/**
 * microSD filename conventions:
 * - Daisy: `firmware.bin` (Daisy bootloader auto-flashes from SD root)
 * - ESP32: `eisei-X.Y.Z.esp` (Daisy scans + forwards over UART)
 */
const daisyFilename = (): string => 'firmware.bin';
const espFilename = (version: string): string => `eisei-${stripV(version)}.esp`;

/**
 * Cross-origin <a download> is ignored by browsers — GitHub raw URLs would
 * save under the source filename, not our microSD-conventional name. Fetch
 * the binary into a same-origin blob and trigger the save from there so
 * the `download` attribute is honoured.
 */
async function saveBlobAs(url: string, filename: string): Promise<void> {
  const res = await fetch(url, { mode: 'cors' });
  if (!res.ok) throw new Error(`fetch failed: ${res.status} ${res.statusText}`);
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = objectUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoke after a tick so Safari has time to start the download.
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}

export const DownloadPanel: React.FC<DownloadPanelProps> = ({
  release,
  useDaisyDebug,
  onToggleDaisyDebug,
}) => {
  if (!release) {
    return (
      <div className="download-panel">
        <StatusBadge kind="warn">no version selected</StatusBadge>
      </div>
    );
  }

  const daisyDebugAvailable = Boolean(release.platforms.daisy_debug);
  const daisyUrl =
    useDaisyDebug && daisyDebugAvailable
      ? release.platforms.daisy_debug!
      : release.platforms.daisy;

  return (
    <div className="download-panel">
      <p className="download-panel__hint">
        no power needed — pull the microsd from the module's back, copy both
        files to the root, reinsert. one click per file, no zip.
      </p>

      {daisyDebugAvailable && (
        <label className="download-panel__variant">
          <input
            type="checkbox"
            checked={useDaisyDebug}
            onChange={(e) => onToggleDaisyDebug(e.target.checked)}
          />
          <span>use daisy debug build</span>
        </label>
      )}

      <ul className="download-panel__list">
        <DownloadRow
          label={`daisy${useDaisyDebug && daisyDebugAvailable ? ' (debug)' : ''}`}
          url={daisyUrl}
          filename={daisyFilename()}
        />
        <DownloadRow
          label="esp32"
          url={release.platforms.esp32}
          filename={espFilename(release.version)}
        />
      </ul>
    </div>
  );
};

const DownloadRow: React.FC<{ label: string; url: string; filename: string }> = ({
  label,
  url,
  filename,
}) => {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await saveBlobAs(url, filename);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'download failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <li className="download-row">
      <span className="download-row__label">{label}</span>
      <span className="download-row__arrow" aria-hidden="true">→</span>
      <a
        className="download-row__link"
        href={url}
        onClick={onClick}
        aria-busy={busy}
      >
        {busy ? 'saving…' : filename}
      </a>
      {error && <StatusBadge kind="err">{error}</StatusBadge>}
    </li>
  );
};
