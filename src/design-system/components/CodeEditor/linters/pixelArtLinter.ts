import { linter, type Diagnostic } from '@codemirror/lint';
import type { Text } from '@codemirror/state';

// Pixel art specific global variables
const PIXEL_ART_GLOBALS = new Set([
  // Standard Lua globals
  'i', 'f', 'i_amt', 'f_amt', 'math', 'print', 'type', 'tonumber', 'tostring', 
  'pairs', 'ipairs', 'next', 'string', 'table', '_G', '_VERSION', 'assert',
  'collectgarbage', 'error', 'getmetatable', 'setmetatable', 'rawget', 'rawset',
  'select', 'unpack', 'pcall', 'xpcall',
  
  // Graphics functions (Love2D-style)
  'setColor', 'getColor', 'setLineWidth', 'getLineWidth',
  'rectangle', 'circle', 'points', 'polygon', 'clear',
  'present', 'push', 'pop', 'origin', 'getDimensions',
  'getWidth', 'getHeight', 'printf', 'print', 'drawLine',
  
  // Pixel functions
  'setPixel', 'getPixel', 'clearCanvas',
  
  // Drawing primitives  
  'line', 'rect',
  
  // Utilities
  'noise', 'dither', 'gradient', 'distance',
  
  // Math helpers
  'randomFloat', 'angle',
  
  // Timer functions
  'getTime', 'getDelta',
  
  // Canvas constants
  'canvas_width', 'canvas_height',
  
  // Love2D compatibility
  'love',
  'graphics'
]);

// Check for undefined variables specific to pixel art
const checkUndefinedVariables = (text: string, diagnostics: Diagnostic[], doc: Text) => {
  // Extract all local variables and function parameters
  const localVars = new Set<string>();
  
  // Extract local variable declarations
  const localVarRegex = /local\s+([a-zA-Z_][a-zA-Z0-9_]*(?:\s*,\s*[a-zA-Z_][a-zA-Z0-9_]*)*)/g;
  let match;
  while ((match = localVarRegex.exec(text)) !== null) {
    const vars = match[1].split(',').map(v => v.trim());
    vars.forEach(varName => {
      if (varName && /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(varName)) {
        localVars.add(varName);
      }
    });
  }
  
  // Extract function names and parameters
  const functionParamRegex = /function\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(([^)]*)\)/g;
  while ((match = functionParamRegex.exec(text)) !== null) {
    // Add function name to local variables
    if (match[1] && /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(match[1])) {
      localVars.add(match[1]);
    }
    // Add function parameters
    if (match[2] && match[2].trim()) {
      const params = match[2].split(',').map(p => p.trim());
      params.forEach(param => {
        if (param && /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(param)) {
          localVars.add(param);
        }
      });
    }
  }
  
  // Extract local function declarations: local function name()
  const localFunctionRegex = /local\s+function\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g;
  while ((match = localFunctionRegex.exec(text)) !== null) {
    if (match[1] && /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(match[1])) {
      localVars.add(match[1]);
    }
  }
  
  // Extract for loop variables
  const forLoopRegex = /for\s+([a-zA-Z_][a-zA-Z0-9_]*(?:\s*,\s*[a-zA-Z_][a-zA-Z0-9_]*)*)\s+[=in]/g;
  while ((match = forLoopRegex.exec(text)) !== null) {
    const vars = match[1].split(',').map(v => v.trim());
    vars.forEach(varName => {
      if (varName && /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(varName)) {
        localVars.add(varName);
      }
    });
  }
  
  // Check for undefined variable usage
  const lines = text.split('\n');
  
  lines.forEach((line, lineIndex) => {
    // Skip comments and strings
    const cleanLine = line.replace(/--.*$/, '').replace(/"[^"]*"/g, '').replace(/'[^']*'/g, '');
    
    let varMatch;
    const usageRegex = /\b([a-zA-Z_][a-zA-Z0-9_]*)\b/g;
    while ((varMatch = usageRegex.exec(cleanLine)) !== null) {
      const varName = varMatch[1];
      
      // Skip keywords and known patterns
      const keywords = ['function', 'local', 'if', 'then', 'else', 'elseif', 'end', 'for', 'while', 'do', 'return', 'break', 'true', 'false', 'nil', 'and', 'or', 'not', 'in'];
      if (keywords.includes(varName)) continue;
      
      // Skip if it's a property access (after a dot)
      const beforeVar = cleanLine.substring(0, varMatch.index);
      if (beforeVar.endsWith('.')) continue;
      
      // Skip if it's a function declaration
      if (cleanLine.includes(`function ${varName}`) || cleanLine.includes(`function(`) || cleanLine.includes(`local ${varName}`)) continue;
      
      // Check if variable is defined
      if (!localVars.has(varName) && !PIXEL_ART_GLOBALS.has(varName)) {
        const lineStart = doc.line(lineIndex + 1).from;
        const from = lineStart + varMatch.index!;
        const to = from + varName.length;
        
        diagnostics.push({
          from,
          to,
          severity: 'warning',
          message: `Undefined variable '${varName}'. Did you mean to declare it with 'local ${varName}'?`
        });
      }
    }
  });
};

// Check for common Lua mistakes in pixel art context
const checkCommonMistakes = (text: string, diagnostics: Diagnostic[], doc: Text) => {
  const lines = text.split('\n');
  
  lines.forEach((line, lineIndex) => {
    const trimmedLine = line.trim();
    
    // Check for assignment instead of comparison (but not <=, >=, ~=, ==)
    if (trimmedLine.match(/if\s+.*[^<>=~]=(?!=)/)) {
      const assignIndex = line.indexOf('=');
      const from = doc.line(lineIndex + 1).from + assignIndex;
      diagnostics.push({
        from,
        to: from + 1,
        severity: 'warning',
        message: 'Did you mean "==" for comparison instead of "=" for assignment?'
      });
    }
    
    // Check for missing "then" in if statements
    if (trimmedLine.match(/^if\s+.*[^then]\s*$/) && !trimmedLine.includes('then')) {
      const from = doc.line(lineIndex + 1).from;
      diagnostics.push({
        from,
        to: from + line.length,
        severity: 'error',
        message: 'If statement missing "then" keyword'
      });
    }
    
    // Check for missing "do" in loops
    if ((trimmedLine.match(/^for\s+/) || trimmedLine.match(/^while\s+/)) && !trimmedLine.includes('do')) {
      const from = doc.line(lineIndex + 1).from;
      diagnostics.push({
        from,
        to: from + line.length,
        severity: 'error',
        message: 'Loop missing "do" keyword'
      });
    }
    
    // Check for incorrect string concatenation
    if (trimmedLine.includes('+') && (trimmedLine.includes('"') || trimmedLine.includes("'"))) {
      const plusIndex = line.indexOf('+');
      const from = doc.line(lineIndex + 1).from + plusIndex;
      diagnostics.push({
        from,
        to: from + 1,
        severity: 'info',
        message: 'Use ".." for string concatenation instead of "+"'
      });
    }
    
    // Pixel art specific checks
    // Check for out-of-bounds pixel coordinates
    const setPixelMatch = trimmedLine.match(/setPixel\s*\(\s*([^,]+),\s*([^,]+)/);
    if (setPixelMatch) {
      const xStr = setPixelMatch[1].trim();
      const yStr = setPixelMatch[2].trim();
      
      // Check for obvious out-of-bounds values (literal numbers)
      if (/^\d+$/.test(xStr)) {
        const x = parseInt(xStr);
        if (x < 0) {
          const from = doc.line(lineIndex + 1).from + line.indexOf(xStr);
          diagnostics.push({
            from,
            to: from + xStr.length,
            severity: 'error',
            message: `X coordinate cannot be negative`
          });
        } else if (x >= 1000) {
          const from = doc.line(lineIndex + 1).from + line.indexOf(xStr);
          diagnostics.push({
            from,
            to: from + xStr.length,
            severity: 'warning',
            message: `X coordinate ${x} may exceed canvas bounds. Check canvas_width variable.`
          });
        }
      }
      
      if (/^\d+$/.test(yStr)) {
        const y = parseInt(yStr);
        if (y < 0) {
          const from = doc.line(lineIndex + 1).from + line.indexOf(yStr);
          diagnostics.push({
            from,
            to: from + yStr.length,
            severity: 'error',
            message: `Y coordinate cannot be negative`
          });
        } else if (y >= 1000) {
          const from = doc.line(lineIndex + 1).from + line.indexOf(yStr);
          diagnostics.push({
            from,
            to: from + yStr.length,
            severity: 'warning',
            message: `Y coordinate ${y} may exceed canvas bounds. Check canvas_height variable.`
          });
        }
      }
    }
  });
};

// Basic Lua syntax error detection
const checkSyntaxErrors = (text: string, diagnostics: Diagnostic[], doc: Text) => {
  const lines = text.split('\n');
  
  lines.forEach((line, lineIndex) => {
    const trimmedLine = line.trim();
    
    // Check for unmatched brackets
    const brackets = { '(': ')', '[': ']', '{': '}' };
    const stack: string[] = [];
    let inString = false;
    let stringChar = '';
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const prevChar = line[i - 1];
      
      // Handle string literals
      if ((char === '"' || char === "'") && prevChar !== '\\') {
        if (!inString) {
          inString = true;
          stringChar = char;
        } else if (char === stringChar) {
          inString = false;
          stringChar = '';
        }
      }
      
      if (!inString) {
        if (char in brackets) {
          stack.push(brackets[char as keyof typeof brackets]);
        } else if (Object.values(brackets).includes(char)) {
          const expected = stack.pop();
          if (expected !== char) {
            const from = doc.line(lineIndex + 1).from + i;
            diagnostics.push({
              from,
              to: from + 1,
              severity: 'error',
              message: `Unmatched '${char}'. Expected '${expected || 'nothing'}'`
            });
          }
        }
      }
    }
    
    // Check for incomplete function definitions
    if (trimmedLine.startsWith('function') && !trimmedLine.includes('end') && !text.slice(text.indexOf(line)).includes('end')) {
      const from = doc.line(lineIndex + 1).from;
      diagnostics.push({
        from,
        to: from + line.length,
        severity: 'error',
        message: 'Function definition missing "end" keyword'
      });
    }
    
    // Check for incomplete if statements
    if (trimmedLine.match(/^if\s+.*\s+then\s*$/) && !text.slice(text.indexOf(line)).includes('end')) {
      const from = doc.line(lineIndex + 1).from;
      diagnostics.push({
        from,
        to: from + line.length,
        severity: 'error',
        message: 'If statement missing "end" keyword'
      });
    }
    
    // Check for incomplete for loops
    if (trimmedLine.match(/^for\s+.*\s+do\s*$/) && !text.slice(text.indexOf(line)).includes('end')) {
      const from = doc.line(lineIndex + 1).from;
      diagnostics.push({
        from,
        to: from + line.length,
        severity: 'error',
        message: 'For loop missing "end" keyword'
      });
    }
    
    // Check for missing "then" in if statements
    if (trimmedLine.match(/^if\s+.*[^then]\s*$/) && !trimmedLine.includes('then')) {
      const from = doc.line(lineIndex + 1).from;
      diagnostics.push({
        from,
        to: from + line.length,
        severity: 'error',
        message: 'If statement missing "then" keyword'
      });
    }
    
    // Check for missing "do" in loops
    if ((trimmedLine.match(/^for\s+/) || trimmedLine.match(/^while\s+/)) && !trimmedLine.includes('do')) {
      const from = doc.line(lineIndex + 1).from;
      diagnostics.push({
        from,
        to: from + line.length,
        severity: 'error',
        message: 'Loop missing "do" keyword'
      });
    }
  });
};

// Create the pixel art Lua linter
export const pixelArtLuaLinter = linter((view) => {
  const doc = view.state.doc;
  const text = doc.toString();
  const diagnostics: Diagnostic[] = [];

  // Check for basic syntax errors
  checkSyntaxErrors(text, diagnostics, doc);
  
  // Check for undefined variables (with pixel art globals)
  checkUndefinedVariables(text, diagnostics, doc);
  
  // Check for common Lua mistakes
  checkCommonMistakes(text, diagnostics, doc);
  
  return diagnostics;
});