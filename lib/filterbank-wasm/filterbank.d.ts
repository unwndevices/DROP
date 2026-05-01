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
   *
   * @param samples Mono 48 kHz audio.
   * @param blockSize Analysis block size in samples. Frame rate = 48000 / blockSize.
   *   Must be a multiple of BLOCK_SIZE_FLOOR (3 in HD WASM build, 12 in legacy).
   *   Pass 0 to use the default (ANALYSIS_BLOCK_SIZE = 24, i.e. 2 kHz frames).
   */
  AnalyzeAudio(samples: Float32Array, blockSize: number): AnalysisResult | null;
  
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

  /** Default analysis block size (24 samples → 2 kHz frame rate) */
  ANALYSIS_BLOCK_SIZE: number;

  /** Smallest legal block size for AnalyzeAudio. 3 in HD WASM build, 12 in legacy. */
  BLOCK_SIZE_FLOOR: number;

  /** Largest legal block size for AnalyzeAudio (96). */
  MAX_FILTERBANK_BLOCK_SIZE: number;

  /** Firmware datum slot capacity in frames (54000). Caps generated output. */
  MAX_FRAMES_PER_SLOT: number;

  /** Maximum recording length in seconds at the default block size (27). */
  MAX_SECONDS: number;
}

declare const FilterBankModuleFactory: () => Promise<FilterBankModule>;

export default FilterBankModuleFactory;
