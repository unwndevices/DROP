/**
 * Enjin2PixelService - Provides Lua API for pixel art generation using enjin2 WebAssembly
 * 
 * This service replaces wasmoon with enjin2's native Lua engine, providing exact
 * API compatibility between the web interface and Eisei hardware.
 */

import type { PixelCanvas, PixelArtFrame } from './LuaPixelService';
import type { Enjin2Module, LuaScriptSystem, LuaCanvas, Canvas4_128x128 } from '../../types/enjin2';
import { initializeEnjin2API } from './Enjin2Adapter';
import { ScriptTransformer } from './ScriptTransformer';

// Timeout wrapper to prevent infinite hangs
function withTimeout<T>(promise: Promise<T>, ms: number, operation: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error(`${operation} timed out after ${ms}ms`)), ms)
    )
  ]);
}

export class Enjin2PixelService {
  private enjin2Module: Enjin2Module | null = null;
  private scriptSystem: LuaScriptSystem | null = null;
  private canvas: Canvas4_128x128 | null = null;
  private luaCanvas: LuaCanvas | null = null;
  private frames: PixelArtFrame[] = [];
  private canvasWidth: number;
  private canvasHeight: number;

  constructor(width: number = 128, height: number = 128) {
    this.canvasWidth = width;
    this.canvasHeight = height;
  }

  /**
   * Initialize enjin2 WebAssembly module and Lua engine
   */
  async initializeEnjin2(enjin2ModuleFactory: any): Promise<void> {
    try {
      // Load the enjin2 WebAssembly module
      this.enjin2Module = await enjin2ModuleFactory({
        onRuntimeInitialized: () => {
          console.log('enjin2 WebAssembly runtime initialized');
        }
      });

      if (!this.enjin2Module) {
        throw new Error('Failed to load enjin2 WebAssembly module');
      }

      // Create canvas (currently only 128x128 supported)
      if (this.canvasWidth === 128 && this.canvasHeight === 128) {
        this.canvas = new this.enjin2Module.Canvas4_128x128();
        // Create LuaCanvas from the same Canvas4 instance so drawing and reading use the same buffer
        this.luaCanvas = this.enjin2Module.createLuaCanvasFromCanvas128(this.canvas);
        console.log('✅ Created connected canvas and luaCanvas');
      } else {
        throw new Error(`Unsupported canvas size: ${this.canvasWidth}x${this.canvasHeight}. Only 128x128 is currently supported.`);
      }

      // Create and initialize the Lua script system
      this.scriptSystem = new this.enjin2Module.LuaScriptSystem();
      if (!this.scriptSystem) {
        throw new Error('Failed to create Lua script system');
      }
      
      const initialized = this.scriptSystem.initialize();
      
      if (!initialized) {
        throw new Error('Failed to initialize enjin2 Lua script system');
      }

      // Set the canvas for the script system
      this.scriptSystem.setCanvas(this.luaCanvas);

      // Initialize enjin2 native Lua API
      initializeEnjin2API(this.scriptSystem, this.enjin2Module, this.luaCanvas);
      
      // Set up optimized drawing system with canvas and module references
      // Note: We can't pass JS objects directly to Lua, so we'll use a different approach
      const setupOptimizedSystem = `
        -- These will be accessed via the service's methods
        _canvas_width = ${this.canvasWidth}
        _canvas_height = ${this.canvasHeight}
        _optimization_enabled = true
      `;
      this.scriptSystem.executeScript(setupOptimizedSystem);

      // Test if basic functions are available using the debug function
      const debugResult = this.enjin2Module.debugLuaBindings(this.scriptSystem);
      console.log('Debug bindings result:', debugResult);
      
      // Test if we can execute simple Lua commands and get output
      console.log('Testing basic Lua execution...');
      const basicTest = this.scriptSystem.executeScript(`
        print("Basic Lua execution working!")
        print("Testing math: 2 + 2 = " .. (2 + 2))
        return true
      `);
      console.log('Basic Lua test result:', basicTest);
      
      // Test canvas access and drawing functions
      const canvasTest = this.scriptSystem.executeScript(`
        print("Testing canvas functions...")
        if getWidth then
          local w = getWidth()
          local h = getHeight()
          print("Canvas dimensions: " .. w .. "x" .. h)
        else
          print("getWidth function not found!")
        end
        
        if clear then
          print("clear function found")
          clear(0)
          print("Canvas cleared successfully")
        else
          print("clear function NOT found!")
        end
        
        if point then
          print("point function found")
          point(10, 10, 15)
          print("Drew point at 10,10 with color 15")
        else
          print("point function NOT found!")
        end
        
        return true
      `);
      console.log('Canvas function test result:', canvasTest);
      
      console.log('enjin2 pixel service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize enjin2:', error);
      throw error;
    }
  }

  /**
   * Execute Lua script for a single frame
   */
  async executeFrame(script: string, frameIndex: number, totalFrames: number = 1): Promise<PixelArtFrame> {
    console.log('🔍 Checking enjin2 initialization...');
    if (!this.scriptSystem) {
      throw new Error('scriptSystem not initialized');
    }
    if (!this.canvas) {
      throw new Error('canvas not initialized');
    }
    if (!this.enjin2Module) {
      throw new Error('enjin2Module not initialized');
    }
    console.log('✅ All components initialized');

    // Test basic module functions first
    console.log('🧪 Testing basic module functions...');
    try {
      if (this.enjin2Module.testFunction) {
        const testResult = this.enjin2Module.testFunction();
        console.log('✅ testFunction works:', testResult);
      } else {
        console.error('❌ testFunction not found - embind not working!');
      }
    } catch (error) {
      console.error('❌ testFunction failed:', error);
    }

    // Transform Love2D syntax to enjin2 native syntax for backward compatibility
    const transformedScript = ScriptTransformer.transformToEnjin2(script);
    
    // Log transformation if it occurred
    if (ScriptTransformer.needsTransformation(script)) {
      console.log('Transformed Love2D script to enjin2 syntax');
      const changes = ScriptTransformer.getTransformationSummary(script);
      console.log('Transformations applied:', changes);
    }

    // Create frame script with enjin2 variables
    const frameScript = `
      -- Frame variables
      f = ${frameIndex}
      f_amt = ${totalFrames}
      
      -- Canvas dimensions
      canvas_width = ${this.canvasWidth}
      canvas_height = ${this.canvasHeight}
      
      -- User script (transformed from Love2D if needed)
      ${transformedScript}
    `;

    try {
      console.log(`🚀 Starting frame ${frameIndex} execution...`);
      console.log('Frame script preview:', frameScript.substring(0, 200) + '...');
      
      // Clear canvas first
      console.log('🧹 Clearing canvas...');
      try {
        this.canvas.clear(0);
        console.log('✅ Canvas cleared successfully');
      } catch (error) {
        console.error('❌ Canvas clear failed:', error);
        throw error;
      }
      
      // Execute the script with timeout
      console.log('🔧 Executing Lua script...');
      let result;
      try {
        const scriptPromise = Promise.resolve(this.scriptSystem.executeScript(frameScript));
        result = await withTimeout(scriptPromise, 5000, 'Lua script execution');
        console.log('✅ Script execution completed');
        console.log('Script result:', result);
      } catch (error) {
        console.error('❌ Script execution failed:', error);
        throw error;
      }
      
      if (!result.success) {
        console.error('❌ Lua execution error:', result.error);
        throw new Error(`Lua execution error: ${result.error}`);
      }
      
      // No manual flushing needed - optimized functions work directly
      console.log('✅ Frame execution completed (using optimized drawing functions)');

      // Get canvas data
      console.log('📊 Getting canvas data...');
      let canvasData;
      try {
        canvasData = this.enjin2Module.getCanvasData128(this.canvas);
        console.log('✅ Canvas data retrieved, length:', canvasData.length);
      } catch (error) {
        console.error('❌ Canvas data retrieval failed:', error);
        throw error;
      }
      
      // Check if canvas has any non-zero pixels
      console.log('🔍 Analyzing pixels...');
      try {
        const nonZeroPixels = Array.from(canvasData).filter(x => x !== 0).length;
        console.log(`📈 Non-zero pixels in canvas: ${nonZeroPixels} out of ${canvasData.length}`);
        
        if (nonZeroPixels > 0) {
          console.log('🎨 First few non-zero pixel values:', Array.from(canvasData).filter(x => x !== 0).slice(0, 10));
        } else {
          console.log('⚠️ All pixels are zero - no drawing occurred');
        }
      } catch (error) {
        console.error('❌ Pixel analysis failed:', error);
        throw error;
      }
      
      // Create frame snapshot
      console.log('📦 Creating frame snapshot...');
      let frame;
      try {
        frame = {
          frameIndex,
          canvas: {
            width: this.canvasWidth,
            height: this.canvasHeight,
            data: new Uint8Array(canvasData) // Copy the data
          },
          timestamp: Date.now()
        };
        console.log('✅ Frame snapshot created successfully');
      } catch (error) {
        console.error('❌ Frame snapshot creation failed:', error);
        throw error;
      }

      console.log(`🎉 Frame ${frameIndex} completed successfully`);
      return frame;
    } catch (error) {
      throw new Error(`Frame execution error at frame ${frameIndex}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate multiple frames from script
   */
  async generateFrames(script: string, frameCount: number): Promise<PixelArtFrame[]> {
    console.log(`🎬 Starting generation of ${frameCount} frames...`);
    const frames: PixelArtFrame[] = [];

    try {
      for (let i = 0; i < frameCount; i++) {
        console.log(`🎯 Processing frame ${i + 1}/${frameCount}...`);
        const frame = await withTimeout(
          this.executeFrame(script, i, frameCount), 
          10000, 
          `Frame ${i + 1} execution`
        );
        frames.push(frame);
        console.log(`✅ Frame ${i + 1} added to collection`);
      }

      console.log(`🎉 All ${frameCount} frames generated successfully`);
      this.frames = frames;
      return frames;
    } catch (error) {
      console.error('❌ Frame generation failed:', error);
      throw error;
    }
  }

  /**
   * Get current canvas state
   */
  getCurrentCanvas(): PixelCanvas {
    if (!this.canvas || !this.enjin2Module) {
      throw new Error('enjin2 not initialized');
    }

    const canvasData = this.enjin2Module.getCanvasData128(this.canvas);
    
    return {
      width: this.canvasWidth,
      height: this.canvasHeight,
      data: new Uint8Array(canvasData)
    };
  }

  /**
   * Get generated frames
   */
  getFrames(): PixelArtFrame[] {
    return this.frames;
  }

  /**
   * Export canvas data as different formats
   */
  exportCanvas(format: 'binary' | 'cpp' | 'png' | 'json', frame?: PixelArtFrame): string | Uint8Array {
    const canvas = frame ? frame.canvas : this.getCurrentCanvas();

    switch (format) {
      case 'binary':
        return canvas.data;

      case 'cpp':
        return this.exportAsCppHeader(canvas);

      case 'json':
        return JSON.stringify({
          width: canvas.width,
          height: canvas.height,
          data: Array.from(canvas.data)
        }, null, 2);

      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Export as C++ header file
   */
  private exportAsCppHeader(canvas: PixelCanvas): string {
    const arrayName = 'pixelArtData';
    let cpp = `// Generated Pixel Art Data - ${canvas.width}x${canvas.height} @ 4-bit grayscale\n`;
    cpp += `// Generated on ${new Date().toISOString()}\n`;
    cpp += `// Generated with enjin2 WebAssembly\n\n`;
    cpp += `#ifndef PIXEL_ART_DATA_H\n`;
    cpp += `#define PIXEL_ART_DATA_H\n\n`;
    cpp += `#include <stdint.h>\n\n`;
    cpp += `const uint16_t CANVAS_WIDTH = ${canvas.width};\n`;
    cpp += `const uint16_t CANVAS_HEIGHT = ${canvas.height};\n`;
    cpp += `const uint16_t CANVAS_SIZE = ${canvas.data.length};\n\n`;
    cpp += `const uint8_t ${arrayName}[${canvas.data.length}] = {\n`;

    for (let i = 0; i < canvas.data.length; i += 16) {
      const line = Array.from(canvas.data.slice(i, i + 16))
        .map(val => `0x${val.toString(16).padStart(2, '0')}`)
        .join(', ');
      cpp += `  ${line}${i + 16 < canvas.data.length ? ',' : ''}\n`;
    }

    cpp += `};\n\n`;
    cpp += `#endif // PIXEL_ART_DATA_H\n`;

    return cpp;
  }

  /**
   * Get script system memory usage
   */
  getMemoryUsage(): number {
    if (!this.scriptSystem) {
      return 0;
    }
    return this.scriptSystem.getMemoryUsage();
  }

  /**
   * Validate Lua script for syntax errors
   */
  async validateScript(script: string): Promise<{ valid: boolean; errors: string[] }> {
    if (!this.scriptSystem) {
      return { valid: false, errors: ['enjin2 not initialized'] };
    }

    try {
      // Try executing a simple version of the script
      const testScript = `
        -- Test script validation
        f = 0
        f_amt = 1
        canvas_width = ${this.canvasWidth}
        canvas_height = ${this.canvasHeight}
        
        ${script}
      `;

      const result = this.scriptSystem.executeScript(testScript);
      return {
        valid: result.success,
        errors: result.success ? [] : [result.error]
      };
    } catch (error) {
      return {
        valid: false,
        errors: [error instanceof Error ? error.message : 'Unknown validation error']
      };
    }
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.scriptSystem) {
      this.scriptSystem.shutdown();
      this.scriptSystem = null;
    }
    
    this.canvas = null;
    this.luaCanvas = null;
    this.enjin2Module = null;
    this.frames = [];
  }
}