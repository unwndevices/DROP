import React from 'react';
import './Segmented.css';

export interface SegmentedOption<T extends string = string> {
  value: T;
  label: React.ReactNode;
  disabled?: boolean;
}

export interface SegmentedProps<T extends string = string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  size?: 'sm' | 'md';
  ariaLabel?: string;
  className?: string;
}

export function Segmented<T extends string = string>({
  options,
  value,
  onChange,
  size = 'md',
  ariaLabel,
  className = '',
}: SegmentedProps<T>) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={`nfo-segmented nfo-segmented--${size} ${className}`.trim()}
    >
      {options.map((opt) => {
        const selected = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={selected}
            disabled={opt.disabled}
            className={`nfo-segmented__btn${selected ? ' is-selected' : ''}`}
            onClick={() => onChange(opt.value)}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
