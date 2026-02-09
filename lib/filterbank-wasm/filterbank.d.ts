/**
 * TypeScript definitions for FilterBank WebAssembly module
 * 
 * These definitions allow TypeScript to understand the API exposed
 * by the FilterBank WebAssembly module's Emscripten bindings.
 */

export interface AnalysisResult {
  /** Float32Array of spectral data (frameCount * bandCount values) */
  frames: Float32Array;
  /** Number of spectral frames generated */
  frameCount: number;
  /** Number of frequency bands (always 20) */
  bandCount: number;
}

export interface FilterBank {
  /** Initialize the filterbank at the given sample rate (e.g., 48000) */
  Init(sampleRate: number): void;
  
  /** Check if filterbank is initialized */
  IsInitialized(): boolean;
  
  /** 
   * Analyze audio samples and return spectral frames.
   * Input should be mono 48kHz Float32Array.
   * Returns null if not initialized.
   */
  AnalyzeAudio(samples: Float32Array): AnalysisResult | null;
  
  /**
   * Pre-roll the filterbank to warm up filter states.
   * Helps avoid slow attack on first samples.
   * @param samples First portion of audio
   * @param mode "reverse" or "loop"
   */
  PreRoll(samples: Float32Array, mode: string): void;
  
  /** Reset the filterbank state */
  Reset(sampleRate: number): void;
}

export interface FilterBankModule {
  FilterBank: new () => FilterBank;
  
  /** Number of frequency bands (20) */
  NUM_BANDS: number;
  
  /** Analysis block size (24 samples) */
  ANALYSIS_BLOCK_SIZE: number;
  
  /** Maximum recording length in seconds (27) */
  MAX_SECONDS: number;
}

declare const FilterBankModuleFactory: () => Promise<FilterBankModule>;

export default FilterBankModuleFactory;
