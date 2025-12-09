import React from 'react';
import './Input.css';

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  size?: 'xs' | 'sm' | 'md' | 'lg';
  variant?: 'default' | 'error' | 'success';
  label?: string;
  labelPosition?: 'top' | 'left';
  error?: string;
  helper?: string;
}

export const Input: React.FC<InputProps> = ({
  size = 'md',
  variant = 'default',
  label,
  labelPosition = 'top',
  error,
  helper,
  className = '',
  disabled,
  ...props
}) => {
  const inputClasses = [
    'ds-input',
    `ds-input-${size}`,
    variant !== 'default' && `ds-input-${variant}`,
    error && 'ds-input-error',
    className
  ].filter(Boolean).join(' ');

  const containerClasses = [
    'ds-input-container',
    labelPosition === 'left' && 'ds-input-container-horizontal'
  ].filter(Boolean).join(' ');

  return (
    <div className={containerClasses}>
      {label && (
        <label className="ds-input-label">
          {label}
        </label>
      )}
      <div className="ds-input-wrapper">
        <input
          className={inputClasses}
          disabled={disabled}
          {...props}
        />
      </div>
      {(error || helper) && labelPosition === 'top' && (
        <div>
          {error && (
            <div className="ds-input-error-text">{error}</div>
          )}
          {helper && !error && (
            <div className="ds-input-helper">{helper}</div>
          )}
        </div>
      )}
    </div>
  );
};

export interface TextAreaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'size'> {
  size?: 'xs' | 'sm' | 'md' | 'lg';
  variant?: 'default' | 'error' | 'success';
  label?: string;
  error?: string;
  helper?: string;
}

export const TextArea: React.FC<TextAreaProps> = ({
  size = 'md',
  variant = 'default',
  label,
  error,
  helper,
  className = '',
  disabled,
  ...props
}) => {
  const textareaClasses = [
    'ds-input',
    `ds-input-${size}`,
    variant !== 'default' && `ds-input-${variant}`,
    error && 'ds-input-error',
    className
  ].filter(Boolean).join(' ');

  return (
    <div className="ds-input-container">
      {label && (
        <label className="ds-input-label">
          {label}
        </label>
      )}
      <textarea
        className={textareaClasses}
        disabled={disabled}
        {...props}
      />
      {error && (
        <div className="ds-input-error-text">{error}</div>
      )}
      {helper && !error && (
        <div className="ds-input-helper">{helper}</div>
      )}
    </div>
  );
};