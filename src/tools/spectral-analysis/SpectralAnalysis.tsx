import React, { useState, useCallback, useEffect } from 'react';
import { FaDownload, FaFolderOpen } from 'react-icons/fa';
import { SimpleSpectrumChart } from '../../components/Visualizer/SimpleSpectrumChart';
import { luaService } from '../../services/LuaEngine/LuaService';
import { SpectralExportModal } from '../../components/Spectral';

import type { Datum } from '../../services/DataModel/types';

// Import design system components
import {
  ToolLayout,
  Button,
  Card,
  CardHeader,
  CardBody,
  StatusIndicator,
  Select,
  Input,
  SpectralEditor,
  Timeline
} from '../../design-system';

interface Template {
  name: string;
  description: string;
  getCode: () => string;
}

const templates: Template[] = [
  {
    name: 'Default Spectral',
    description: 'Frequency-based sine wave with bass boost',
    getCode: () => luaService.getDefaultTemplate()
  },
  {
    name: 'Simple Test',
    description: 'Basic test: band index pattern',
    getCode: () => luaService.getSimpleTestTemplate()
  },
  {
    name: 'Diagonal Test',
    description: 'Band i lights up at frame i',
    getCode: () => luaService.getDiagonalTestTemplate()
  },
  {
    name: 'Simple Sine Wave',
    description: 'Basic sine wave across all bands',
    getCode: () => luaService.getSineWaveTemplate()
  },
  {
    name: 'Frequency Response',
    description: 'Low-pass filter response curve',
    getCode: () => luaService.getFrequencyResponseTemplate()
  },
  {
    name: 'Exponential Decay',
    description: 'Exponential decay pattern across bands and frames',
    getCode: () => luaService.getExponentialDecayTemplate()
  },
  {
    name: 'Random Walk',
    description: 'Deterministic random walk pattern',
    getCode: () => luaService.getRandomWalkTemplate()
  }
];

export const SpectralAnalysis: React.FC = () => {
  const [spectralData, setSpectralData] = useState<Datum | null>(null);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [frameCount, setFrameCount] = useState(() => {
    try {
      const saved = localStorage.getItem('drop-spectral-settings');
      if (saved) {
        const settings = JSON.parse(saved);
        return settings.frameCount || 100;
      }
    } catch (error) {
      console.warn('Failed to load saved frameCount:', error);
    }
    return 100;
  });
  const [scriptContent, setScriptContent] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [errors, setErrors] = useState<Array<{ message: string; line?: number }>>([]);
  const [isPlaying, setIsPlaying] = useState(() => {
    try {
      const saved = localStorage.getItem('drop-spectral-settings');
      if (saved) {
        const settings = JSON.parse(saved);
        return settings.isPlaying || false;
      }
    } catch (error) {
      console.warn('Failed to load saved isPlaying:', error);
    }
    return false;
  });

  const executeLuaScript = useCallback(async (code?: string) => {
    const codeToExecute = code || scriptContent;
    if (!codeToExecute.trim()) {
      setErrors([{ message: 'Script cannot be empty', line: 1 }]);
      return;
    }

    setIsExecuting(true);
    setErrors([]);

    try {
      const result = await luaService.executeScript(codeToExecute, frameCount);

      if (result.success && result.datum) {
        const datum: Datum = {
          name: 'Generated Spectral Data',
          description: 'Generated from Lua script',
          frameCount: result.datum.frames.length,
          bandCount: 20,
          frames: result.datum.frames,
          sampleRate: 60,
          createdAt: new Date(),
          modifiedAt: new Date()
        };

        setSpectralData(datum);
        setCurrentFrame(0);
        console.log(`DROP: Lua execution successful in ${result.executionTime?.toFixed(2)}ms`);
      } else if (result.errors) {
        setErrors(result.errors);
        console.error('DROP: Lua execution failed:', result.errors);
      }

    } catch (error) {
      setErrors([{
        message: error instanceof Error ? error.message : 'Unknown execution error',
        line: 1,
      }]);
      console.error('DROP: Execution error:', error);
    } finally {
      setIsExecuting(false);
    }
  }, [scriptContent, frameCount]);

  // Initialize with saved script or default template
  useEffect(() => {
    // Try to load saved script first
    try {
      const saved = localStorage.getItem('drop-script');
      if (saved) {
        const scriptData = JSON.parse(saved);
        if (scriptData.content) {
          setScriptContent(scriptData.content);
          executeLuaScript(scriptData.content);
          console.log('DROP: Auto-loaded saved script from localStorage');
          return;
        }
      }
    } catch (error) {
      console.warn('DROP: Failed to load saved script:', error);
    }

    // Fall back to default template if no saved script
    const defaultScript = templates[0].getCode();
    setScriptContent(defaultScript);
    executeLuaScript(defaultScript);
  }, [executeLuaScript]);

  // Auto-save script content whenever it changes
  useEffect(() => {
    if (scriptContent) {
      const scriptData = {
        content: scriptContent,
        timestamp: new Date().toISOString()
      };
      localStorage.setItem('drop-script', JSON.stringify(scriptData));
    }
  }, [scriptContent]);

  // Auto-play effect
  useEffect(() => {
    if (!isPlaying || !spectralData?.frames || spectralData.frames.length === 0) return;

    const interval = setInterval(() => {
      setCurrentFrame((prev) => {
        const nextFrame = (prev + 1) % spectralData.frames.length;
        // Stop playing when we reach the end and loop back to start
        if (nextFrame === 0 && prev === spectralData.frames.length - 1) {
          setIsPlaying(false);
        }
        return nextFrame;
      });
    }, 100); // 10 FPS

    return () => clearInterval(interval);
  }, [isPlaying, spectralData?.frames]);

  // Auto-save settings whenever they change
  useEffect(() => {
    const settings = {
      currentFrame,
      frameCount,
      isPlaying,
      timestamp: new Date().toISOString()
    };
    localStorage.setItem('drop-spectral-settings', JSON.stringify(settings));
  }, [currentFrame, frameCount, isPlaying]);

  const handleTemplateSelect = useCallback((templateName: string) => {
    const template = templates.find(t => t.name === templateName);
    if (template) {
      const code = template.getCode();
      setScriptContent(code);
      executeLuaScript(code);
    }
  }, [executeLuaScript]);


  const handleLoadScript = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.lua,.txt';

    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const content = e.target?.result as string;
          if (content) {
            setScriptContent(content);
          }
        };
        reader.readAsText(file);
      }
    };

    input.click();
  }, []);

  const handleOpenExportModal = useCallback(() => {
    setIsExportModalOpen(true);
  }, []);

  // Create left panel (Code Editor & Templates)
  const leftPanel = (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Code Editor Controls */}
      <div style={{
        padding: 'var(--ds-spacing-sm)',
        borderBottom: '1px solid var(--ds-color-border-muted)',
        backgroundColor: 'var(--ds-color-background-secondary)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--ds-spacing-lg)' }}>
          <Input
            label="Frame Count"
            labelPosition="left"
            type="number"
            value={frameCount}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFrameCount(Math.max(1, parseInt(e.target.value) || 1))}
            min={1}
            max={10000}
            size="sm"
            style={{ width: '120px' }}
          />
          <Button
            variant="primary"
            onClick={() => executeLuaScript()}
            disabled={isExecuting}
          >
            {isExecuting ? 'Executing...' : 'Execute'}
          </Button>
          <Button
            variant="secondary"
            onClick={handleLoadScript}
            title="Load Script"
          >
            <FaFolderOpen />
          </Button>
          <Button
            variant="primary"
            onClick={handleOpenExportModal}
            title="Download"
          >
            <FaDownload />
          </Button>
        </div>
      </div>
      <div style={{ padding: 'var(--ds-spacing-sm)', borderBottom: '1px solid var(--ds-color-border-muted)' }}>
        <Select
          label="Templates"
          value=""
          size="md"
          onChange={(e) => handleTemplateSelect(e.target.value)}
          options={[
            { value: "", label: "Select a template..." },
            ...templates.map(t => ({ value: t.name, label: t.name }))
          ]}
          style={{ padding: 'var(--ds-spacing-sm)' }}
        />
      </div>

      <div style={{ flex: 1, padding: 'var(--ds-spacing-sm)', overflow: 'hidden' }}>
        <SpectralEditor
          value={scriptContent}
          onChange={setScriptContent}
          onExecute={() => executeLuaScript()}
          errors={errors}
        />
      </div>

      {errors.length > 0 && (
        <div style={{ padding: 'var(--ds-spacing-sm)', borderTop: '1px solid var(--ds-color-border-muted)' }}>
          {errors.map((error, index) => (
            <StatusIndicator key={index} variant="error" style={{ marginBottom: 'var(--ds-spacing-sm)' }}>
              {error.line && <span>Line {error.line}: </span>}
              {error.message}
            </StatusIndicator>
          ))}
        </div>
      )}
    </div>
  );

  // Create right panel (Visualization)
  const rightPanel = (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, padding: 'var(--ds-spacing-sm)', overflow: 'hidden' }}>
        <Card style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          <CardHeader>Spectral Visualization</CardHeader>
          <CardBody style={{ flex: 1, overflow: 'hidden' }}>
            <SimpleSpectrumChart
              frames={spectralData?.frames || []}
              currentFrame={currentFrame}
              onFrameChange={setCurrentFrame}
              showControls={false}
              className={`${spectralData ? '' : 'empty'} ${isExecuting ? 'loading' : ''}`}
            />
          </CardBody>
        </Card>
      </div>

      {/* Visualization Controls */}
      <Timeline
        currentFrame={currentFrame}
        totalFrames={spectralData?.frameCount || 0}
        isPlaying={isPlaying}
        onFrameChange={setCurrentFrame}
        onPlayToggle={() => setIsPlaying(!isPlaying)}
        disabled={!spectralData}
      />
    </div>
  );

  // Create status bar content
  const statusBar = (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
      <div style={{ display: 'flex', gap: 'var(--ds-spacing-lg)', alignItems: 'center' }}>
        <span>Spectral Analysis</span>
        {spectralData && (
          <span style={{ color: 'var(--ds-color-success)' }}>
            Generated: {spectralData.frameCount} frames × {spectralData.bandCount} bands
          </span>
        )}
        {isExecuting && (
          <span style={{ color: 'var(--ds-color-warning)' }}>Executing Lua script...</span>
        )}
        {errors.length > 0 && (
          <span style={{ color: 'var(--ds-color-error)' }}>{errors.length} error{errors.length !== 1 ? 's' : ''}</span>
        )}
      </div>
      <div>
        <span>Frame {currentFrame + 1} of {spectralData?.frameCount || 0}</span>
      </div>
    </div>
  );

  return (
    <>
      <ToolLayout
        panels={{
          left: leftPanel,
          right: rightPanel
        }}
        statusBar={statusBar}
      />

      <SpectralExportModal
        spectralData={spectralData}
        scriptContent={scriptContent}
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
      />
    </>
  );
};