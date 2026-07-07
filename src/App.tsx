import { useCallback, useState } from 'react';
import { TopBar } from './components/Layout/TopBar';
import {
  ACTIVE_TOOL_STORAGE_KEY,
  resolveActiveTool,
  VISIBLE_TOOLS,
  type ToolEntry,
} from './tools/registry';
import { useBetaUnlock } from './hooks/useBetaUnlock';
import { ToastProvider } from './design-system';
import './styles/globals.css';

const AppContent: React.FC = () => {
  const unlocked = useBetaUnlock();
  const [activeTool, setActiveTool] = useState<ToolEntry>(() =>
    resolveActiveTool(localStorage.getItem(ACTIVE_TOOL_STORAGE_KEY)),
  );

  const handleToolChange = useCallback((tool: ToolEntry) => {
    setActiveTool(tool);
    localStorage.setItem(ACTIVE_TOOL_STORAGE_KEY, tool.id);
  }, []);

  // A beta-gated tool (e.g. debug) must not render while locked, even if it
  // was the persisted selection — fall back to the default tool instead.
  const effectiveTool =
    activeTool.beta && !unlocked ? VISIBLE_TOOLS[0] : activeTool;
  const ActiveToolComponent = effectiveTool.component;

  return (
    <div className="drop-app">
      <TopBar
        activeToolId={effectiveTool.id}
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
