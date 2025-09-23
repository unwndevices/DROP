import React from 'react';
import { CodeEditor, type CodeEditorProps } from '../CodeEditor';
import { spectralLuaLinter } from '../linters/spectralLinter';
import { spectralGlobalsCompletion } from '../completions/spectralCompletions';

export interface SpectralEditorProps extends Omit<CodeEditorProps, 'completions'> {
  // Spectral-specific props can be added here if needed
}

export const SpectralEditor: React.FC<SpectralEditorProps> = (props) => {
  return (
    <CodeEditor
      {...props}
      linter={spectralLuaLinter}
      completions={[spectralGlobalsCompletion]}
      minHeight="100%"
      maxHeight="100%"
      placeholder="// Write your spectral Lua code here
// Available globals: i, f, i_amt, f_amt, math.*
// 
// Example:
// local amplitude = 0.5
// local frequency = 2 * math.pi * f / f_amt
// return amplitude * math.sin(frequency * i + f * 0.1)"
    />
  );
};