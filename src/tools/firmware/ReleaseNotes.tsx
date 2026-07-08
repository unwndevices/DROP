import React, { useMemo } from 'react';
import { marked } from 'marked';
import type { Release } from './releases';
import './ReleaseNotes.css';

export interface ReleaseNotesProps {
  release: Release | undefined;
}

/**
 * The build pipeline appends a trailing "Technical Details" block (commit
 * hash, build date) behind a `---` separator — build metadata, not user-facing
 * release notes, so drop it before rendering.
 */
function stripTechnicalDetails(lines: string[]): string[] {
  const idx = lines.findIndex((l) => l.trim() === '**Technical Details**');
  if (idx === -1) return lines;
  const start = idx > 0 && lines[idx - 1].trim() === '---' ? idx - 1 : idx;
  return lines.slice(0, start);
}

export const ReleaseNotes: React.FC<ReleaseNotesProps> = ({ release }) => {
  const html = useMemo(() => {
    if (!release || release.changelog.length === 0) return '';
    const lines = stripTechnicalDetails(release.changelog);
    if (lines.length === 0) return '';
    return marked.parse(lines.join('\n\n')) as string;
  }, [release]);

  if (!release) {
    return <div className="firmware-notes firmware-notes--empty">no release selected.</div>;
  }
  if (!html) {
    return <div className="firmware-notes firmware-notes--empty">no release notes.</div>;
  }

  return (
    <div
      className="firmware-notes"
      // marked output is rendered as-is from the canonical unwn_fw feed
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};
