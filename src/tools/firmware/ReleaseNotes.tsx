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

/**
 * Section labels arrive as standalone bold lines (e.g. `**New Features**`),
 * which marked would render as an inline `<strong>` buried in a paragraph.
 * Promote them to real `#### ` headings so they read as section titles.
 */
function promoteSectionHeadings(lines: string[]): string[] {
  return lines.map((line) => {
    const m = line.trim().match(/^\*\*(.+?)\*\*$/);
    return m ? `#### ${m[1]}` : line;
  });
}

/** Format an ISO `YYYY-MM-DD` date without tripping over timezones. */
function formatReleaseDate(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return iso;
  const months = [
    'january', 'february', 'march', 'april', 'may', 'june',
    'july', 'august', 'september', 'october', 'november', 'december',
  ];
  const [, year, month, day] = m;
  const name = months[Number(month) - 1];
  if (!name) return iso;
  return `${name} ${Number(day)}, ${year}`;
}

export const ReleaseNotes: React.FC<ReleaseNotesProps> = ({ release }) => {
  const { titleHtml, bodyHtml } = useMemo(() => {
    if (!release || release.changelog.length === 0) return { titleHtml: '', bodyHtml: '' };
    const lines = stripTechnicalDetails(release.changelog);
    if (lines.length === 0) return { titleHtml: '', bodyHtml: '' };
    // The first changelog line is the release title heading; keep it apart so
    // the release date can slot in directly beneath it.
    const [title, ...rest] = lines;
    return {
      titleHtml: marked.parse(title) as string,
      bodyHtml: marked.parse(promoteSectionHeadings(rest).join('\n\n')) as string,
    };
  }, [release]);

  if (!release) {
    return <div className="firmware-notes firmware-notes--empty">no release selected.</div>;
  }
  if (!titleHtml && !bodyHtml) {
    return <div className="firmware-notes firmware-notes--empty">no release notes.</div>;
  }

  const dateLabel = release.releaseDate ? formatReleaseDate(release.releaseDate) : '';

  return (
    <div className="firmware-notes">
      {/* marked output is rendered as-is from the canonical unwn_fw feed */}
      <div dangerouslySetInnerHTML={{ __html: titleHtml }} />
      {dateLabel && <div className="firmware-notes__date">{dateLabel}</div>}
      <div dangerouslySetInnerHTML={{ __html: bodyHtml }} />
    </div>
  );
};
