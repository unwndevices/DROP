import React from 'react';
import './Panel.css';

export interface PanelProps {
  title?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  padded?: boolean;
}

export const Panel: React.FC<PanelProps> = ({
  title,
  actions,
  children,
  className = '',
  style,
  padded = true,
}) => {
  const classes = ['nfo-panel', padded && 'nfo-panel--padded', className]
    .filter(Boolean)
    .join(' ');

  return (
    <section className={classes} style={style}>
      {(title || actions) && (
        <header className="nfo-panel__chrome">
          {title && (
            <span className="nfo-panel__title">
              <span className="nfo-panel__bracket">[</span>
              <span className="nfo-panel__label">{title}</span>
              <span className="nfo-panel__bracket">]</span>
            </span>
          )}
          {actions && <span className="nfo-panel__actions">{actions}</span>}
        </header>
      )}
      <div className="nfo-panel__body">{children}</div>
    </section>
  );
};
