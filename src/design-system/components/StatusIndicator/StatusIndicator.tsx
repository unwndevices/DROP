import React from 'react';

export interface StatusIndicatorProps {
  variant: 'info' | 'success' | 'warning' | 'error';
  children: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

const VARIANT_LABEL: Record<StatusIndicatorProps['variant'], string> = {
  info: 'INFO',
  success: 'OK',
  warning: 'WARN',
  error: 'ERR',
};

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  variant,
  children,
  icon,
  className = '',
  style,
}) => {
  const classes = ['alert', `alert-${variant}`, className]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classes} style={style} role="status">
      <span className="alert-tag" aria-hidden="true">
        <span className="alert-tag-bracket">[</span>
        <span className="alert-tag-label">{VARIANT_LABEL[variant]}</span>
        <span className="alert-tag-bracket">]</span>
      </span>
      {icon && <span className="alert-icon">{icon}</span>}
      <span className="alert-msg">{children}</span>
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
  className = '',
}) => {
  const classes = ['badge', `badge-${variant}`, className]
    .filter(Boolean)
    .join(' ');

  return <span className={classes}>{children}</span>;
};

export interface ProgressBarProps {
  value: number;
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
  className = '',
}) => {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  const classes = [
    'progress-bar',
    striped && 'striped',
    variant !== 'primary' && `progress-${variant}`,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="progress">
      <div
        className={classes}
        style={{ width: `${percentage}%` }}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
      >
        {label && <span className="sr-only">{label}</span>}
      </div>
    </div>
  );
};
