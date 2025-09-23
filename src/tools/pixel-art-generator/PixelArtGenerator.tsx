import React, { useState, useCallback, useEffect } from 'react';
import { PixelArtPreview, PixelArtExportModal } from '../../components/PixelArt';
import { Enjin2PixelService } from '../../services/PixelArt/Enjin2PixelService';
import type { PixelArtFrame, PixelCanvas } from '../../services/PixelArt/LuaPixelService';
import type { LuaPixelService } from '../../services/PixelArt/LuaPixelService';
import { PIXEL_ART_PRESETS, getDefaultPreset, getPresetById } from '../../services/PixelArt/PixelArtPresets';
// enjin2 WebAssembly module will be loaded dynamically from public directory

// Import design system components
import {
  ToolLayout,
  Button,
  Card,
  CardHeader,
  CardBody,
  StatusIndicator,
  Input,
  Select,
  PixelArtEditor
} from '../../design-system';

export const PixelArtGenerator: React.FC = () => {
  // Current preset state
  const [currentPreset, setCurrentPreset] = useState(() => {
    try {
      const saved = localStorage.getItem('drop-pixel-art-preset');
      return saved || getDefaultPreset().id;
    } catch {
      return getDefaultPreset().id;
    }
  });

  const [script, setScript] = useState(() => {
    // Try to load saved script, otherwise use default preset
    try {
      const saved = localStorage.getItem('drop-pixel-art-script');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Check if it's a recent save with preset info
        if (parsed.presetId && parsed.content) {
          setCurrentPreset(parsed.presetId);
          return parsed.content;
        }
        return parsed.content || getDefaultPreset().script;
      }
      return getDefaultPreset().script;
    } catch {
      return getDefaultPreset().script;
    }
  });

  const [canvas, setCanvas] = useState<PixelCanvas>({
    width: 128,
    height: 128,
    data: new Uint8Array(128 * 128)
  });

  const [frameCount, setFrameCount] = useState(() => {
    try {
      const saved = localStorage.getItem('drop-pixel-art-settings');
      if (saved) {
        return JSON.parse(saved).frameCount;
      }
      // Use frame count from current preset
      const preset = getPresetById(currentPreset) || getDefaultPreset();
      return preset.frameCount;
    } catch {
      return getDefaultPreset().frameCount;
    }
  });

  const [currentFrame] = useState(0);
  const [frames, setFrames] = useState<PixelArtFrame[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [errors, setErrors] = useState<Array<{ message: string; line?: number }>>([]);
  const [pixelService, setPixelService] = useState<LuaPixelService | null>(null);

  // Auto-save script with preset info
  useEffect(() => {
    const scriptData = {
      content: script,
      presetId: currentPreset,
      timestamp: new Date().toISOString()
    };
    localStorage.setItem('drop-pixel-art-script', JSON.stringify(scriptData));
  }, [script, currentPreset]);

  // Auto-save settings
  useEffect(() => {
    const settings = {
      frameCount,
      currentFrame,
      currentPreset,
      timestamp: new Date().toISOString()
    };
    localStorage.setItem('drop-pixel-art-settings', JSON.stringify(settings));
  }, [frameCount, currentFrame, currentPreset]);

  // Auto-save current preset
  useEffect(() => {
    localStorage.setItem('drop-pixel-art-preset', currentPreset);
  }, [currentPreset]);

  const generateFrames = useCallback(async () => {
    if (!script.trim()) {
      setErrors([{ message: 'Script cannot be empty', line: 1 }]);
      return;
    }

    console.log('🚀 Starting pixel art generation...');
    setIsGenerating(true);
    setErrors([]);

    try {
      console.log('📦 Creating Enjin2PixelService...');
      const service = new Enjin2PixelService(canvas.width, canvas.height);
      console.log('✅ Service created successfully');

      // Load enjin2 WebAssembly module via script tag (required for Vite public files)
      console.log('🔄 Loading enjin2 WebAssembly module...');
      const enjin2ModuleFactory = await new Promise<any>((resolve, reject) => {
        // First check if the module factory is already available as a global
        if ((window as any).Enjin2Module) {
          console.log('✅ Enjin2Module already available globally');
          resolve((window as any).Enjin2Module);
          return;
        }
        
        console.log('📥 Loading enjin2.js via script tag...');
        
        // Load the script and wait for the ES6 export to be available
        const script = document.createElement('script');
        script.src = '/enjin2.js';
        script.type = 'module';
        
        // Create a unique callback name to avoid conflicts
        const callbackName = `enjin2Callback_${Date.now()}`;
        
        // Set up a global callback that will be called from the module
        (window as any)[callbackName] = (moduleFactory: any) => {
          console.log('✅ Module factory received via callback');
          delete (window as any)[callbackName]; // Clean up
          resolve(moduleFactory);
        };
        
        script.onload = async () => {
          console.log('📜 enjin2.js script loaded');
          
          try {
            // Try to get the module by executing a dynamic import in the global scope
            const moduleText = `
              import Enjin2Module from '/enjin2.js';
              window.${callbackName}(Enjin2Module);
            `;
            
            const moduleScript = document.createElement('script');
            moduleScript.type = 'module';
            moduleScript.textContent = moduleText;
            document.head.appendChild(moduleScript);
            
            // Clean up after a delay
            setTimeout(() => {
              document.head.removeChild(moduleScript);
            }, 1000);
            
          } catch (error) {
            console.error('❌ Failed to import module:', error);
            reject(error);
          }
        };
        
        script.onerror = (error) => {
          console.error('❌ Failed to load enjin2.js:', error);
          reject(new Error('Failed to load enjin2.js'));
        };
        
        document.head.appendChild(script);
        
        // Timeout after 10 seconds
        setTimeout(() => {
          if ((window as any)[callbackName]) {
            delete (window as any)[callbackName];
            reject(new Error('Module loading timed out'));
          }
        }, 10000);
      });
      
      // Initialize with enjin2 WebAssembly module factory
      console.log('🔧 Initializing enjin2 service...');
      await service.initializeEnjin2(enjin2ModuleFactory);
      console.log('✅ enjin2 service initialized');

      console.log('🎬 Generating frames...');
      const frames = await service.generateFrames(script, frameCount);
      console.log('✅ Frames generated:', frames.length);

      if (frames && frames.length > 0) {
        setFrames(frames);
        setPixelService(service as unknown as LuaPixelService); // Store the initialized service
        if (frames.length > 0) {
          setCanvas(frames[currentFrame]?.canvas || frames[0].canvas);
        }
        console.log(`Generated ${frames.length} frames`);
      } else {
        setErrors([{ message: 'Failed to generate frames' }]);
        console.error('Pixel art generation failed: No frames generated');
      }
    } catch (error) {
      console.error('❌ Generation failed:', error);
      setErrors([{
        message: error instanceof Error ? error.message : 'Unknown generation error',
        line: 1
      }]);
      console.error('Generation error:', error);
    } finally {
      console.log('🏁 Generation process completed');
      setIsGenerating(false);
    }
  }, [script, frameCount, canvas.width, canvas.height, currentFrame]);

  // Update canvas when frame changes
  useEffect(() => {
    if (frames.length > 0 && frames[currentFrame]) {
      setCanvas(frames[currentFrame].canvas);
    }
  }, [currentFrame, frames]);

  const handleCanvasSizeChange = useCallback((dimension: 'width' | 'height', value: number) => {
    const newSize = Math.max(1, Math.min(255, value));
    setCanvas(prev => ({
      ...prev,
      [dimension]: newSize,
      data: new Uint8Array(prev.width * prev.height)
    }));
    setFrames([]); // Clear frames when canvas size changes
  }, []);

  const handlePresetChange = useCallback((presetId: string) => {
    const preset = getPresetById(presetId) || getDefaultPreset();
    setCurrentPreset(preset.id);
    setScript(preset.script);
    setFrameCount(preset.frameCount);
    setFrames([]); // Clear existing frames
    setErrors([]); // Clear errors
  }, []);

  const handleResetScript = useCallback(() => {
    // Clear localStorage data and reset to default preset
    localStorage.removeItem('drop-pixel-art-script');
    localStorage.removeItem('drop-pixel-art-settings');
    localStorage.removeItem('drop-pixel-art-preset');
    
    const defaultPreset = getDefaultPreset();
    setCurrentPreset(defaultPreset.id);
    setScript(defaultPreset.script);
    setFrameCount(defaultPreset.frameCount);
    setFrames([]);
    setErrors([]);
  }, []);

  // Create left panel (Code Editor & Settings)
  const leftPanel = (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{
        padding: 'var(--ds-spacing-sm)',
        borderBottom: '1px solid var(--ds-color-border-muted)',
        backgroundColor: 'var(--ds-color-background-secondary)'
      }}>
        {/* Preset controls row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--ds-spacing-lg)', marginBottom: 'var(--ds-spacing-sm)' }}>
          <Select
            label="Preset"
            value={currentPreset}
            onChange={(e) => handlePresetChange(e.target.value)}
            size="sm"
            style={{ minWidth: '200px' }}
            options={PIXEL_ART_PRESETS.map(preset => ({
              value: preset.id,
              label: preset.name
            }))}
          />
          <Button
            variant="secondary"
            onClick={handleResetScript}
            size="sm"
          >
            Reset
          </Button>
          {/* Show current preset description */}
          <div style={{ 
            fontSize: 'var(--ds-font-size-sm)', 
            color: 'var(--ds-color-text-muted)',
            fontStyle: 'italic',
            maxWidth: '300px'
          }}>
            {(() => {
              const preset = getPresetById(currentPreset);
              return preset ? preset.description : '';
            })()}
          </div>
        </div>
        
        {/* Canvas and generation controls row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--ds-spacing-lg)' }}>
          <Input
            label="Width"
            labelPosition="left"
            type="number"
            value={canvas.width}
            onChange={(e) => handleCanvasSizeChange('width', parseInt(e.target.value) || 128)}
            min={1}
            max={255}
            size="sm"
            style={{ width: '120px' }}
          />
          <Input
            label="Height"
            labelPosition="left"
            type="number"
            value={canvas.height}
            onChange={(e) => handleCanvasSizeChange('height', parseInt(e.target.value) || 127)}
            min={1}
            max={255}
            size="sm"
            style={{ width: '120px' }}
          />
          <Input
            label="Frame Count"
            labelPosition="left"
            type="number"
            value={frameCount}
            onChange={(e) => setFrameCount(Math.max(1, parseInt(e.target.value) || 1))}
            min={1}
            max={1000}
            size="sm"
            style={{ width: '120px' }}
          />
          <Button
            variant="primary"
            onClick={generateFrames}
            disabled={isGenerating}
          >
            {isGenerating ? 'Generating...' : 'Generate'}
          </Button>
          <Button
            variant="secondary"
            onClick={() => setIsExportModalOpen(true)}
            disabled={frames.length === 0}
          >
            Export
          </Button>
        </div>
      </div>

      <div style={{ flex: 1, padding: 'var(--ds-spacing-sm)', overflow: 'hidden' }}>
        <PixelArtEditor
          value={script}
          onChange={setScript}
          onExecute={generateFrames}
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

  // Create right panel (Preview)
  const rightPanel = (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, padding: 'var(--ds-spacing-sm)', overflow: 'hidden' }}>
        <Card style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          <CardHeader>Pixel Art Preview</CardHeader>
          <CardBody style={{ flex: 1, overflow: 'hidden' }}>
            <PixelArtPreview
              frames={frames}
              currentCanvas={canvas}
              showAnimation={true}
            />
          </CardBody>
        </Card>
      </div>
    </div>
  );

  // Create status bar content
  const statusBar = (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
      <div style={{ display: 'flex', gap: 'var(--ds-spacing-lg)', alignItems: 'center' }}>
        <span>Pixel Art Generator</span>
        <span style={{ color: 'var(--ds-color-text-muted)' }}>
          Preset: {(() => {
            const preset = getPresetById(currentPreset);
            return preset ? preset.name : 'Unknown';
          })()}
        </span>
        {frames.length > 0 && (
          <span style={{ color: 'var(--ds-color-success)' }}>
            Generated: {frames.length} frames • {canvas.width}×{canvas.height} pixels
          </span>
        )}
        {isGenerating && (
          <span style={{ color: 'var(--ds-color-warning)' }}>Generating pixel art...</span>
        )}
        {errors.length > 0 && (
          <span style={{ color: 'var(--ds-color-error)' }}>{errors.length} error{errors.length !== 1 ? 's' : ''}</span>
        )}
      </div>
      <div>
        <span>
          {frames.length > 0
            ? `Frame ${currentFrame + 1} of ${frames.length}`
            : 'No frames'
          }
        </span>
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

      {isExportModalOpen && pixelService && (
        <PixelArtExportModal
          frames={frames}
          currentCanvas={canvas}
          pixelService={pixelService}
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
        />
      )}
    </>
  );
};