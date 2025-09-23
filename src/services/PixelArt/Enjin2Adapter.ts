/**
 * Enjin2Adapter - Pure enjin2 native API adapter for DROP
 * 
 * This adapter provides the native enjin2 Lua API without any Love2D compatibility.
 * It exposes the exact same functions available on Eisei hardware.
 */

export const Enjin2LuaAPI = `
-- enjin2 Native Lua API
-- This provides the exact same API as Eisei hardware

-- Frame variables (set externally for each frame)
f = f or 0
f_amt = f_amt or 1

-- Canvas dimensions (set externally)
canvas_width = canvas_width or 127
canvas_height = canvas_height or 127

-- enjin2 drawing state
local _current_color = 15  -- White (0-15 grayscale)
local _line_width = 1

-- Core enjin2 functions exposed from C++:
-- getWidth() - Get canvas width
-- getHeight() - Get canvas height  
-- clear(color) - Clear canvas
-- setPixel(x, y, color) - Set pixel
-- getPixel(x, y) - Get pixel
-- line(x1, y1, x2, y2, color) - Draw line
-- rectangle(mode, x, y, w, h, color) - Draw rectangle ("fill" or "line")
-- circle(mode, x, y, radius, color) - Draw circle ("fill" or "line")
-- triangle(x1, y1, x2, y2, x3, y3, color) - Draw triangle
-- point(x, y, color) - Draw point
-- setColor(color) - Set current drawing color
-- getColor() - Get current drawing color
-- time() - Get current time for animations
-- print(text) - Print debug text

-- Helper functions for enjin2 API
function setColor(color)
    _current_color = math.max(0, math.min(15, math.floor(color)))
end

function getColor()
    return _current_color
end

function setLineWidth(width)
    _line_width = math.max(1, math.floor(width))
end

function getLineWidth()
    return _line_width
end

-- Drawing functions that use current color
function point(x, y)
    setPixel(math.floor(x), math.floor(y), _current_color)
end

function line(x1, y1, x2, y2)
    -- Use the native line function with current color
    line(math.floor(x1), math.floor(y1), math.floor(x2), math.floor(y2), _current_color)
end

function rectangle(mode, x, y, width, height)
    local filled = (mode == "fill")
    rectangle(mode, math.floor(x), math.floor(y), math.floor(width), math.floor(height), _current_color)
end

function circle(mode, x, y, radius)
    local filled = (mode == "fill")
    circle(mode, math.floor(x), math.floor(y), math.floor(radius), _current_color)
end

function triangle(x1, y1, x2, y2, x3, y3)
    triangle(math.floor(x1), math.floor(y1), math.floor(x2), math.floor(y2), math.floor(x3), math.floor(y3), _current_color)
end

-- Canvas utility functions
function getDimensions()
    return getWidth(), getHeight()
end

-- Convenient aliases
function cls(color)
    clear(color or 0)
end

function pix(x, y, color)
    if color then
        setPixel(x, y, color)
    else
        return getPixel(x, y)
    end
end

-- Mathematical helpers
function clamp(value, min_val, max_val)
    return math.max(min_val, math.min(max_val, value))
end

function lerp(a, b, t)
    return a + (b - a) * clamp(t, 0, 1)
end

function smoothstep(t)
    t = clamp(t, 0, 1)
    return t * t * (3 - 2 * t)
end

-- Color helpers for 4-bit grayscale
function gray(intensity)
    return math.floor(intensity * 15)
end

function fade(color, amount)
    return math.floor(color * clamp(amount, 0, 1))
end

-- Simple noise function (matches enjin2 hardware)
function noise(x, y, scale)
    scale = scale or 1
    x = math.floor(x * scale)
    y = math.floor(y * scale)
    
    local hash = x * 374761393 + y * 668265263
    hash = hash ~ (hash >> 13) * 1274126177
    hash = hash ~ (hash >> 16)
    
    return math.abs(hash % 16)
end

-- Distance function
function dist(x1, y1, x2, y2)
    local dx = x2 - x1
    local dy = y2 - y1
    return math.sqrt(dx * dx + dy * dy)
end

-- Make functions global for script access
_G.setColor = setColor
_G.getColor = getColor
_G.setLineWidth = setLineWidth
_G.getLineWidth = getLineWidth
_G.point = point
_G.line = line
_G.rectangle = rectangle
_G.circle = circle
_G.triangle = triangle
_G.getDimensions = getDimensions
_G.cls = cls
_G.pix = pix
_G.clamp = clamp
_G.lerp = lerp
_G.smoothstep = smoothstep
_G.gray = gray
_G.fade = fade
_G.noise = noise
_G.dist = dist
`;

/**
 * Initialize enjin2 native Lua API
 */
export function initializeEnjin2API(scriptSystem: any, _enjin2Module: any, _luaCanvas: any): void {
  // The LuaScriptSystem.initialize() should have already called bindings.registerAll()
  // which registers all the global drawing functions like clear, setColor, point, line, etc.
  
  // Don't override the C++ functions with Lua wrappers - just add helper functions
  const helperAPI = `
    -- Helper functions that don't conflict with C++ bindings
    local _current_color = 15  -- White (0-15 grayscale)
    
    -- Color state management
    function setColor(color)
        _current_color = math.max(0, math.min(15, math.floor(color)))
    end
    
    function getColor()
        return _current_color
    end
    
    -- Convenient aliases
    function cls(color)
        clear(color or 0)
    end
    
    function pix(x, y, color)
        if color then
            setPixel(x, y, color)
        else
            return getPixel(x, y)
        end
    end
    
    -- Mathematical helpers
    function clamp(value, min_val, max_val)
        return math.max(min_val, math.min(max_val, value))
    end
    
    function lerp(a, b, t)
        return a + (b - a) * clamp(t, 0, 1)
    end
    
    -- Color helpers for 4-bit grayscale
    function gray(intensity)
        return math.floor(intensity * 15)
    end
    
    -- Distance function
    function dist(x1, y1, x2, y2)
        local dx = x2 - x1
        local dy = y2 - y1
        return math.sqrt(dx * dx + dy * dy)
    end
  `;
  
  // Execute the helper API (without overriding C++ functions)
  const result = scriptSystem.executeScript(helperAPI);
  if (!result.success) {
    console.error('Failed to initialize enjin2 helper API:', result.error);
  } else {
    console.log('✅ enjin2 helper API initialized successfully');
  }
  
  // Add optimized drawing functions that use native C++ fast implementations
  const optimizedDrawingAPI = `
    -- Override common functions with optimized versions when beneficial
    -- These use the native fastFillRect and fastDrawLine functions registered in C++
    
    local _original_rectangle = rectangle
    function rectangle(mode, x, y, w, h, color)
        -- Use fast version for filled rectangles larger than 4x4 pixels
        if mode == "fill" and w > 4 and h > 4 then
            fastFillRect(math.floor(x), math.floor(y), math.floor(w), math.floor(h), color or _current_color)
        else
            _original_rectangle(mode, x, y, w, h, color or _current_color)
        end
    end
    
    local _original_line = line  
    function line(x1, y1, x2, y2, color)
        -- Use fast version for longer lines (>8 pixels in any direction)
        local dx = math.abs(x2 - x1)
        local dy = math.abs(y2 - y1)
        if dx > 8 or dy > 8 then
            fastDrawLine(math.floor(x1), math.floor(y1), math.floor(x2), math.floor(y2), color or _current_color)
        else
            _original_line(x1, y1, x2, y2, color or _current_color)
        end
    end
    
    -- Provide direct access to fast functions for manual optimization
    -- Usage: fastFillRect(x, y, w, h, color) - no embind overhead
    -- Usage: fastDrawLine(x1, y1, x2, y2, color) - optimized Bresenham
  `;
  
  const optimizedResult = scriptSystem.executeScript(optimizedDrawingAPI);
  if (!optimizedResult.success) {
    console.error('Failed to initialize optimized drawing API:', optimizedResult.error);
  } else {
    console.log('✅ Optimized drawing API initialized - fast rectangles and lines available');
  }
}