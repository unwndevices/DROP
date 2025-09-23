import React from 'react';

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
  const selectClasses = [
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
      <select className={selectClasses} {...props}>
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
      {error && (
        <span className="text-xs text-error">{error}</span>
      )}
      {helper && !error && (
        <span className="text-xs text-muted">{helper}</span>
      )}
    </div>
  );
};