import React from 'react';
import './StatusBadge.css';

export type StatusKind = 'ok' | 'err' | 'warn' | 'info';

export interface StatusBadgeProps {
  kind: StatusKind;
  children?: React.ReactNode;
  className?: string;
}

const LABEL: Record<StatusKind, string> = {
  ok: 'OK',
  err: 'ERR',
  warn: 'WARN',
  info: 'INFO',
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  kind,
  children,
  className = '',
}) => {
  return (
    <span
      className={`nfo-status-badge nfo-status-badge--${kind} ${className}`.trim()}
      role="status"
    >
      <span className="nfo-status-badge__label">{LABEL[kind]}</span>
      {children && <span className="nfo-status-badge__msg">{children}</span>}
    </span>
  );
};
