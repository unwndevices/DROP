import React, { useMemo } from 'react';
import { Sun, Moon } from 'lucide-react';
import { VISIBLE_TOOLS, type ToolEntry } from '../../tools/registry';
import { useTheme } from '../../hooks/useTheme';
import { useReleases, latestStable, releaseTitle } from '../../tools/firmware/releases';
import './TopBar.css';

interface TopBarProps {
  activeToolId: string;
  onSelectTool: (tool: ToolEntry) => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  activeToolId,
  onSelectTool,
}) => {
  const { mode, toggle } = useTheme();
  const { releases } = useReleases();
  const ThemeIcon = mode === 'light' ? Moon : Sun;
  const nextLabel = mode === 'light' ? 'switch to dark' : 'switch to light';

  const marqueeText = useMemo(() => {
    const stable = latestStable(releases);
    if (!stable) return '';
    const title = releaseTitle(stable);
    return title ? `${stable.version} — ${title}` : stable.version;
  }, [releases]);

  return (
    <header className="nfo-topbar" role="banner">
      <div className="nfo-topbar__left">
        <div className="nfo-topbar__brand">
          <span className="nfo-topbar__wordmark">unwn</span>
          <span className="nfo-topbar__divider" aria-hidden="true">/</span>
          <span className="nfo-topbar__product">drop</span>
        </div>

        <div
          className="nfo-topbar__segmented"
          role="radiogroup"
          aria-label="tools"
        >
        {VISIBLE_TOOLS.map((tool) => {
          const selected = tool.id === activeToolId;
          return (
            <button
              key={tool.id}
              type="button"
              role="radio"
              aria-checked={selected}
              className={`nfo-topbar__seg${selected ? ' is-active' : ''}`}
              onClick={() => onSelectTool(tool)}
              title={tool.description}
            >
              {tool.label}
            </button>
          );
        })}
        </div>
      </div>

      <div className="nfo-topbar__actions">
        {marqueeText && (
          <div
            className="nfo-topbar__marquee"
            aria-label={`latest stable: ${marqueeText}`}
          >
            <div className="nfo-topbar__marquee-track">
              <span className="nfo-topbar__marquee-item">{marqueeText}</span>
              <span className="nfo-topbar__marquee-item" aria-hidden="true">{marqueeText}</span>
            </div>
          </div>
        )}
        <button
          type="button"
          className="nfo-topbar__icon-btn"
          onClick={toggle}
          aria-label={nextLabel}
          title={nextLabel}
        >
          <ThemeIcon size={16} strokeWidth={1.5} />
        </button>
      </div>
    </header>
  );
};
