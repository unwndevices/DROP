export interface LayoutSettings {
    flipUI: boolean;
    biggerEditor: boolean;
}

export type ThemeName = 'rose-pine' | 'catppuccin' | 'gruvbox' | 'nord' | 'rose-pine-dawn' | 'jellyfish' | 'aura' | 'dobri' | 'cute-pink-light';

export interface ThemeSettings {
    name: ThemeName;
}

export interface RetroSettings {
    intensity: 0 | 1 | 2 | 3;
}

export interface Settings {
    layout: LayoutSettings;
    theme: ThemeSettings;
    retro: RetroSettings;
}

export interface SettingsContextType {
    settings: Settings;
    updateSettings: (newSettings: Partial<Settings>) => void;
    resetSettings: () => void;
}

export const defaultSettings: Settings = {
    layout: {
        flipUI: false,
        biggerEditor: false,
    },
    theme: {
        name: 'rose-pine',
    },
    retro: {
        intensity: 1,
    }
}; 