import { type CompletionContext } from '@codemirror/autocomplete';

// Pixel Art specific globals completion
export const pixelArtGlobalsCompletion = (context: CompletionContext) => {
  const word = context.matchBefore(/\w*/);
  if (!word) return null;

  const options = [
    {
      label: 'f',
      type: 'variable',
      info: 'Current frame number (0 to frameCount-1)',
      detail: 'number'
    },
    {
      label: 'f_amt',
      type: 'variable',
      info: 'Total number of frames in animation',
      detail: 'number'
    },
    {
      label: 'canvas_width',
      type: 'variable',
      info: 'Canvas width in pixels (configurable)',
      detail: 'number'
    },
    {
      label: 'canvas_height',
      type: 'variable',
      info: 'Canvas height in pixels (configurable)',
      detail: 'number'
    },
    // Graphics API functions
    {
      label: 'graphics.setColor',
      type: 'function',
      info: 'Set drawing color (0.0-1.0 for grayscale)',
      detail: 'graphics.setColor(gray)'
    },
    {
      label: 'graphics.circle',
      type: 'function',
      info: 'Draw a circle',
      detail: 'graphics.circle(mode, x, y, radius)'
    },
    {
      label: 'graphics.rectangle',
      type: 'function',
      info: 'Draw a rectangle',
      detail: 'graphics.rectangle(mode, x, y, width, height)'
    },
    {
      label: 'graphics.line',
      type: 'function',
      info: 'Draw a line',
      detail: 'graphics.line(x1, y1, x2, y2)'
    },
    {
      label: 'graphics.print',
      type: 'function',
      info: 'Print text to canvas',
      detail: 'graphics.print(text, x, y)'
    },
    {
      label: 'graphics.clear',
      type: 'function',
      info: 'Clear canvas with color',
      detail: 'graphics.clear(gray)'
    },
    {
      label: 'graphics.getWidth',
      type: 'function',
      info: 'Get canvas width',
      detail: 'graphics.getWidth()'
    },
    {
      label: 'graphics.getHeight',
      type: 'function',
      info: 'Get canvas height',
      detail: 'graphics.getHeight()'
    },
    // Primitive functions
    {
      label: 'setPixel',
      type: 'function',
      info: 'Set individual pixel (0-15 grayscale)',
      detail: 'setPixel(x, y, value)'
    },
    {
      label: 'getPixel',
      type: 'function',
      info: 'Get individual pixel value',
      detail: 'getPixel(x, y)'
    },
    {
      label: 'circle',
      type: 'function',
      info: 'Draw circle primitive',
      detail: 'circle(x, y, radius, value, filled)'
    },
    {
      label: 'rect',
      type: 'function',
      info: 'Draw rectangle primitive',
      detail: 'rect(x, y, width, height, value, filled)'
    },
    {
      label: 'line',
      type: 'function',
      info: 'Draw line primitive',
      detail: 'line(x1, y1, x2, y2, value)'
    },
    // Math functions commonly used in pixel art
    {
      label: 'math.sin',
      type: 'function',
      info: 'Sine function for waves and oscillations',
      detail: 'math.sin(x)'
    },
    {
      label: 'math.cos',
      type: 'function',
      info: 'Cosine function for circular motion',
      detail: 'math.cos(x)'
    },
    {
      label: 'math.pi',
      type: 'variable',
      info: 'Pi constant (3.14159...)',
      detail: 'number'
    },
    {
      label: 'math.random',
      type: 'function',
      info: 'Random number for noise and variations',
      detail: 'math.random([m [, n]])'
    },
    {
      label: 'math.floor',
      type: 'function',
      info: 'Floor function (round down to integer)',
      detail: 'math.floor(x)'
    },
    {
      label: 'math.abs',
      type: 'function',
      info: 'Absolute value for distance calculations',
      detail: 'math.abs(x)'
    },
    {
      label: 'math.sqrt',
      type: 'function',
      info: 'Square root for distance formulas',
      detail: 'math.sqrt(x)'
    }
  ];

  return {
    from: word.from,
    options: options.filter(option => 
      option.label.toLowerCase().includes(word.text.toLowerCase())
    )
  };
};

// Dynamic local variables completion for pixel art
export const pixelArtLocalVariablesCompletion = (context: CompletionContext) => {
  const word = context.matchBefore(/\w*/);
  if (!word) return null;

  // Get the full document text
  const doc = context.state.doc;
  const fullText = doc.toString();
  const currentPos = context.pos;

  // Extract local variables declared before current position
  const beforeText = fullText.substring(0, currentPos);
  const localVars = new Set<string>();

  // Match local variable declarations: local varname, local var1, var2
  const localVarRegex = /local\s+([a-zA-Z_][a-zA-Z0-9_]*(?:\s*,\s*[a-zA-Z_][a-zA-Z0-9_]*)*)/g;
  let match;

  while ((match = localVarRegex.exec(beforeText)) !== null) {
    // Split comma-separated variables
    const vars = match[1].split(',').map(v => v.trim());
    vars.forEach(varName => {
      if (varName && /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(varName)) {
        localVars.add(varName);
      }
    });
  }

  // Match function parameters: function name(param1, param2)
  const functionParamRegex = /function\s+[a-zA-Z_][a-zA-Z0-9_]*\s*\(([^)]*)\)/g;
  while ((match = functionParamRegex.exec(beforeText)) !== null) {
    if (match[1].trim()) {
      const params = match[1].split(',').map(p => p.trim());
      params.forEach(param => {
        if (param && /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(param)) {
          localVars.add(param);
        }
      });
    }
  }

  // Match for loop variables: for var in/= 
  const forLoopRegex = /for\s+([a-zA-Z_][a-zA-Z0-9_]*(?:\s*,\s*[a-zA-Z_][a-zA-Z0-9_]*)*)\s+[=in]/g;
  while ((match = forLoopRegex.exec(beforeText)) !== null) {
    const vars = match[1].split(',').map(v => v.trim());
    vars.forEach(varName => {
      if (varName && /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(varName)) {
        localVars.add(varName);
      }
    });
  }

  // Convert to completion options
  const options = Array.from(localVars).map(varName => ({
    label: varName,
    type: 'variable',
    info: 'Local variable',
    detail: 'local'
  }));

  if (options.length === 0) return null;

  return {
    from: word.from,
    options: options.filter(option => 
      option.label.toLowerCase().includes(word.text.toLowerCase())
    )
  };
};