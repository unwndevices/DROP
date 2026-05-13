import React from 'react';
import { StatusBadge } from '../../../design-system';
import type { Release } from '../releases';
import type { FirmwareTarget } from '../Firmware';
import './DownloadPanel.css';

export interface DownloadPanelProps {
  target: FirmwareTarget;
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
function daisyFilename(): string {
  return 'firmware.bin';
}
function espFilename(version: string): string {
  return `eisei-${stripV(version)}.esp`;
}

export const DownloadPanel: React.FC<DownloadPanelProps> = ({
  target,
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
  const showDaisy = target === 'daisy' || target === 'both';
  const showEsp = target === 'esp32' || target === 'both';
  const daisyUrl =
    useDaisyDebug && daisyDebugAvailable
      ? release.platforms.daisy_debug!
      : release.platforms.daisy;

  return (
    <div className="download-panel">
      <StatusBadge kind="info">
        save each file to the microsd root. one click per file — no zip, no
        auto-trigger.
      </StatusBadge>

      {showDaisy && daisyDebugAvailable && (
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
        {showDaisy && (
          <DownloadRow
            label={`daisy${useDaisyDebug && daisyDebugAvailable ? ' (debug)' : ''}`}
            url={daisyUrl}
            filename={daisyFilename()}
          />
        )}
        {showEsp && (
          <DownloadRow
            label="esp32"
            url={release.platforms.esp32}
            filename={espFilename(release.version)}
          />
        )}
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
    <span className="download-row__bracket">[</span>
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
    <span className="download-row__bracket">]</span>
  </li>
);
