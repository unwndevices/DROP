import React from 'react';

export interface StatusIndicatorProps {
  variant: 'info' | 'success' | 'warning' | 'error';
  children: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  variant,
  children,
  icon,
  className = '',
  style
}) => {
  const alertClasses = [
    'alert',
    `alert-${variant}`,
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={alertClasses} style={style}>
      {icon && <span className="flex-shrink-0">{icon}</span>}
      <span>{children}</span>
    </div>
  );
};

export interface BadgeProps {
  variant?: 'primary' | 'secondary' | 'success' | 'error' | 'warning';
  children: React.ReactNode;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'secondary',
  children,
  className = ''
}) => {
  const badgeClasses = [
    'badge',
    `badge-${variant}`,
    className
  ].filter(Boolean).join(' ');

  return (
    <span className={badgeClasses}>
      {children}
    </span>
  );
};

export interface ProgressBarProps {
  value: number; // 0-100
  max?: number;
  striped?: boolean;
  variant?: 'primary' | 'success' | 'warning' | 'error';
  label?: string;
  className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max = 100,
  striped = false,
  variant = 'primary',
  label,
  className = ''
}) => {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  
  const progressBarClasses = [
    'progress-bar',
    striped && 'striped',
    variant !== 'primary' && `progress-${variant}`,
    className
  ].filter(Boolean).join(' ');

  return (
    <div className="progress">
      <div 
        className={progressBarClasses}
        style={{ width: `${percentage}%` }}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
      >
        {label && (
          <span className="sr-only">{label}</span>
        )}
      </div>
    </div>
  );
};