/**
 * ScriptTransformer - Converts Love2D syntax to enjin2 native syntax
 * 
 * This transformer ensures backward compatibility by automatically converting
 * old Love2D-style scripts to use enjin2's native API.
 */

export class ScriptTransformer {
  /**
   * Transform a Lua script from Love2D syntax to enjin2 native syntax
   */
  static transformToEnjin2(script: string): string {
    let transformed = script;
    
    // Transform graphics.* calls to native enjin2 functions
    const transformations: [RegExp, string][] = [
      // Canvas dimension functions
      [/graphics\.getWidth\(\)/g, 'getWidth()'],
      [/graphics\.getHeight\(\)/g, 'getHeight()'],
      
      // Drawing functions
      [/graphics\.clear\(/g, 'clear('],
      [/graphics\.setColor\(/g, 'setColor('],
      [/graphics\.getColor\(\)/g, 'getColor()'],
      [/graphics\.setLineWidth\(/g, 'setLineWidth('],
      [/graphics\.getLineWidth\(\)/g, 'getLineWidth()'],
      
      // Shape drawing functions
      [/graphics\.line\(/g, 'line('],
      [/graphics\.rectangle\(/g, 'rectangle('],
      [/graphics\.circle\(/g, 'circle('],
      [/graphics\.point\(/g, 'point('],
      [/graphics\.print\(/g, 'print('],
      
      // Pixel functions
      [/graphics\.setPixel\(/g, 'setPixel('],
      [/graphics\.getPixel\(/g, 'getPixel('],
      
      // Common love.* calls
      [/love\.graphics\.getWidth\(\)/g, 'getWidth()'],
      [/love\.graphics\.getHeight\(\)/g, 'getHeight()'],
      [/love\.graphics\.clear\(/g, 'clear('],
      [/love\.graphics\.setColor\(/g, 'setColor('],
      [/love\.graphics\.line\(/g, 'line('],
      [/love\.graphics\.rectangle\(/g, 'rectangle('],
      [/love\.graphics\.circle\(/g, 'circle('],
      [/love\.graphics\.point\(/g, 'point('],
      [/love\.graphics\.print\(/g, 'print('],
    ];
    
    // Apply all transformations
    for (const [pattern, replacement] of transformations) {
      transformed = transformed.replace(pattern, replacement);
    }
    
    return transformed;
  }
  
  /**
   * Check if a script contains Love2D syntax that needs transformation
   */
  static needsTransformation(script: string): boolean {
    const love2dPatterns = [
      /graphics\./,
      /love\.graphics\./
    ];
    
    return love2dPatterns.some(pattern => pattern.test(script));
  }
  
  /**
   * Get a summary of transformations that would be applied
   */
  static getTransformationSummary(script: string): string[] {
    const changes: string[] = [];
    
    if (script.includes('graphics.getWidth()')) {
      changes.push('graphics.getWidth() → getWidth()');
    }
    if (script.includes('graphics.getHeight()')) {
      changes.push('graphics.getHeight() → getHeight()');
    }
    if (script.includes('graphics.clear(')) {
      changes.push('graphics.clear() → clear()');
    }
    if (script.includes('graphics.setColor(')) {
      changes.push('graphics.setColor() → setColor()');
    }
    if (script.includes('graphics.line(')) {
      changes.push('graphics.line() → line()');
    }
    if (script.includes('graphics.rectangle(')) {
      changes.push('graphics.rectangle() → rectangle()');
    }
    if (script.includes('graphics.circle(')) {
      changes.push('graphics.circle() → circle()');
    }
    if (script.includes('love.graphics.')) {
      changes.push('love.graphics.* → native enjin2 functions');
    }
    
    return changes;
  }
}