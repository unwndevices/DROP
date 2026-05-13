import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { VISIBLE_TOOLS, type ToolEntry } from '../../tools/registry';
import { useTheme } from '../../hooks/useTheme';
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
  const ThemeIcon = mode === 'light' ? Moon : Sun;
  const nextLabel = mode === 'light' ? 'switch to dark' : 'switch to light';

  return (
    <header className="nfo-topbar" role="banner">
      <div className="nfo-topbar__brand">
        <span className="nfo-topbar__wordmark">unwn</span>
        <span className="nfo-topbar__divider" aria-hidden="true">/</span>
        <span className="nfo-topbar__product">drop</span>
      </div>

      <nav className="nfo-topbar__tabs" role="tablist" aria-label="tools">
        {VISIBLE_TOOLS.map((tool) => {
          const selected = tool.id === activeToolId;
          return (
            <button
              key={tool.id}
              type="button"
              role="tab"
              aria-selected={selected}
              className={`nfo-topbar__tab${selected ? ' is-active' : ''}`}
              onClick={() => onSelectTool(tool)}
              title={tool.description}
            >
              {tool.label}
            </button>
          );
        })}
      </nav>

      <div className="nfo-topbar__actions">
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
