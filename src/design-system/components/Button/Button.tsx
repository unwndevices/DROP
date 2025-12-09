import React from 'react';
import './Button.css';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'ghost';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  fullWidth?: boolean;
  icon?: boolean;
  loading?: boolean;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'secondary',
  size = 'md',
  fullWidth = false,
  icon = false,
  loading = false,
  className = '',
  children,
  disabled,
  ...props
}) => {
  const classes = [
    'ds-btn',
    `ds-btn-${variant}`,
    `ds-btn-${size}`,
    fullWidth && 'ds-btn-block',
    icon && 'ds-btn-icon',
    loading && 'ds-btn-loading',
    className
  ].filter(Boolean).join(' ');

  return (
    <button
      className={classes}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <span className="ds-btn-spinner" />}
      {children}
    </button>
  );
};