import React, { useEffect, useRef } from 'react';
import './Terminal.css';

export type TerminalLevel = 'ok' | 'err' | 'warn' | 'info' | 'log';

export interface TerminalLine {
  level?: TerminalLevel;
  text: string;
  ts?: string;
}

export interface TerminalProps {
  lines: TerminalLine[];
  prompt?: string;
  autoScroll?: boolean;
  maxHeight?: number | string;
  ariaLabel?: string;
  className?: string;
}

export const Terminal: React.FC<TerminalProps> = ({
  lines,
  prompt = '›',
  autoScroll = true,
  maxHeight = 240,
  ariaLabel = 'terminal log',
  className = '',
}) => {
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!autoScroll) return;
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [lines, autoScroll]);

  return (
    <div
      ref={scrollerRef}
      role="log"
      aria-live="polite"
      aria-label={ariaLabel}
      className={`nfo-terminal ${className}`.trim()}
      style={{ maxHeight }}
    >
      {lines.map((line, i) => {
        const level: TerminalLevel = line.level ?? 'log';
        return (
          <div
            key={i}
            className={`nfo-terminal__line nfo-terminal__line--${level}`}
          >
            {line.ts && <span className="nfo-terminal__ts">{line.ts}</span>}
            <span className="nfo-terminal__prompt" aria-hidden="true">
              {prompt}
            </span>
            <span className="nfo-terminal__text">{line.text}</span>
          </div>
        );
      })}
    </div>
  );
};
