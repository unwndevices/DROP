import React, { useState } from 'react';
import './Select.css';

export interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  size?: 'xs' | 'sm' | 'md' | 'lg';
  variant?: 'default' | 'error' | 'success';
  label?: string;
  error?: string;
  helper?: string;
  options: SelectOption[];
  placeholder?: string;
}

export const Select: React.FC<SelectProps> = ({
  size = 'md',
  variant = 'default',
  label,
  error,
  helper,
  options,
  placeholder,
  className = '',
  ...props
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const selectClasses = [
    'ds-select',
    `ds-select-${size}`,
    variant !== 'default' && `ds-select-${variant}`,
    className
  ].filter(Boolean).join(' ');

  return (
    <div className="ds-select-container">
      {label && (
        <label className="ds-select-label">
          {label}
        </label>
      )}
      <div className={`ds-select-wrapper ${isOpen ? 'ds-select-open' : ''}`}>
        <select
          className={selectClasses}
          onFocus={() => setIsOpen(true)}
          onBlur={() => setIsOpen(false)}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option
              key={option.value}
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </option>
          ))}
        </select>
      </div>
      {error && (
        <div className="ds-select-error-text">{error}</div>
      )}
      {helper && !error && (
        <div className="ds-select-helper">{helper}</div>
      )}
    </div>
  );
};