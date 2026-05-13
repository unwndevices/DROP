import React from 'react';
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
        save each file to the microsd root. one click per file — no zip.
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
}) => (
  <li className="download-row">
    <span className="download-row__prompt" aria-hidden="true">›</span>
    <span className="download-row__label">{label}</span>
    <span className="download-row__arrow" aria-hidden="true">→</span>
    <a
      className="download-row__link"
      href={url}
      download={filename}
      rel="noopener noreferrer"
    >
      {filename}
    </a>
  </li>
);
