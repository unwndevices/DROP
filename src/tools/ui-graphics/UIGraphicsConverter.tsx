import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Play, Pause, Code } from 'lucide-react';
import * as Slider from '@radix-ui/react-slider';

// Import design system components
import {
  ToolLayout,
  Button,
  Card,
  CardHeader,
  CardBody,
  Input,
  StatusIndicator
} from '../../design-system';




const CANVAS_SIZE = 127;
const DEFAULT_FILENAME = 'ui_animation';
const PREVIEW_SCALE = 4;

// Storage keys
const STORAGE_KEYS = {
  IMAGES: 'drop-ui-graphics-images',
  FPS: 'drop-ui-graphics-fps',
  LEVELS: 'drop-ui-graphics-levels',
  FILENAME: 'drop-ui-graphics-filename',
  EXPORT_MODE: 'drop-ui-graphics-export-mode'
};

type LevelSettings = {
  black: number;
  gray: number;
  white: number;
};

const DEFAULT_LEVELS: LevelSettings = {
  black: 0,
  gray: 128,
  white: 255
};

const clampLevelValue = (value: number) => Math.min(Math.max(Math.round(value), 0), 255);

const normalizeLevels = (incoming: LevelSettings): LevelSettings => {
  const black = clampLevelValue(incoming.black);
  const white = clampLevelValue(Math.max(incoming.white, incoming.black + 1));
  const grayCandidate = clampLevelValue(incoming.gray);
  const gray = Math.min(Math.max(grayCandidate, black), white);
  return { black, gray, white };
};

export const UIGraphicsConverter: React.FC = () => {
  const [images, setImages] = useState<HTMLImageElement[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [displayFrame, setDisplayFrame] = useState(0);
  const [fps, setFps] = useState(() => {
    const savedFps = localStorage.getItem(STORAGE_KEYS.FPS);
    return savedFps ? parseInt(savedFps) : 12;
  });
  const [levels, setLevels] = useState<LevelSettings>(() => {
    const savedLevels = localStorage.getItem(STORAGE_KEYS.LEVELS);
    if (savedLevels) {
      try {
        const parsed = JSON.parse(savedLevels) as Partial<LevelSettings>;
        return normalizeLevels({
          black: typeof parsed.black === 'number' ? parsed.black : DEFAULT_LEVELS.black,
          gray: typeof parsed.gray === 'number' ? parsed.gray : DEFAULT_LEVELS.gray,
          white: typeof parsed.white === 'number' ? parsed.white : DEFAULT_LEVELS.white
        });
      } catch {
        return DEFAULT_LEVELS;
      }
    }
    return DEFAULT_LEVELS;
  });
  const [filename, setFilename] = useState(() => {
    return localStorage.getItem(STORAGE_KEYS.FILENAME) || '';
  });
  const [exportMode, setExportMode] = useState<'4bit' | '1bit'>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.EXPORT_MODE);
    return saved === '1bit' ? '1bit' : '4bit';
  });
  const [generatedCode, setGeneratedCode] = useState<string>('');
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'error'>('idle');

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const lastFrameTime = useRef(0);
  const currentFrameRef = useRef(0);
  const copyResetRef = useRef<number | null>(null);

  const updateLevels = useCallback((partial: Partial<LevelSettings>) => {
    setLevels((prev) => normalizeLevels({ ...prev, ...partial }));
  }, []);

  const mappedLevels = useMemo(() => {
    return {
      black: levels.black / 255,
      gray: levels.gray / 255,
      white: levels.white / 255
    };
  }, [levels]);

  const remapGrayscale = useCallback(
    (value: number) => {
      const { black, gray, white } = mappedLevels;
      const clampedInput = Math.min(Math.max(value, 0), 1);

      if (clampedInput <= 0.5) {
        const t = clampedInput / 0.5;
        const result = black + t * (gray - black);
        return Math.min(Math.max(result, 0), 1);
      }

      const t = (clampedInput - 0.5) / 0.5;
      const result = gray + t * (white - gray);
      return Math.min(Math.max(result, 0), 1);
    },
    [mappedLevels]
  );

  const applyLevelsToContext = useCallback(
    (ctx: CanvasRenderingContext2D, width: number, height: number) => {
      const imageData = ctx.getImageData(0, 0, width, height);
      const data = imageData.data;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const grayscale = 0.299 * r + 0.587 * g + 0.114 * b;
        const normalized = grayscale / 255;
        const adjusted = remapGrayscale(normalized);
        const value = Math.round(adjusted * 255);
        data[i] = value;
        data[i + 1] = value;
        data[i + 2] = value;
      }

      ctx.putImageData(imageData, 0, 0);
    },
    [remapGrayscale]
  );

  const levelSliderValues = useMemo(() => [levels.black, levels.gray, levels.white], [levels]);

  const handleLevelSliderChange = useCallback(
    (value: number[]) => {
      if (value.length !== 3) return;
      const [black, gray, white] = value.map(clampLevelValue);
      updateLevels({ black, gray, white });
    },
    [updateLevels]
  );

  const handleLevelInputChange = useCallback(
    (key: keyof LevelSettings) => (event: React.ChangeEvent<HTMLInputElement>) => {
      const parsed = parseInt(event.target.value, 10);
      if (Number.isNaN(parsed)) {
        updateLevels({ [key]: 0 });
        return;
      }
      updateLevels({ [key]: parsed });
    },
    [updateLevels]
  );

  // Save settings to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.FPS, fps.toString());
  }, [fps]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.LEVELS, JSON.stringify(levels));
  }, [levels]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.FILENAME, filename);
  }, [filename]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.EXPORT_MODE, exportMode);
  }, [exportMode]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).filter(file =>
      file.type === 'image/png' || file.type === 'image/bmp'
    );

    if (files.length === 0) return;

    Promise.all(
      files.map(file => {
        return new Promise<HTMLImageElement>((resolve) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.src = URL.createObjectURL(file);
        });
      })
    ).then(newImages => {
      setImages(newImages);
      setDisplayFrame(0);
      localStorage.setItem(STORAGE_KEYS.IMAGES, JSON.stringify(newImages.map(img => img.src)));
    });
  };

  // Animation loop
  useEffect(() => {
    if (!isPlaying || images.length === 0) return;

    const animate = (timestamp: number) => {
      if (timestamp - lastFrameTime.current >= 1000 / fps) {
        currentFrameRef.current = (currentFrameRef.current + 1) % images.length;
        setDisplayFrame(currentFrameRef.current);
        lastFrameTime.current = timestamp;
      }
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, images.length, fps]);

  useEffect(() => {
    return () => {
      if (copyResetRef.current) {
        window.clearTimeout(copyResetRef.current);
      }
    };
  }, []);

  // Draw frame onto preview canvas using nearest-neighbor scaling
  const drawFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const currentImg = images[displayFrame];
    const targetWidth = currentImg?.naturalWidth || CANVAS_SIZE;
    const targetHeight = currentImg?.naturalHeight || CANVAS_SIZE;

    if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
      canvas.width = targetWidth;
      canvas.height = targetHeight;
    }

    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, targetWidth, targetHeight);

    if (currentImg) {
      ctx.drawImage(currentImg, 0, 0, targetWidth, targetHeight);
      applyLevelsToContext(ctx, targetWidth, targetHeight);
    }
  }, [displayFrame, images, applyLevelsToContext]);

  useEffect(() => {
    drawFrame();
  }, [drawFrame]);

  const generateCode = () => {
    if (images.length === 0) {
      setGeneratedCode('// No images loaded');
      return;
    }

    const includePacked4Bit = exportMode === '4bit';
    const includePacked1Bit = exportMode === '1bit';

    setCopyStatus('idle');

    const firstImage = images[0];
    const frameWidth = firstImage?.naturalWidth || CANVAS_SIZE;
    const frameHeight = firstImage?.naturalHeight || CANVAS_SIZE;

    const offscreenCanvas = document.createElement('canvas');
    offscreenCanvas.width = frameWidth;
    offscreenCanvas.height = frameHeight;
    const ctx = offscreenCanvas.getContext('2d');

    if (!ctx) {
      setGeneratedCode('// Failed to acquire canvas context');
      return;
    }

    const baseFilename = (filename || '').trim() || DEFAULT_FILENAME;
    const fourBitFrames: Uint8Array[] = [];
    const oneBitFrames: Uint8Array[] = [];
    const isSingleFrame = images.length === 1;

    const ensureIdentifier = (name: string) => {
      const sanitized = name.replace(/[^a-zA-Z0-9_]/g, '_');
      if (sanitized.length === 0) {
        return DEFAULT_FILENAME;
      }
      return /^[0-9]/.test(sanitized) ? `ui_${sanitized}` : sanitized;
    };

    const formatByteArray = (bytes: Uint8Array, perLine = 16) => {
      const rows: string[] = [];

      for (let start = 0; start < bytes.length; start += perLine) {
        const slice = bytes.slice(start, start + perLine);
        const formattedValues = Array.from(slice).map((value) => `0x${value.toString(16).padStart(2, '0')}`);
        rows.push(`    ${formattedValues.join(', ')},`);
      }

      return rows.join('\n');
    };

    const formatFrameSection = (framesData: Uint8Array[], isSingleFrame: boolean) => {
      if (isSingleFrame) {
        // Single frame - output as simple array
        const formattedBytes = formatByteArray(framesData[0]);
        return formattedBytes;
      } else {
        // Multiple frames - output as array of frames
        return framesData
          .map((frame, index) => {
            const formattedBytes = formatByteArray(frame);
            return `  { // Frame ${index}\n${formattedBytes}\n  },`;
          })
          .join('\n');
      }
    };

    const bytesPerRow4Bit = includePacked4Bit ? Math.ceil(frameWidth / 2) : 0;
    const bytesPerFrame4Bit = includePacked4Bit ? bytesPerRow4Bit * frameHeight : 0;
    const bytesPerRow1Bit = includePacked1Bit ? Math.ceil(frameWidth / 8) : 0;
    const bytesPerFrame1Bit = includePacked1Bit ? bytesPerRow1Bit * frameHeight : 0;

    const oddWidthPadMask4Bit = frameWidth % 2 !== 0 ? 0xF0 : null;
    const unusedBitMask1Bit = frameWidth % 8 === 0 ? null : (1 << (8 - (frameWidth % 8))) - 1;

    const grayThreshold = mappedLevels.gray;

    images.forEach((img) => {
      ctx.clearRect(0, 0, frameWidth, frameHeight);
      ctx.drawImage(img, 0, 0, frameWidth, frameHeight);
      const { data } = ctx.getImageData(0, 0, frameWidth, frameHeight);
      const adjusted = new Float32Array(frameWidth * frameHeight);

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const grayscale = 0.299 * r + 0.587 * g + 0.114 * b;
        const normalizedValue = remapGrayscale(grayscale / 255);
        adjusted[i / 4] = normalizedValue;
      }

      if (includePacked4Bit) {
        const packed = new Uint8Array(bytesPerFrame4Bit);
        for (let y = 0; y < frameHeight; y++) {
          const srcRowOffset = y * frameWidth;
          const dstRowOffset = y * bytesPerRow4Bit;
          for (let x = 0; x < frameWidth; x++) {
            const gray = adjusted[srcRowOffset + x];
            const nibble = Math.min(Math.max(Math.round(gray * 15), 0), 15);
            const byteIndex = dstRowOffset + Math.floor(x / 2);
            if ((x & 1) === 0) {
              packed[byteIndex] = (packed[byteIndex] & 0x0F) | (nibble << 4);
            } else {
              packed[byteIndex] = (packed[byteIndex] & 0xF0) | nibble;
            }
          }

          if (oddWidthPadMask4Bit !== null) {
            const lastByteIndex = dstRowOffset + bytesPerRow4Bit - 1;
            packed[lastByteIndex] &= oddWidthPadMask4Bit;
          }
        }
        fourBitFrames.push(packed);
      }

      if (includePacked1Bit) {
        const packed = new Uint8Array(bytesPerFrame1Bit);
        for (let y = 0; y < frameHeight; y++) {
          const rowOffset = y * frameWidth;
          const dstRowOffset = y * bytesPerRow1Bit;
          for (let x = 0; x < frameWidth; x++) {
            const idx = rowOffset + x;
            if (adjusted[idx] >= grayThreshold) {
              const byteIndex = dstRowOffset + Math.floor(x / 8);
              const bit = 7 - (x % 8);
              packed[byteIndex] |= 1 << bit;
            }
          }

          if (unusedBitMask1Bit !== null) {
            const lastByteIndex = dstRowOffset + bytesPerRow1Bit - 1;
            const clearMask = 0xFF ^ unusedBitMask1Bit;
            packed[lastByteIndex] &= clearMask;
          }
        }
        oneBitFrames.push(packed);
      }
    });

    const identifierBase = ensureIdentifier(baseFilename);
    const lines: string[] = [];

    if (isSingleFrame) {
      // Single frame output format
      lines.push('// Generated UI Graphics Image');
      lines.push(`// Filename: ${baseFilename}`);
      lines.push(`// Single frame image`);
      lines.push(`// Levels: black=${levels.black}, gray=${levels.gray}, white=${levels.white}`);
      lines.push('');
      lines.push('#include <stdint.h>');
      lines.push('');
      lines.push(`static const uint16_t ${identifierBase}_width = ${frameWidth};`);
      lines.push(`static const uint16_t ${identifierBase}_height = ${frameHeight};`);
      lines.push('');

      if (includePacked4Bit) {
        const arrayName = `${identifierBase}_data_4bit`;
        lines.push(`// 4-bit packed image data (2 pixels per byte)`);
        lines.push(`static const uint8_t ${arrayName}[${bytesPerFrame4Bit}] = {`);
        lines.push(formatFrameSection(fourBitFrames, true));
        lines.push('};');
        lines.push('');
      }

      if (includePacked1Bit) {
        const arrayName = `${identifierBase}_data_1bit`;
        lines.push(`// 1-bit packed image data (${bytesPerRow1Bit} byte${bytesPerRow1Bit !== 1 ? 's' : ''} per row)`);
        lines.push(`static const uint8_t ${arrayName}[${bytesPerFrame1Bit}] = {`);
        lines.push(formatFrameSection(oneBitFrames, true));
        lines.push('};');
        lines.push('');
      }
    } else {
      // Multi-frame animation output format
      lines.push('// Generated UI Graphics Animation');
      lines.push(`// Filename: ${baseFilename}`);
      lines.push(`// Frame count: ${images.length}`);
      lines.push(`// FPS: ${fps}`);
      lines.push(`// Levels: black=${levels.black}, gray=${levels.gray}, white=${levels.white}`);
      lines.push('');
      lines.push('#include <stdint.h>');
      lines.push('');
      lines.push(`static const uint16_t ${identifierBase}_frame_width = ${frameWidth};`);
      lines.push(`static const uint16_t ${identifierBase}_frame_height = ${frameHeight};`);
      lines.push(`static const uint16_t ${identifierBase}_frame_count = ${images.length};`);
      lines.push('');

      if (includePacked4Bit) {
        const arrayName = `${identifierBase}_frames_4bit`;
        lines.push(`static const uint16_t ${identifierBase}_frame_stride_4bit = ${bytesPerRow4Bit};`);
        lines.push(`static const uint16_t ${identifierBase}_frame_bytes_4bit = ${bytesPerFrame4Bit};`);
        lines.push(`// 4-bit packed frames (2 pixels per byte)`);
        lines.push(`static const uint8_t ${arrayName}[${images.length}][${bytesPerFrame4Bit}] = {`);
        lines.push(formatFrameSection(fourBitFrames, false));
        lines.push('};');
        lines.push('');
      }

      if (includePacked1Bit) {
        const arrayName = `${identifierBase}_frames_1bit`;
        lines.push(`static const uint16_t ${identifierBase}_frame_stride_1bit = ${bytesPerRow1Bit};`);
        lines.push(`static const uint16_t ${identifierBase}_frame_bytes_1bit = ${bytesPerFrame1Bit};`);
        lines.push(`// 1-bit packed frames (${bytesPerRow1Bit} byte${bytesPerRow1Bit !== 1 ? 's' : ''} per row)`);
        lines.push(`static const uint8_t ${arrayName}[${images.length}][${bytesPerFrame1Bit}] = {`);
        lines.push(formatFrameSection(oneBitFrames, false));
        lines.push('};');
        lines.push('');
      }
    }

    lines.push('// End of generated data');

    setGeneratedCode(lines.join('\n'));
  };

  const handleCopyCode = useCallback(() => {
    if (!generatedCode) return;

    const copyAction = async () => {
      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(generatedCode);
        } else {
          const temp = document.createElement('textarea');
          temp.value = generatedCode;
          temp.setAttribute('readonly', '');
          temp.style.position = 'absolute';
          temp.style.left = '-9999px';
          document.body.appendChild(temp);
          temp.select();
          document.execCommand('copy');
          document.body.removeChild(temp);
        }
        setCopyStatus('copied');
      } catch (error) {
        console.error('Failed to copy generated code', error);
        setCopyStatus('error');
      } finally {
        if (copyResetRef.current) {
          window.clearTimeout(copyResetRef.current);
        }
        copyResetRef.current = window.setTimeout(() => setCopyStatus('idle'), 2000);
      }
    };

    void copyAction();
  }, [generatedCode]);

  const handleSaveFile = useCallback(() => {
    if (!generatedCode) return;

    const baseFilename = (filename || '').trim() || DEFAULT_FILENAME;
    const finalFilename = `${baseFilename}.h`;

    try {
      const blob = new Blob([generatedCode], { type: 'text/x-c-header' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = finalFilename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to save file', error);
    }
  }, [generatedCode, filename]);

  const togglePlayback = () => {
    setIsPlaying(!isPlaying);
    if (!isPlaying) {
      currentFrameRef.current = displayFrame;
    }
  };

  // Create left panel (Controls)
  const inferredWidth = images[0]?.naturalWidth || CANVAS_SIZE;
  const inferredHeight = images[0]?.naturalHeight || CANVAS_SIZE;
  const oneBitStride = Math.ceil(inferredWidth / 8);

  const leftPanel = (
    <div className="p-3 flex flex-col gap-4">
      <Card>
        <CardHeader>File Import</CardHeader>
        <CardBody>
          <div className="mb-3">
            <div className="file-input-wrapper">
              <input
                type="file"
                multiple
                accept=".png,.bmp"
                onChange={handleFileSelect}
              />
            </div>
            <small className="text-muted">Select PNG or BMP files for animation</small>
          </div>

          <Input
            label="Output Filename"
            value={filename}
            onChange={(e) => setFilename(e.target.value)}
            placeholder="Enter filename for generated code"
          />
        </CardBody>
      </Card>

      <Card>
        <CardHeader>Animation Settings</CardHeader>
        <CardBody>
          <div className="mb-3">
            <label className="text-sm font-medium">FPS: {fps}</label>
            <Slider.Root
              className="relative flex items-center w-full h-5"
              value={[fps]}
              onValueChange={([value]) => setFps(value)}
              max={30}
              min={1}
              step={1}
            >
              <Slider.Track className="bg-secondary relative grow h-1 rounded-full">
                <Slider.Range className="absolute bg-accent h-full rounded-full" />
              </Slider.Track>
              <Slider.Thumb className="block w-3 h-3 bg-accent rounded-full focus:outline-none focus:shadow-glow" />
            </Slider.Root>
          </div>

          <div className="flex gap-2">
            <Button
              variant="primary"
              onClick={togglePlayback}
              disabled={images.length === 0}
              size="sm"
            >
              {isPlaying ? <Pause size={16} /> : <Play size={16} />}
              {isPlaying ? 'Pause' : 'Play'}
            </Button>

            <Button
              variant="secondary"
              onClick={generateCode}
              disabled={images.length === 0}
              size="sm"
            >
              <Code size={16} />
              Generate
            </Button>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>Level Controls</CardHeader>
        <CardBody>
          <div className="mb-3">
            <label className="text-sm font-medium">Black / Gray / White</label>
            <Slider.Root
              className="relative flex items-center w-full h-5"
              value={levelSliderValues}
              onValueChange={handleLevelSliderChange}
              max={255}
              min={0}
              step={1}
              minStepsBetweenThumbs={1}
            >
              <Slider.Track className="bg-secondary relative grow h-1 rounded-full">
                <Slider.Range className="absolute bg-accent h-full rounded-full" />
              </Slider.Track>
              {levelSliderValues.map((_, index) => (
                <Slider.Thumb
                  key={`level-thumb-${index}`}
                  className="block w-3 h-3 bg-accent rounded-full focus:outline-none focus:shadow-glow"
                />
              ))}
            </Slider.Root>
            <small className="text-muted">
              Adjust levels before packing to tune grayscale intensity across the animation.
            </small>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <Input
              label="Black"
              type="number"
              value={levels.black}
              onChange={handleLevelInputChange('black')}
              min={0}
              max={levels.gray}
              size="sm"
            />
            <Input
              label="Gray"
              type="number"
              value={levels.gray}
              onChange={handleLevelInputChange('gray')}
              min={levels.black}
              max={levels.white}
              size="sm"
            />
            <Input
              label="White"
              type="number"
              value={levels.white}
              onChange={handleLevelInputChange('white')}
              min={levels.gray}
              max={255}
              size="sm"
            />
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>Export Options</CardHeader>
        <CardBody>
          <div className="flex flex-col gap-3 text-sm">
            <label className="font-medium text-xs uppercase tracking-wide text-secondary">
              Export Format
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="export-mode"
                value="4bit"
                checked={exportMode === '4bit'}
                onChange={() => setExportMode('4bit')}
              />
              4-bit packed (2 pixels / byte)
            </label>
            {exportMode === '4bit' && (
              <small className="text-muted">
                Frame bytes = {Math.ceil(inferredWidth * inferredHeight / 2)} (ensure consistent frame dimensions).
              </small>
            )}
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="export-mode"
                value="1bit"
                checked={exportMode === '1bit'}
                onChange={() => setExportMode('1bit')}
              />
              1-bit packed (8 pixels / byte)
            </label>
            {exportMode === '1bit' && (
              <small className="text-muted">
                Row stride = {oneBitStride} byte{oneBitStride !== 1 ? 's' : ''}; data exports in row-major order.
              </small>
            )}
          </div>
        </CardBody>
      </Card>

      {images.length > 0 && (
        <StatusIndicator variant="success">
          Loaded {images.length} frame{images.length !== 1 ? 's' : ''}
        </StatusIndicator>
      )}
    </div>
  );

  // Create right panel (Preview & Code)
  const currentPreviewFrame = images[displayFrame];
  const previewWidth = currentPreviewFrame?.naturalWidth || inferredWidth;
  const previewHeight = currentPreviewFrame?.naturalHeight || inferredHeight;
  const previewCanvasStyle = {
    imageRendering: 'pixelated' as const,
    width: previewWidth * PREVIEW_SCALE,
    height: previewHeight * PREVIEW_SCALE
  };

  const rightPanel = (
    <div className="p-3 flex flex-col gap-4">
      <Card>
        <CardHeader>Preview</CardHeader>
        <CardBody>
          <div className="flex flex-col items-center gap-3">
            <canvas
              ref={canvasRef}
              width={previewWidth}
              height={previewHeight}
              className="border border-muted bg-secondary pixelated"
              style={previewCanvasStyle}
            />
            {images.length > 0 && (
              <div className="text-sm text-secondary">
                Frame {displayFrame + 1} of {images.length}
              </div>
            )}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>Generated Code</CardHeader>
        <CardBody>
          <div className="flex justify-end gap-2 mb-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleSaveFile}
              disabled={!generatedCode}
            >
              Save
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleCopyCode}
              disabled={!generatedCode}
            >
              Copy
            </Button>
          </div>
          <textarea
            value={generatedCode}
            readOnly
            className="input font-mono text-xs"
            rows={10}
            placeholder="Generated C code will appear here..."
          />
          {copyStatus !== 'idle' && (
            <small className={`block mt-2 ${copyStatus === 'copied' ? 'text-success' : 'text-error'}`}>
              {copyStatus === 'copied' ? 'Copied to clipboard' : 'Copy failed'}
            </small>
          )}
        </CardBody>
      </Card>
    </div>
  );

  // Create status bar content
  const statusBar = (
    <div className="flex justify-between items-center w-full">
      <div className="flex gap-4 items-center">
        <span>UI Graphics Converter</span>
        {images.length > 0 && (
          <span className="text-success">
            {images.length} frames loaded • {fps} FPS
          </span>
        )}
        {isPlaying && (
          <span className="text-warning">Playing animation</span>
        )}
      </div>
      <div>
        <span>{images.length > 0 ? `Frame ${displayFrame + 1}/${images.length}` : 'No frames'}</span>
      </div>
    </div>
  );

  return (
    <ToolLayout
      header={{
        actions: [
          <Button
            key="load"
            variant="primary"
            onClick={() => (document.querySelector('input[type="file"]') as HTMLInputElement)?.click()}
          >
            Load Images
          </Button>,
          <Button
            key="generate"
            variant="secondary"
            onClick={generateCode}
            disabled={images.length === 0}
          >
            <Code size={16} />
            Generate Code
          </Button>
        ]
      }}
      panels={{
        left: leftPanel,
        right: rightPanel
      }}
      statusBar={statusBar}
    />
  );
};
