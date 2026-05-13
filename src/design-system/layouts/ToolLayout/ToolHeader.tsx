import React from 'react';
import { SectionLabel } from '../../components/SectionLabel';
import './ToolHeader.css';

export interface ToolHeaderProps {
  /** Lowercase tool title, e.g. `firmware`. */
  title: string;
  /** Optional inline subtitle, e.g. `flash & download for eisei`. */
  subtitle?: string;
  /** Optional zero-padded index shown before the title. */
  index?: number | string;
  /** Action slot rendered at the row end (e.g. tool-level controls). */
  actions?: React.ReactNode;
  className?: string;
}

/**
 * Section-label row used at the top of every NFO tool, e.g.
 *   `01  [ firmware ]  ──────  flash & download for eisei`
 * Renders inside a `ToolLayout` content body.
 */
export const ToolHeader: React.FC<ToolHeaderProps> = ({
  title,
  subtitle,
  index = 1,
  actions,
  className = '',
}) => {
  return (
    <div className={`nfo-tool-header ${className}`.trim()}>
      <SectionLabel
        index={index}
        actions={
          (subtitle || actions) && (
            <span className="nfo-tool-header__trailing">
              {subtitle && (
                <span className="nfo-tool-header__subtitle">{subtitle}</span>
              )}
              {actions}
            </span>
          )
        }
      >
        {title}
      </SectionLabel>
    </div>
  );
};
