import React from 'react';
import { FaPlay, FaPause } from 'react-icons/fa';
import './Timeline.css';

export interface TimelineProps {
  currentFrame: number;
  totalFrames: number;
  isPlaying?: boolean;
  onFrameChange: (frame: number) => void;
  onPlayToggle?: () => void;
  disabled?: boolean;
  className?: string;
}

export const Timeline: React.FC<TimelineProps> = ({
  currentFrame,
  totalFrames,
  isPlaying = false,
  onFrameChange,
  onPlayToggle,
  disabled = false,
  className = ''
}) => {
  return (
    <div className={`ds-timeline ${className}`}>
      {onPlayToggle && (
        <button
          className="ds-timeline-play-button"
          onClick={onPlayToggle}
          title={isPlaying ? 'Pause' : 'Play'}
          disabled={disabled || totalFrames === 0}
        >
          {isPlaying ? <FaPause /> : <FaPlay />}
        </button>
      )}
      
      <div className="ds-timeline-controls">
        <span className="ds-timeline-frame-info">
          Frame: {currentFrame + 1}/{totalFrames}
        </span>
        <input
          type="range"
          className="ds-timeline-slider"
          min="0"
          max={Math.max(0, totalFrames - 1)}
          value={currentFrame}
          onChange={(e) => onFrameChange(parseInt(e.target.value))}
          disabled={disabled || totalFrames === 0}
        />
      </div>
    </div>
  );
};