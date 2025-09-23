// Main CodeEditor component
export { CodeEditor } from './CodeEditor';
export type { CodeEditorProps, CodeEditorError } from './CodeEditor';

// Preset editors
export { SpectralEditor } from './presets/SpectralEditor';
export type { SpectralEditorProps } from './presets/SpectralEditor';

export { PixelArtEditor } from './presets/PixelArtEditor';
export type { PixelArtEditorProps } from './presets/PixelArtEditor';

// Linters
export { spectralLuaLinter } from './linters/spectralLinter';
export { pixelArtLuaLinter } from './linters/pixelArtLinter';

// Completions
export { spectralGlobalsCompletion } from './completions/spectralCompletions';
export { pixelArtGlobalsCompletion, pixelArtLocalVariablesCompletion } from './completions/pixelArtCompletions';