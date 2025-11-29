import React, { useState, useEffect, useRef } from 'react';
import type { DeviceParameter } from '../../services/DeviceBridge/types';
import './ParameterControl.css';

interface ParameterControlProps {
  parameter: DeviceParameter;
  onChange: (value: number | boolean | string) => void;
  disabled?: boolean;
  precision?: number;
}

export const ParameterControl: React.FC<ParameterControlProps> = ({
  parameter,
  onChange,
  disabled = false,
  precision = 2
}) => {
  const [localValue, setLocalValue] = useState(parameter.value);
  const [inputValue, setInputValue] = useState('');
  const [showTooltip, setShowTooltip] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const sliderContainerRef = useRef<HTMLDivElement>(null);

  // Sync input value when local value changes
  useEffect(() => {
    if (parameter.type === 'float' && typeof localValue === 'number') {
      setInputValue(localValue.toFixed(precision));
    } else if (parameter.type === 'int' && typeof localValue === 'number') {
      setInputValue(String(Math.round(localValue)));
    }
  }, [localValue, parameter.type, precision]);

  // Sync local value when parameter value changes (from external source)
  useEffect(() => {
    if (!isDragging) {
      setLocalValue(parameter.value);
    }
  }, [parameter.value, isDragging]);

  // Update local value only (don't send to parent yet)
  const handleLocalChange = (newValue: number) => {
    setLocalValue(newValue);
  };

  // Send value to parent (on release or for non-numeric types)
  const handleCommitChange = (newValue: number | boolean | string) => {
    setLocalValue(newValue);
    onChange(newValue);
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value);
    handleLocalChange(newValue);
  };

  const handleSliderMouseDown = () => {
    setIsDragging(true);
    setShowTooltip(true);
  };

  const handleSliderMouseUp = () => {
    setIsDragging(false);
    setShowTooltip(false);
    // Commit the value on release
    if (typeof localValue === 'number') {
      onChange(localValue);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleInputBlur = () => {
    let newValue = parseFloat(inputValue);
    if (isNaN(newValue)) {
      newValue = typeof localValue === 'number' ? localValue : 0;
    } else {
      const min = parameter.min ?? 0;
      const max = parameter.max ?? 100;
      newValue = Math.max(min, Math.min(max, newValue));
    }
    if (parameter.type === 'float') {
      setInputValue(newValue.toFixed(precision));
    } else {
      setInputValue(String(Math.round(newValue)));
    }
    handleCommitChange(newValue);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleInputBlur();
      (e.target as HTMLInputElement).blur();
    } else if (e.key === 'Escape') {
      if (parameter.type === 'float' && typeof localValue === 'number') {
        setInputValue(localValue.toFixed(precision));
      } else if (typeof localValue === 'number') {
        setInputValue(String(Math.round(localValue)));
      }
      (e.target as HTMLInputElement).blur();
    }
  };

  const renderControl = () => {
    switch (parameter.type) {
      case 'float':
      case 'int': {
        const numValue = typeof localValue === 'number' ? localValue : 0;
        const step = parameter.step || (parameter.type === 'int' ? 1 : 0.01);
        const min = parameter.min ?? 0;
        const max = parameter.max ?? 100;
        const percentage = ((numValue - min) / (max - min)) * 100;

        return (
          <div className="slider-input-row">
            <div
              ref={sliderContainerRef}
              className={`slider-container ${isDragging ? 'slider-container--dragging' : ''}`}
              onMouseEnter={() => !disabled && !isDragging && setShowTooltip(true)}
              onMouseLeave={() => !isDragging && setShowTooltip(false)}
            >
              {showTooltip && (
                <div
                  className="slider-tooltip"
                  style={{ left: `${percentage}%` }}
                >
                  {parameter.type === 'float' ? numValue.toFixed(precision) : Math.round(numValue)}
                  {parameter.unit && parameter.unit}
                </div>
              )}
              <div className="slider-track">
                <div
                  className="slider-track-fill"
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <div
                className="slider-thumb"
                style={{ left: `${percentage}%` }}
              />
              <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={numValue}
                onChange={handleSliderChange}
                onMouseDown={handleSliderMouseDown}
                onMouseUp={handleSliderMouseUp}
                onTouchStart={handleSliderMouseDown}
                onTouchEnd={handleSliderMouseUp}
                disabled={disabled}
                className="slider-input-hidden"
              />
            </div>

            <div className="value-input-container">
              <input
                type="text"
                value={inputValue}
                onChange={handleInputChange}
                onBlur={handleInputBlur}
                onKeyDown={handleInputKeyDown}
                disabled={disabled}
                className="value-input"
              />
            </div>
          </div>
        );
      }
      case 'bool': {
        const boolValue = typeof localValue === 'boolean' ? localValue : false;

        return (
          <label className={`toggle-control ${disabled ? 'toggle-control--disabled' : ''}`}>
            <input
              type="checkbox"
              checked={boolValue}
              onChange={(e) => handleCommitChange(e.target.checked)}
              disabled={disabled}
              className="parameter-checkbox"
            />
            <span className="toggle-slider"></span>
          </label>
        );
      }
      case 'enum': {
        const enumValue = typeof localValue === 'string' ? localValue : parameter.options?.[0] || '';

        return (
          <select
            value={enumValue}
            onChange={(e) => handleCommitChange(e.target.value)}
            disabled={disabled}
            className="parameter-select"
          >
            {parameter.options?.map(option => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        );
      }
      default:
        return (
          <input
            type="text"
            value={String(localValue)}
            onChange={(e) => handleCommitChange(e.target.value)}
            disabled={disabled}
            className="parameter-text"
          />
        );
    }
  };

  const formatValue = () => {
    if (parameter.type === 'bool') {
      return localValue ? 'ON' : 'OFF';
    }
    if (parameter.type === 'float' && typeof localValue === 'number') {
      return localValue.toFixed(precision);
    }
    return String(localValue);
  };

  const showValueDisplay = parameter.type === 'bool';

  return (
    <div className={`parameter-control ${disabled ? 'parameter-control--disabled' : ''}`}>
      <div className="parameter-header">
        <label className="parameter-label">
          {parameter.name}
          {parameter.unit && ` (${parameter.unit})`}
        </label>
        {showValueDisplay && (
          <span className="parameter-value">
            {formatValue()}
          </span>
        )}
      </div>

      <div className="parameter-input-container">
        {renderControl()}
      </div>

      {parameter.description && (
        <p className="parameter-description">{parameter.description}</p>
      )}

      {(parameter.min !== undefined || parameter.max !== undefined) && parameter.type !== 'bool' && (
        <div className="parameter-range">
          <span className="range-min">{parameter.min}</span>
          <span className="range-max">{parameter.max}</span>
        </div>
      )}
    </div>
  );
};
