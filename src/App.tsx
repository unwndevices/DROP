import { useState, useCallback, useEffect } from 'react';
import { Header } from './components/Layout/Header';
import { SettingsModal } from './components/UI/SettingsModal';
import { PWAStatus } from './components/UI/PWAStatus';
import { VerticalNavbar, DEFAULT_TOOLS, type Tool } from './components/Navigation/VerticalNavbar';
import { SettingsProvider, useSettings } from './contexts/SettingsContext';
import { SpectralAnalysis } from './tools/spectral-analysis/SpectralAnalysis';
import { DatumViewer } from './tools/datum-viewer/DatumViewer';
import { ESP32Flasher } from './tools/esp32-flasher/ESP32Flasher';
import { DaisyFlasher } from './tools/daisy-flasher/DaisyFlasher';
import { UIGraphicsConverter } from './tools/ui-graphics/UIGraphicsConverter';
import { DeviceBridge } from './tools/device-bridge/DeviceBridge';
import { PixelArtGenerator } from './tools/pixel-art-generator/PixelArtGenerator';

import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { pwaService } from './services/PWAService';
import { debugLuaGlobals } from './debug-lua-globals';
import './styles/globals.css';
import './components/Navigation/VerticalNavbar.css';
import './tools/esp32-flasher/ESP32Flasher.css';
import './tools/daisy-flasher/DaisyFlasher.css';
import './tools/device-bridge/DeviceBridge.css';

// Tools configuration
const TOOLS: Tool[] = [
  {
    ...DEFAULT_TOOLS[0],
    component: SpectralAnalysis
  },
  {
    ...DEFAULT_TOOLS[1],
    component: DatumViewer
  },
  {
    ...DEFAULT_TOOLS[2],
    component: ESP32Flasher
  },
  {
    ...DEFAULT_TOOLS[3],
    component: DaisyFlasher
  },
  {
    ...DEFAULT_TOOLS[4],
    component: UIGraphicsConverter
  },
  {
    ...DEFAULT_TOOLS[5],
    component: DeviceBridge
  },
  {
    ...DEFAULT_TOOLS[6],
    component: PixelArtGenerator
  }
];

// AppContent component that uses settings context
const AppContent: React.FC = () => {
  const { settings, updateSettings } = useSettings();
  const [activeTool, setActiveTool] = useState(() => {
    const savedToolId = localStorage.getItem('drop-active-tool');
    return TOOLS.find(tool => tool.id === savedToolId) || TOOLS[0];
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isNavbarVisible, setIsNavbarVisible] = useState(true);

  const handleToolChange = useCallback((tool: Tool) => {
    setActiveTool(tool);
    localStorage.setItem('drop-active-tool', tool.id);
  }, []);

  // Initialize PWA service
  useEffect(() => {
    pwaService.initialize().catch(error => {
      console.error('DROP: PWA initialization failed:', error);
    });

    // Export debug function to window for console testing
    (window as any).debugLuaGlobals = debugLuaGlobals;
  }, []);

  const handleSettings = useCallback(() => {
    setIsSettingsOpen(true);
  }, []);

  const handleCloseSettings = useCallback(() => {
    setIsSettingsOpen(false);
  }, []);

  const handleToggleNavbar = useCallback(() => {
    setIsNavbarVisible(prev => !prev);
  }, []);

  const handleToggleBiggerEditor = useCallback(() => {
    updateSettings({
      layout: {
        ...settings.layout,
        biggerEditor: !settings.layout.biggerEditor
      }
    });
  }, [settings.layout, updateSettings]);

  // Setup keyboard shortcuts
  useKeyboardShortcuts({
    onToggleBiggerEditor: handleToggleBiggerEditor,
    onEscape: () => {
      if (isSettingsOpen) {
        handleCloseSettings();
      }
    },
    onSave: () => { }, // Individual tools handle saving
    onLoad: () => { }, // Individual tools handle loading
    onExecute: () => { }, // Individual tools handle execution
  });

  const ActiveToolComponent = activeTool.component;

  return (
    <div className="drop-app">
      {isNavbarVisible && (
        <VerticalNavbar
          tools={TOOLS}
          activeTool={activeTool}
          onToolChange={handleToolChange}
        />
      )}

      <div className="app-with-navbar">
        <Header
          onSettings={handleSettings}
          onToolsToggle={handleToggleNavbar}
          isNavbarVisible={isNavbarVisible}
          toolName={activeTool.name}
          toolDescription={activeTool.description}
        />

        <main className="tool-container">
          <ActiveToolComponent />
        </main>
      </div>

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={handleCloseSettings}
      />

      <PWAStatus />
    </div>
  );
};

function App() {
  return (
    <SettingsProvider>
      <AppContent />
    </SettingsProvider>
  );
}

export default App;