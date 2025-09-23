/**
 * TypeScript declarations for enjin2 WebAssembly module
 * These types match the Emscripten bindings in enjin2
 */

export interface ScriptResult {
  success: boolean;
  error: string;
}

export interface LuaScriptSystem {
  initialize(): boolean;
  shutdown(): void;
  executeScript(script: string): ScriptResult;
  setCanvas(canvas: LuaCanvas): void;
  getMemoryUsage(): number;
}

export interface LuaCanvas {
  // Canvas wrapper for Lua integration
}

export interface Canvas4_128x128 {
  clear(color: number): void;
  // Other canvas methods will be added via automatic conversion
}

export interface Enjin2Module {
  LuaScriptSystem: new () => LuaScriptSystem;
  Canvas4_128x128: new () => Canvas4_128x128;
  createLuaCanvas128(): LuaCanvas;
  getCanvasData128(canvas: Canvas4_128x128): ArrayBuffer;
  setupGlobalLuaFunctions(scriptSystem: LuaScriptSystem): boolean;
  debugLuaBindings(scriptSystem: LuaScriptSystem): boolean;
}

// Global enjin2 module factory
declare global {
  interface Window {
    Enjin2Module: (config?: any) => Promise<Enjin2Module>;
  }
}