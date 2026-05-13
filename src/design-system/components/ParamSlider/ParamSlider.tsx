import React, { useId } from 'react';
import './ParamSlider.css';

export interface ParamSliderProps {
  label: React.ReactNode;
  value: number;
  min: number;
  max: number;
  step?: number;
  disabled?: boolean;
  onChange: (next: number) => void;
  /** Custom display for the right-side value (defaults to `value.toFixed(decimals)`). */
  format?: (value: number) => string;
  decimals?: number;
  className?: string;
}

export const ParamSlider: React.FC<ParamSliderProps> = ({
  label,
  value,
  min,
  max,
  step = 0.01,
  disabled = false,
  onChange,
  format,
  decimals = 2,
  className = '',
}) => {
  const id = useId();
  const display = format ? format(value) : value.toFixed(decimals);
  const pct = ((value - min) / (max - min)) * 100;

  return (
    <div className={`nfo-param-slider ${className}`.trim()}>
      <label className="nfo-param-slider__label" htmlFor={id}>
        {label}
      </label>
      <div className="nfo-param-slider__track" data-disabled={disabled || undefined}>
        <span
          className="nfo-param-slider__fill"
          style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
          aria-hidden="true"
        />
        <input
          id={id}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(parseFloat(e.target.value))}
        />
      </div>
      <span className="nfo-param-slider__value">{display}</span>
    </div>
  );
};
