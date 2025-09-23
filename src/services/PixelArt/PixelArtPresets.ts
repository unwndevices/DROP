/**
 * PixelArtPresets - Collection of example scripts for pixel art generation
 * 
 * These presets demonstrate enjin2's native Lua API and provide starting points
 * for users to create their own pixel art animations.
 */

export interface PixelArtPreset {
  id: string;
  name: string;
  description: string;
  frameCount: number;
  script: string;
}

export const PIXEL_ART_PRESETS: PixelArtPreset[] = [
  {
    id: 'waveform-transition',
    name: 'Waveform Transition',
    description: 'Animated transition between sine, triangle, and square waves',
    frameCount: 30,
    script: `-- Waveform Transition: Sine → Triangle → Square  
-- Animation progresses through three waveform types over time
-- Uses f (frame index) and f_amt (total frames) for smooth transitions

clear(0)  -- Clear to black

-- Canvas dimensions and center
local w = getWidth()
local h = getHeight()
local cx = w / 2
local cy = h / 2

-- Animation progress (0 to 1 over all frames)
local progress = f / (f_amt - 1)

-- Waveform parameters
local amplitude = 25  -- Wave height
local frequency = 1   -- Single revolution across width

-- Helper functions
local function clamp(value, min_val, max_val)
    return math.max(min_val, math.min(max_val, value))
end

-- Smooth transition function (ease in/out)
local function smoothstep(t)
    t = clamp(t, 0, 1)
    return t * t * (3 - 2 * t)
end

-- Calculate which waveforms to blend and their weights
local sine_val, triangle_val, square_val = 0, 0, 0

if progress < 0.5 then
    -- First half: Sine to Triangle
    local blend = smoothstep(progress * 2)  -- 0 to 1 over first half
    sine_val = 1 - blend
    triangle_val = blend
else
    -- Second half: Triangle to Square  
    local blend = smoothstep((progress - 0.5) * 2)  -- 0 to 1 over second half
    triangle_val = 1 - blend
    square_val = blend
end

-- Generate waveform points
local points = {}
for x = 0, w - 1 do
    local t = x / w * frequency * 2 * math.pi
    local y_value = 0
    
    -- Calculate each waveform value
    local sine = math.sin(t)
    
    -- Triangle wave (sawtooth approach for cleaner transitions)
    local cycle_pos = (t / (2 * math.pi)) % 1
    local triangle
    if cycle_pos < 0.5 then
        triangle = 4 * cycle_pos - 1  -- -1 to 1 over first half
    else
        triangle = 3 - 4 * cycle_pos   -- 1 to -1 over second half
    end
    
    -- Square wave
    local square = math.sin(t) >= 0 and 1 or -1
    
    -- Blend the waveforms (weights always sum to 1, maintaining amplitude)
    y_value = sine_val * sine + triangle_val * triangle + square_val * square
    
    -- Scale and center the wave
    local y = cy + y_value * amplitude
    table.insert(points, {x = x, y = y})
end

-- Draw the waveform using lines with thickness
for i = 1, #points - 1 do
    local p1 = points[i]
    local p2 = points[i + 1]
    
    -- Color based on current phase
    local brightness = 0.9
    if sine_val > 0.5 then
        brightness = 0.7  -- Dimmer for sine
    elseif triangle_val > 0.5 then
        brightness = 0.85  -- Medium for triangle
    else
        brightness = 1.0  -- Brightest for square
    end
    
    local color_value = math.floor(brightness * 15)
    
    -- Draw multiple lines for thickness (works for all angles)
    line(p1.x, p1.y, p2.x, p2.y, color_value)  -- Center line
    line(p1.x, p1.y + 1, p2.x, p2.y + 1, color_value)  -- Line above
    line(p1.x, p1.y - 1, p2.x, p2.y - 1, color_value)  -- Line below
    line(p1.x + 1, p1.y, p2.x + 1, p2.y, color_value)  -- Line right
    line(p1.x - 1, p1.y, p2.x - 1, p2.y, color_value)  -- Line left
end

-- Draw center line for reference
setColor(3)  -- Gray
line(0, cy, w - 1, cy)

-- Draw phase indicator as dots since enjin2 doesn't have built-in text
setColor(12)  -- Bright color for indicators

-- Phase indicators using simple patterns
if sine_val > 0.5 then
    -- S pattern for Sine
    for i = 0, 4 do
        point(5 + i, 5 + (i % 2))
    end
elseif triangle_val > 0.5 then
    -- T pattern for Triangle  
    for i = 0, 4 do
        point(5 + i, 5)
        if i == 2 then
            point(5 + i, 6)
            point(5 + i, 7)
        end
    end
else
    -- Square pattern
    rectangle("line", 5, 5, 4, 3)
end

-- Frame counter as dots
local frame_dots = f % 8
for i = 0, frame_dots do
    point(5 + i, h - 5)
end`
  },
  
  {
    id: 'rotating-squares',
    name: 'Rotating Squares',
    description: 'Concentric squares rotating at different speeds',
    frameCount: 60,
    script: `-- Rotating Squares
-- Multiple squares rotating at different speeds and sizes

clear(0)  -- Clear to black

local w = getWidth()
local h = getHeight()
local cx = w / 2
local cy = h / 2

-- Animation progress
local time = f / f_amt * 2 * math.pi

-- Draw multiple rotating squares
for i = 1, 4 do
    local size = 10 + i * 15
    local rotation = time * (i * 0.5)  -- Different speeds
    local brightness = 15 - i * 3     -- Fade with distance
    
    -- Calculate square corners
    local half_size = size / 2
    local cos_r = math.cos(rotation)
    local sin_r = math.sin(rotation)
    
    -- Rotate points around center
    local points = {}
    local corners = {
        {-half_size, -half_size},
        { half_size, -half_size},
        { half_size,  half_size},
        {-half_size,  half_size}
    }
    
    for j = 1, 4 do
        local x, y = corners[j][1], corners[j][2]
        local rx = x * cos_r - y * sin_r + cx
        local ry = x * sin_r + y * cos_r + cy
        table.insert(points, {math.floor(rx), math.floor(ry)})
    end
    
    -- Draw square outline
    setColor(brightness)
    for j = 1, 4 do
        local p1 = points[j]
        local p2 = points[j % 4 + 1]
        line(p1[1], p1[2], p2[1], p2[2])
    end
end

-- Draw center dot
setColor(15)
point(cx, cy)`
  },
  
  {
    id: 'ripple-effect',
    name: 'Ripple Effect',
    description: 'Expanding ripples with fade effect',
    frameCount: 40,
    script: `-- Ripple Effect
-- Expanding circles with fade effect

clear(0)

local w = getWidth()
local h = getHeight()
local cx = w / 2
local cy = h / 2

-- Animation progress
local time = f / f_amt

-- Multiple ripples at different phases
for i = 0, 3 do
    local phase = (time + i * 0.25) % 1  -- Offset each ripple
    local radius = phase * 50             -- Expand over time
    local brightness = (1 - phase) * 15   -- Fade as it expands
    
    if brightness > 1 then
        setColor(math.floor(brightness))
        circle("line", cx, cy, math.floor(radius))
    end
end

-- Draw center pulse
local pulse = math.sin(time * 4 * math.pi) * 0.5 + 0.5
setColor(math.floor(pulse * 15))
circle("fill", cx, cy, 3)`
  },
  
  {
    id: 'pixel-matrix',
    name: 'Digital Matrix',
    description: 'Matrix-style falling code effect',
    frameCount: 50,
    script: `-- Digital Matrix Effect
-- Falling digital rain pattern

clear(0)

local w = getWidth()
local h = getHeight()

-- Create falling streams
for x = 0, w - 1, 8 do  -- Every 8 pixels
    local stream_speed = 2 + (x % 3)  -- Different speeds
    local stream_offset = (f * stream_speed) % (h + 20)
    
    -- Draw falling characters as vertical lines
    for y = 0, 15 do
        local pixel_y = stream_offset - y * 6
        
        if pixel_y >= 0 and pixel_y < h then
            -- Brightness decreases with distance from head
            local brightness = math.max(0, 15 - y)
            if brightness > 0 then
                setColor(brightness)
                -- Draw a simple "character" pattern
                point(x, pixel_y)
                if y % 2 == 0 then
                    point(x + 1, pixel_y)
                end
                if y % 3 == 0 then
                    point(x, pixel_y + 1)
                end
            end
        end
    end
end`
  },
  
  {
    id: 'plasma-field',
    name: 'Plasma Field',
    description: 'Animated plasma effect using sine waves',
    frameCount: 80,
    script: `-- Plasma Field
-- Classic plasma effect using sine wave interference

clear(0)

local w = getWidth()
local h = getHeight()
local time = f / f_amt * 2 * math.pi

-- Generate plasma field
for y = 0, h - 1 do
    for x = 0, w - 1 do
        -- Multiple sine wave interference
        local plasma = 0
        plasma = plasma + math.sin(x / 16 + time)
        plasma = plasma + math.sin(y / 16 + time * 1.5)
        plasma = plasma + math.sin((x + y) / 16 + time * 0.5)
        plasma = plasma + math.sin(math.sqrt(x*x + y*y) / 8 + time * 2)
        
        -- Normalize to 0-15 range
        local intensity = math.floor((plasma + 4) * 15 / 8)
        intensity = math.max(0, math.min(15, intensity))
        
        -- Only draw if intensity is above threshold for performance
        if intensity > 2 then
            setColor(intensity)
            point(x, y)
        end
    end
end`
  },
  
  {
    id: 'simple-test',
    name: 'Simple Test',
    description: 'Basic test to verify enjin2 functions work',
    frameCount: 1,
    script: `-- Simple Test
-- Basic test of enjin2 drawing functions

clear(0)  -- Clear canvas

local w = getWidth()
local h = getHeight()
local cx = w / 2
local cy = h / 2

-- Draw basic shapes to test functions
setColor(15)  -- White
point(10, 10)  -- Test point

setColor(12)  -- Bright gray  
line(20, 20, 40, 30)  -- Test line

setColor(8)   -- Medium gray
rectangle("line", 50, 20, 20, 15)  -- Test rectangle outline

setColor(6)   -- Dark gray
rectangle("fill", 55, 25, 10, 5)   -- Test filled rectangle

setColor(10)  -- Light gray
circle("line", cx, cy, 20)  -- Test circle outline

setColor(4)   -- Very dark gray
circle("fill", cx, cy, 5)   -- Test filled circle

-- Test pixel access
setColor(14)
for i = 0, 5 do
    point(10 + i, h - 10)
end`
  }
];

/**
 * Get a preset by ID
 */
export function getPresetById(id: string): PixelArtPreset | undefined {
  return PIXEL_ART_PRESETS.find(preset => preset.id === id);
}

/**
 * Get the default preset (first one)
 */
export function getDefaultPreset(): PixelArtPreset {
  return PIXEL_ART_PRESETS[0];
}