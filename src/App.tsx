import { useCallback, useState } from 'react';
import { TopBar } from './components/Layout/TopBar';
import {
  ACTIVE_TOOL_STORAGE_KEY,
  resolveActiveTool,
  type ToolEntry,
} from './tools/registry';
import { ToastProvider } from './design-system';
import './styles/globals.css';

const AppContent: React.FC = () => {
  const [activeTool, setActiveTool] = useState<ToolEntry>(() =>
    resolveActiveTool(localStorage.getItem(ACTIVE_TOOL_STORAGE_KEY)),
  );

  const handleToolChange = useCallback((tool: ToolEntry) => {
    setActiveTool(tool);
    localStorage.setItem(ACTIVE_TOOL_STORAGE_KEY, tool.id);
  }, []);

  const ActiveToolComponent = activeTool.component;

  return (
    <div className="drop-app">
      <TopBar
        activeToolId={activeTool.id}
        onSelectTool={handleToolChange}
      />

      <main className="tool-container">
        <ActiveToolComponent />
      </main>
    </div>
  );
};

function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
}

export default App;
