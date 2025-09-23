import React from 'react';

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
  ...props
}) => {
  const inputClasses = [
    'input',
    size !== 'md' && `input-${size}`,
    variant !== 'default' && `input-${variant}`,
    className
  ].filter(Boolean).join(' ');

  const containerStyle = labelPosition === 'left'
    ? { display: 'flex', alignItems: 'center', gap: 'var(--ds-spacing-sm)' }
    : { display: 'flex', flexDirection: 'column' as const, gap: 'var(--ds-spacing-xs)' };

  const labelStyle = {
    fontSize: 'var(--ds-font-size-sm)',
    fontWeight: 'var(--ds-font-weight-normal)',
    color: 'var(--ds-color-text-primary)',
    ...(labelPosition === 'left' ? { whiteSpace: 'nowrap' as const } : {})
  };

  return (
    <div style={containerStyle}>
      {label && (
        <label style={labelStyle}>
          {label}
        </label>
      )}
      <input className={inputClasses} {...props} />
      {(error || helper) && labelPosition === 'top' && (
        <div>
          {error && (
            <span style={{ fontSize: 'var(--ds-font-size-xs)', color: 'var(--ds-color-error)' }}>{error}</span>
          )}
          {helper && !error && (
            <span style={{ fontSize: 'var(--ds-font-size-xs)', color: 'var(--ds-color-text-muted)' }}>{helper}</span>
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
  ...props
}) => {
  const textareaClasses = [
    'input',
    size !== 'md' && `input-${size}`,
    variant !== 'default' && `input-${variant}`,
    className
  ].filter(Boolean).join(' ');

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-sm font-medium text-primary">
          {label}
        </label>
      )}
      <textarea className={textareaClasses} {...props} />
      {error && (
        <span className="text-xs text-error">{error}</span>
      )}
      {helper && !error && (
        <span className="text-xs text-muted">{helper}</span>
      )}
    </div>
  );
};