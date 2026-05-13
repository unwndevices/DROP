import React from 'react';
import './SectionLabel.css';

export interface SectionLabelProps {
  index?: number | string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

const formatIndex = (i: number | string) =>
  typeof i === 'number' ? String(i).padStart(2, '0') : i;

export const SectionLabel: React.FC<SectionLabelProps> = ({
  index,
  children,
  actions,
  className = '',
}) => {
  return (
    <div className={`nfo-section-label ${className}`.trim()}>
      {index !== undefined && (
        <span className="nfo-section-label__index">{formatIndex(index)}</span>
      )}
      <span className="nfo-section-label__title">
        <span className="nfo-section-label__bracket">[</span>
        <span className="nfo-section-label__label">{children}</span>
        <span className="nfo-section-label__bracket">]</span>
      </span>
      <span className="nfo-section-label__rule" aria-hidden="true" />
      {actions && <span className="nfo-section-label__actions">{actions}</span>}
    </div>
  );
};
