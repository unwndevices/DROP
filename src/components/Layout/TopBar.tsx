import React from 'react';
import { Settings, Sun, Moon, MonitorCog } from 'lucide-react';
import { VISIBLE_TOOLS, type ToolEntry } from '../../tools/registry';
import { useSettings } from '../../contexts/SettingsContext';
import type { ThemeMode } from '../../types/settings';
import './TopBar.css';

interface TopBarProps {
  activeToolId: string;
  onSelectTool: (tool: ToolEntry) => void;
  onOpenSettings: () => void;
  /** Optional slot for the device-status indicator (wired in phase 2). */
  statusSlot?: React.ReactNode;
}

const NEXT_MODE: Record<ThemeMode, ThemeMode> = {
  system: 'light',
  light: 'dark',
  dark: 'system',
};

const MODE_LABEL: Record<ThemeMode, string> = {
  system: 'theme: system',
  light: 'theme: light',
  dark: 'theme: dark',
};

export const TopBar: React.FC<TopBarProps> = ({
  activeToolId,
  onSelectTool,
  onOpenSettings,
  statusSlot,
}) => {
  const { settings, updateSettings } = useSettings();
  const mode = settings.theme.mode;
  const cycleTheme = () =>
    updateSettings({ theme: { ...settings.theme, mode: NEXT_MODE[mode] } });
  const ThemeIcon = mode === 'light' ? Sun : mode === 'dark' ? Moon : MonitorCog;
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
        <div className="nfo-topbar__status">{statusSlot}</div>
        <button
          type="button"
          className="nfo-topbar__icon-btn"
          onClick={cycleTheme}
          aria-label={MODE_LABEL[mode]}
          title={MODE_LABEL[mode]}
        >
          <ThemeIcon size={14} strokeWidth={1.5} />
        </button>
        <button
          type="button"
          className="nfo-topbar__icon-btn"
          onClick={onOpenSettings}
          aria-label="settings"
          title="settings"
        >
          <Settings size={14} strokeWidth={1.5} />
        </button>
      </div>
    </header>
  );
};
