import React, { useCallback, useRef } from 'react';
import './TransportBar.css';

export interface TransportBarProps {
  currentFrame: number;
  totalFrames: number;
  isPlaying?: boolean;
  onFrameChange: (frame: number) => void;
  onPlayToggle?: () => void;
  disabled?: boolean;
  className?: string;
}

export const TransportBar: React.FC<TransportBarProps> = ({
  currentFrame,
  totalFrames,
  isPlaying = false,
  onFrameChange,
  onPlayToggle,
  disabled = false,
  className = '',
}) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const lastFrame = Math.max(0, totalFrames - 1);
  const pct = totalFrames > 0 ? (currentFrame / Math.max(1, lastFrame)) * 100 : 0;

  const seek = useCallback(
    (clientX: number) => {
      if (disabled || totalFrames === 0) return;
      const el = trackRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
      const frame = Math.round((x / rect.width) * lastFrame);
      onFrameChange(frame);
    },
    [disabled, totalFrames, lastFrame, onFrameChange],
  );

  const onPointerDown = (e: React.PointerEvent) => {
    if (disabled) return;
    (e.target as Element).setPointerCapture(e.pointerId);
    dragging.current = true;
    seek(e.clientX);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    seek(e.clientX);
  };
  const onPointerUp = (e: React.PointerEvent) => {
    dragging.current = false;
    try {
      (e.target as Element).releasePointerCapture(e.pointerId);
    } catch {
      // pointer was never captured — fine
    }
  };

  return (
    <div className={`nfo-transport ${className}`.trim()} aria-disabled={disabled}>
      {onPlayToggle && (
        <button
          type="button"
          className="nfo-transport__btn"
          onClick={onPlayToggle}
          disabled={disabled || totalFrames === 0}
          aria-label={isPlaying ? 'pause' : 'play'}
        >
          {isPlaying ? '[ pause ]' : '[ play ]'}
        </button>
      )}

      <div
        ref={trackRef}
        className="nfo-transport__track"
        role="slider"
        aria-valuemin={0}
        aria-valuemax={lastFrame}
        aria-valuenow={currentFrame}
        tabIndex={disabled ? -1 : 0}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        <span className="nfo-transport__fill" style={{ width: `${pct}%` }} aria-hidden="true" />
        <span
          className="nfo-transport__dot"
          style={{ left: `${pct}%` }}
          aria-hidden="true"
        />
      </div>

      <span className="nfo-transport__count">
        {currentFrame + 1} / {totalFrames || 0}
      </span>
    </div>
  );
};
