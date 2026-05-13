import React, { useMemo } from 'react';
import { marked } from 'marked';
import type { Release } from './releases';
import './ReleaseNotes.css';

export interface ReleaseNotesProps {
  release: Release | undefined;
}

export const ReleaseNotes: React.FC<ReleaseNotesProps> = ({ release }) => {
  const html = useMemo(() => {
    if (!release || release.changelog.length === 0) return '';
    return marked.parse(release.changelog.join('\n\n')) as string;
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
