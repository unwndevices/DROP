import { type CompletionContext } from '@codemirror/autocomplete';

// Spectral analysis specific globals completion
export const spectralGlobalsCompletion = (context: CompletionContext) => {
  const word = context.matchBefore(/\w*/);
  if (!word) return null;

  const options = [
    {
      label: 'i',
      type: 'variable',
      info: 'Current frame index (0 to frameCount-1)',
      detail: 'number'
    },
    {
      label: 'f',
      type: 'variable', 
      info: 'Current frequency band index (0 to 19)',
      detail: 'number'
    },
    {
      label: 'i_amt',
      type: 'variable',
      info: 'Total number of frames in the sequence',
      detail: 'number'
    },
    {
      label: 'f_amt',
      type: 'variable',
      info: 'Total number of frequency bands (always 20)',
      detail: 'number'
    },
    // Math functions
    {
      label: 'math.sin',
      type: 'function',
      info: 'Sine function',
      detail: 'math.sin(x)'
    },
    {
      label: 'math.cos',
      type: 'function',
      info: 'Cosine function', 
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
      info: 'Random number generator',
      detail: 'math.random([m [, n]])'
    },
    {
      label: 'math.floor',
      type: 'function',
      info: 'Floor function (round down)',
      detail: 'math.floor(x)'
    },
    {
      label: 'math.ceil',
      type: 'function',
      info: 'Ceiling function (round up)',
      detail: 'math.ceil(x)'
    },
    {
      label: 'math.abs',
      type: 'function',
      info: 'Absolute value',
      detail: 'math.abs(x)'
    },
    {
      label: 'math.exp',
      type: 'function',
      info: 'Exponential function (e^x)',
      detail: 'math.exp(x)'
    },
    {
      label: 'math.log',
      type: 'function',
      info: 'Natural logarithm',
      detail: 'math.log(x)'
    },
    {
      label: 'math.sqrt',
      type: 'function',
      info: 'Square root',
      detail: 'math.sqrt(x)'
    },
    {
      label: 'math.pow',
      type: 'function',
      info: 'Power function',
      detail: 'math.pow(x, y)'
    },
    {
      label: 'math.min',
      type: 'function',
      info: 'Minimum value',
      detail: 'math.min(x, ...)'
    },
    {
      label: 'math.max',
      type: 'function',
      info: 'Maximum value',
      detail: 'math.max(x, ...)'
    }
  ];

  return {
    from: word.from,
    options: options.filter(option => 
      option.label.toLowerCase().includes(word.text.toLowerCase())
    )
  };
};