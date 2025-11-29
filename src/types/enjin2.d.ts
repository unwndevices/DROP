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
  getWidth(): number;
  getHeight(): number;
}

export interface Canvas4_128x128 {
  clear(color: number): void;
  setPixel(x: number, y: number, color: number): void;
  getPixel(x: number, y: number): number;
}

export interface Enjin2Module {
  LuaScriptSystem: new () => LuaScriptSystem;
  Canvas4_128x128: new () => Canvas4_128x128;
  createLuaCanvas128(): LuaCanvas;
  createLuaCanvasFromCanvas128(canvas: Canvas4_128x128): LuaCanvas;
  getCanvasData128(canvas: Canvas4_128x128): Uint8Array;
  setupGlobalLuaFunctions(scriptSystem: LuaScriptSystem): boolean;
  debugLuaBindings(scriptSystem: LuaScriptSystem): boolean;
  testFunction?(): number;
}

// Global enjin2 module factory
declare global {
  interface Window {
    Enjin2Module: (config?: any) => Promise<Enjin2Module>;
  }
}