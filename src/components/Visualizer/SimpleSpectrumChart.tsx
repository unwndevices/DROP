import React, { useRef, useEffect, useState } from 'react';
import { FaPlay, FaPause } from 'react-icons/fa';
import { useSettings } from '../../contexts/SettingsContext';
import type { SpectralFrame } from '../../services/DataModel/types';
import './SimpleSpectrumChart.css';

interface SimpleSpectrumChartProps {
  frames: SpectralFrame[];
  currentFrame: number;
  onFrameChange: (frame: number) => void;
  className?: string;
  showControls?: boolean;
}

export const SimpleSpectrumChart: React.FC<SimpleSpectrumChartProps> = ({
  frames,
  currentFrame,
  onFrameChange,
  className = '',
  showControls = true
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isPlaying, setIsPlaying] = useState(() => {
    try {
      const saved = localStorage.getItem('drop-chart-settings');
      if (saved) {
        const settings = JSON.parse(saved);
        return settings.isPlaying || false;
      }
    } catch (error) {
      console.warn('DROP: Failed to load chart settings:', error);
    }
    return false;
  });
  const { settings } = useSettings();

  // Auto-play effect
  useEffect(() => {
    if (!isPlaying || frames.length === 0) return;

    const interval = setInterval(() => {
      onFrameChange((currentFrame + 1) % frames.length);
    }, 100); // 10 FPS

    return () => clearInterval(interval);
  }, [isPlaying, currentFrame, frames.length, onFrameChange]);

  // Auto-save chart settings whenever they change
  useEffect(() => {
    const settings = {
      isPlaying,
      timestamp: new Date().toISOString()
    };
    localStorage.setItem('drop-chart-settings', JSON.stringify(settings));
  }, [isPlaying]);

  // Get current theme colors from CSS variables
  const getThemeColors = () => {
    const root = document.documentElement;
    const computedStyle = getComputedStyle(root);
    
    return {
      background: computedStyle.getPropertyValue('--color-background').trim() || '#181818',
      primary: computedStyle.getPropertyValue('--color-accent').trim() || '#C7EE1B',
      primaryMuted: computedStyle.getPropertyValue('--color-accent-dark').trim() || '#9EBE0E',
      textMuted: computedStyle.getPropertyValue('--color-text-muted').trim() || '#999999',
    };
  };

  // Chart rendering effect - includes theme dependencies for immediate updates
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size with device pixel ratio
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    // Get current theme colors
    const colors = getThemeColors();

    // Clear canvas with theme background
    ctx.fillStyle = colors.background;
    ctx.fillRect(0, 0, rect.width, rect.height);

    // Draw spectrum bars
    if (frames.length > 0 && currentFrame < frames.length) {
      const frame = frames[currentFrame];
      if (frame && frame.bands) {
        drawBarsChart(ctx, frame.bands, rect.width, rect.height, colors);
      }
    }

    // Draw frequency labels and grid
    drawFrequencyLabels(ctx, rect.width, rect.height, colors);
    
  }, [frames, currentFrame, settings.theme.name]); // Include theme dependencies for immediate updates

  const getFrequencyForBand = (band: number, totalBands: number = 20): number => {
    const freqRatio = band / (totalBands - 1);
    return 80 * Math.pow(8000 / 80, freqRatio); // Logarithmic scale: 80Hz to 8kHz
  };

  const drawBarsChart = (ctx: CanvasRenderingContext2D, bands: number[], width: number, height: number, colors: any) => {
    if (!bands || bands.length === 0) return;

    // Add horizontal margins to prevent bars from touching edges
    const margin = 20;
    const drawableWidth = width - (2 * margin);
    const barWidth = drawableWidth / bands.length;
    const maxHeight = height - 60; // Leave space for labels and controls

    // Draw grid lines
    drawGrid(ctx, width, height, colors);

    bands.forEach((value, index) => {
      const barHeight = value * maxHeight; // Values are already 0-1

      const x = margin + (index * barWidth);
      const y = height - barHeight - 40;

      // Draw bar with theme color
      ctx.fillStyle = colors.primary;
      
      const gap = barWidth * 0.2; // 20% gap
      const drawnBarWidth = barWidth - gap;
      
      ctx.fillRect(x + (gap / 2), y, drawnBarWidth, barHeight);

      // Add glow effect with theme color
      ctx.shadowColor = colors.primary;
      ctx.shadowBlur = 4;
      ctx.fillRect(x + (gap / 2), y, drawnBarWidth, barHeight);
      ctx.shadowBlur = 0;

      // Draw band labels
      if (index % 2 === 0) { // Only every other label to avoid crowding
        ctx.fillStyle = colors.textMuted;
        ctx.font = '9px Fira Mono';
        ctx.textAlign = 'center';
        ctx.fillText(
          (index + 1).toString(),
          x + barWidth / 2,
          height - 25
        );
      }
    });
  };

  const drawGrid = (ctx: CanvasRenderingContext2D, width: number, height: number, colors: any) => {
    // Add horizontal margins to match the bars
    const margin = 20;
    const drawableWidth = width - (2 * margin);
    
    ctx.strokeStyle = colors.primaryMuted + '35'; // Add transparency
    ctx.lineWidth = 0.5;

    // Horizontal lines
    const horizontalLines = 5;
    for (let i = 0; i <= horizontalLines; i++) {
      const y = 20 + ((height - 60) / horizontalLines) * i;
      ctx.beginPath();
      ctx.moveTo(margin, y);
      ctx.lineTo(width - margin, y);
      ctx.stroke();
    }

    // Vertical lines (for bands)
    const bands = 20;
    const barWidth = drawableWidth / bands;
    for (let i = 0; i <= bands; i++) {
      const x = margin + (barWidth * i);
      ctx.beginPath();
      ctx.moveTo(x, 20);
      ctx.lineTo(x, height - 40);
      ctx.stroke();
    }
  };

  const drawFrequencyLabels = (ctx: CanvasRenderingContext2D, width: number, height: number, colors: any) => {
    // Add horizontal margins to match the bars
    const margin = 20;
    const drawableWidth = width - (2 * margin);
    
    ctx.fillStyle = colors.textMuted;
    ctx.font = '10px Fira Mono';
    ctx.textAlign = 'center';

    // Draw frequency labels
    const labelCount = 5;
    for (let i = 0; i <= labelCount; i++) {
      const bandIndex = (i / labelCount) * 19; // 0 to 19
      const frequency = getFrequencyForBand(bandIndex);
      const x = margin + (i / labelCount) * drawableWidth;
      
      let label: string;
      if (frequency >= 1000) {
        label = `${(frequency / 1000).toFixed(1)}k`;
      } else {
        label = `${Math.round(frequency)}`;
      }
      
      ctx.fillText(label, x, height - 5);
    }

    // Draw magnitude labels
    ctx.textAlign = 'right';
    const magLabels = ['0.0', '0.25', '0.5', '0.75', '1.0'];
    magLabels.forEach((label, index) => {
      const y = height - 40 - (index / (magLabels.length - 1)) * (height - 60);
      ctx.fillText(label, width - 5, y + 3);
    });
  };

  const currentFrameData = frames[currentFrame];
  const bandCount = currentFrameData?.bands?.length || 20;
  const frameCount = frames.length;

  return (
    <div className={`drop-simple-spectrum-chart ${className}`}>
      <div className="drop-chart-container">
        <canvas
          ref={canvasRef}
          className="drop-simple-chart-canvas"
        />
        
        <div className="drop-chart-info">
          <div className="drop-chart-stats">
            <span>Bands: {bandCount}</span>
            {currentFrameData && (
              <span>
                Range: {Math.min(...currentFrameData.bands).toFixed(3)} → {Math.max(...currentFrameData.bands).toFixed(3)}
              </span>
            )}
          </div>
        </div>
      </div>

      {showControls && (
        <div className="drop-simple-controls">
          <button
            className="drop-play-button btn-primary"
            onClick={() => setIsPlaying(!isPlaying)}
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <FaPause /> : <FaPlay />}
          </button>
          
          <div className="drop-frame-controls">
            <span className="drop-frame-info">
              Frame: {currentFrame + 1}/{frameCount}
            </span>
            <input
              type="range"
              className="drop-frame-slider"
              min="0"
              max={Math.max(0, frameCount - 1)}
              value={currentFrame}
              onChange={(e) => onFrameChange(parseInt(e.target.value))}
            />
          </div>
        </div>
      )}
    </div>
  );
}; 