import { useState, useCallback, useEffect } from 'react';
import { SettingsModal } from './components/UI/SettingsModal';
import { PWAStatus } from './components/UI/PWAStatus';
import { TopBar } from './components/Layout/TopBar';
import { SettingsProvider, useSettings } from './contexts/SettingsContext';
import { DeviceStatusProvider } from './contexts/DeviceStatusContext';
import { DeviceStatusIndicator } from './components/Layout/DeviceStatusIndicator';
import {
  ACTIVE_TOOL_STORAGE_KEY,
  resolveActiveTool,
  type ToolEntry,
} from './tools/registry';
import { ToastProvider } from './design-system';

import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { pwaService } from './services/PWAService';
import './styles/globals.css';

const AppContent: React.FC = () => {
  const { settings, updateSettings } = useSettings();
  const [activeTool, setActiveTool] = useState<ToolEntry>(() =>
    resolveActiveTool(localStorage.getItem(ACTIVE_TOOL_STORAGE_KEY)),
  );
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const handleToolChange = useCallback((tool: ToolEntry) => {
    setActiveTool(tool);
    localStorage.setItem(ACTIVE_TOOL_STORAGE_KEY, tool.id);
  }, []);

  useEffect(() => {
    pwaService.initialize().catch((error) => {
      console.error('DROP: PWA initialization failed:', error);
    });
  }, []);

  const handleSettings = useCallback(() => setIsSettingsOpen(true), []);
  const handleCloseSettings = useCallback(() => setIsSettingsOpen(false), []);

  const handleToggleBiggerEditor = useCallback(() => {
    updateSettings({
      layout: {
        ...settings.layout,
        biggerEditor: !settings.layout.biggerEditor,
      },
    });
  }, [settings.layout, updateSettings]);

  useKeyboardShortcuts({
    onToggleBiggerEditor: handleToggleBiggerEditor,
    onEscape: () => {
      if (isSettingsOpen) handleCloseSettings();
    },
    onSave: () => {},
    onLoad: () => {},
    onExecute: () => {},
  });

  const ActiveToolComponent = activeTool.component;

  return (
    <div className="drop-app">
      <TopBar
        activeToolId={activeTool.id}
        onSelectTool={handleToolChange}
        onOpenSettings={handleSettings}
        statusSlot={<DeviceStatusIndicator />}
      />

      <main className="tool-container">
        <ActiveToolComponent />
      </main>

      <SettingsModal isOpen={isSettingsOpen} onClose={handleCloseSettings} />

      <PWAStatus />
    </div>
  );
};

function App() {
  return (
    <SettingsProvider>
      <DeviceStatusProvider>
        <ToastProvider>
          <AppContent />
        </ToastProvider>
      </DeviceStatusProvider>
    </SettingsProvider>
  );
}

export default App;
