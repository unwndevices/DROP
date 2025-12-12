import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { Settings, SettingsContextType } from '../types/settings';
import { defaultSettings as defaultSettingsValue } from '../types/settings';
import { applyTheme } from '../utils/colorUtils';

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

interface SettingsProviderProps {
  children: ReactNode;
}

export const SettingsProvider: React.FC<SettingsProviderProps> = ({ children }) => {
  const [settings, setSettings] = useState<Settings>(defaultSettingsValue);

  // Load settings from localStorage on mount
  useEffect(() => {
    try {
      const savedSettings = localStorage.getItem('drop-settings');
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        // Merge with defaults to handle new settings additions
        const mergedSettings = {
          ...defaultSettingsValue,
          ...parsed,
          layout: { ...defaultSettingsValue.layout, ...parsed.layout },
          theme: { ...defaultSettingsValue.theme, ...parsed.theme },
          retro: { ...defaultSettingsValue.retro, ...parsed.retro }
        };
        setSettings(mergedSettings);

        // Apply theme immediately after loading from localStorage
        applyTheme(mergedSettings.theme.name);
      } else {
        // Apply default theme if no saved settings
        applyTheme(defaultSettingsValue.theme.name);
      }
    } catch (error) {
      console.warn('DROP: Failed to load settings from localStorage:', error);
      // Apply default theme on error
      applyTheme(defaultSettingsValue.theme.name);
    }
  }, []);

  const updateSettings = (newSettings: Partial<Settings>) => {
    const updatedSettings = {
      ...settings,
      ...newSettings,
      layout: { ...settings.layout, ...newSettings.layout },
      theme: { ...settings.theme, ...newSettings.theme },
      retro: { ...settings.retro, ...newSettings.retro }
    };

    setSettings(updatedSettings);

    // Apply theme immediately when theme settings change
    if (newSettings.theme) {
      applyTheme(updatedSettings.theme.name);
    }

    // Save to localStorage
    try {
      localStorage.setItem('drop-settings', JSON.stringify(updatedSettings));
    } catch (error) {
      console.warn('DROP: Failed to save settings to localStorage:', error);
    }
  };

  const resetSettings = () => {
    setSettings(defaultSettingsValue);

    // Clear localStorage
    try {
      localStorage.removeItem('drop-settings');
    } catch (error) {
      console.warn('DROP: Failed to clear settings from localStorage:', error);
    }

    // Apply default theme
    applyTheme(defaultSettingsValue.theme.name);
  };

  const contextValue: SettingsContextType = {
    settings,
    updateSettings,
    resetSettings
  };

  return (
    <SettingsContext.Provider value={contextValue}>
      {children}
    </SettingsContext.Provider>
  );
};

// Custom hook to use settings context
export const useSettings = (): SettingsContextType => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}; 