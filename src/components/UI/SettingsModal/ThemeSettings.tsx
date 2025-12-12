import React from 'react';
import { useSettings } from '../../../contexts/SettingsContext';
import type { ThemeName } from '../../../types/settings';

const themeOptions: { value: ThemeName; label: string; description: string }[] = [
  { value: 'gruvbox', label: 'Gruvbox', description: 'Retro groove with warm colors' },
  { value: 'rose-pine', label: 'Rose Pine', description: 'All natural pine, faux fur and a bit of soho vibes' },
  { value: 'catppuccin', label: 'Catppuccin', description: 'Soothing pastel theme for the high-spirited' },
  { value: 'nord', label: 'Nord', description: 'Arctic, north-bluish color palette' },
  { value: 'rose-pine-dawn', label: 'Rose Pine Dawn', description: 'Light variant of Rose Pine with warm dawn colors' },
  { value: 'jellyfish', label: 'Jellyfish', description: 'Deep purple ocean vibes with glowing accents' },
  { value: 'aura', label: 'Aura', description: 'Dark mystical theme with purple magic' },
  { value: 'dobri', label: 'Dobri', description: 'Clean dark theme with vibrant green accents' },
  { value: 'cute-pink-light', label: 'Cute Pink Light', description: 'Adorable light theme with soft pink tones' },
];

export const ThemeSettings: React.FC = () => {
  const { settings, updateSettings } = useSettings();

  const handleThemeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newTheme = e.target.value as ThemeName;
    updateSettings({
      theme: {
        name: newTheme
      }
    });
  };

  return (
    <div className="theme-settings">
      <div className="settings-control">
        <div className="settings-control-label">
          <div className="settings-control-title">Theme</div>
          <div className="settings-control-description">
            Choose from carefully crafted color schemes
          </div>
        </div>
        <div className="settings-control-input">
          <select
            value={settings.theme.name}
            onChange={handleThemeChange}
            className="input select"
            title="Select theme"
            aria-label="Theme selector"
          >
            {themeOptions.map((theme) => (
              <option key={theme.value} value={theme.value}>
                {theme.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="theme-preview">
        <div className="settings-control-label">
          <div className="settings-control-title">Preview</div>
          <div className="settings-control-description">
            {themeOptions.find(t => t.value === settings.theme.name)?.description}
          </div>
        </div>
      </div>

      <div className="settings-control">
        <div className="settings-control-label">
          <div className="settings-control-title">Retro Effects</div>
          <div className="settings-control-description">
            CRT & Scanline intensity (Off - Low - Medium - High)
          </div>
        </div>
        <div className="settings-control-input">
          <div className="radio-group" style={{ display: 'flex' }}>
            {([
              { label: 'OFF', value: 0 },
              { label: 'LO', value: 1 },
              { label: 'MD', value: 2 },
              { label: 'HI', value: 3 }
            ] as const).map((option, index, arr) => (
              <label
                key={option.label}
                className={`btn btn-sm ${settings.retro.intensity === option.value ? 'btn-primary' : 'btn-ghost'}`}
                style={{
                  minWidth: '3rem',
                  cursor: 'pointer',
                  borderRadius: index === 0 ? 'var(--radius-sm) 0 0 var(--radius-sm)' :
                    index === arr.length - 1 ? '0 var(--radius-sm) var(--radius-sm) 0' :
                      '0',
                  border: settings.retro.intensity === option.value ? undefined : '1px solid var(--border-color)',
                  borderLeft: index > 0 && settings.retro.intensity !== option.value ? 'none' : undefined,
                  // Ensure selected item overlaps borders
                  zIndex: settings.retro.intensity === option.value ? 1 : 0,
                  marginLeft: index > 0 ? '-1px' : 0
                }}
              >
                <input
                  type="radio"
                  name="retro-intensity"
                  className="hidden"
                  value={option.value}
                  checked={settings.retro.intensity === option.value}
                  onChange={() => updateSettings({ retro: { intensity: option.value } })}
                  style={{ display: 'none' }}
                />
                {option.label}
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};