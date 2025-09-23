import React from 'react';
import { CodeEditor, type CodeEditorProps } from '../CodeEditor';
import { pixelArtLuaLinter } from '../linters/pixelArtLinter';
import { pixelArtGlobalsCompletion, pixelArtLocalVariablesCompletion } from '../completions/pixelArtCompletions';

export interface PixelArtEditorProps extends Omit<CodeEditorProps, 'completions'> {
  // Pixel art specific props can be added here
}

export const PixelArtEditor: React.FC<PixelArtEditorProps> = (props) => {
  return (
    <CodeEditor
      {...props}
      linter={pixelArtLuaLinter}
      completions={[pixelArtGlobalsCompletion, pixelArtLocalVariablesCompletion]}
      placeholder="-- Write your pixel art Lua code here
-- Available globals: f, f_amt, canvas_width, canvas_height
-- Graphics API: graphics.setColor(), graphics.circle(), graphics.rectangle()
-- Pixel API: setPixel(x, y, value), getPixel(x, y)
-- 
-- Example:
-- graphics.clear(0)  -- Clear to black
-- local cx = canvas_width / 2
-- local cy = canvas_height / 2
-- local radius = 10 + 5 * math.sin(f * 0.1)
-- graphics.setColor(1)  -- White
-- graphics.circle('fill', cx, cy, radius)"
    />
  );
};