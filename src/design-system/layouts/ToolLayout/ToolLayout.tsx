import React from 'react';
import './ToolLayout.css';

export interface ToolLayoutProps {
  logo?: React.ReactNode;
  header?: {
    title?: string;
    description?: string;
    actions?: React.ReactNode[];
  };
  sidebar?: {
    content: React.ReactNode;
    collapsible?: boolean;
    collapsed?: boolean;
    onToggleCollapse?: () => void;
  };
  panels: {
    left?: React.ReactNode;
    right?: React.ReactNode;
    single?: React.ReactNode;
  };
  statusBar?: React.ReactNode;
  className?: string;
}

export const ToolLayout: React.FC<ToolLayoutProps> = ({
  logo,
  header,
  sidebar,
  panels,
  statusBar,
  className = ''
}) => {
  const hasLogo = Boolean(logo);
  const hasHeader = Boolean(header?.title || header?.description || header?.actions?.length);
  const hasSidebar = Boolean(sidebar);
  const hasTwoPanels = Boolean(panels.left && panels.right);
  const hasStatusBar = Boolean(statusBar);

  const layoutClasses = [
    'tool-layout',
    hasLogo && 'has-logo',
    hasSidebar && 'has-sidebar',
    sidebar?.collapsed && 'sidebar-collapsed',
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={layoutClasses}>
      {/* Header Row - only render if content exists */}
      {hasHeader && (
        <div className="tool-layout-header-row">
          {hasLogo && (
            <div className="tool-layout-logo">
              {logo}
            </div>
          )}
          <div className="tool-layout-header">
            <div className="tool-layout-header-content">
              <div className="tool-layout-header-text">
                {header?.title && <h1 className="tool-layout-title">{header.title}</h1>}
                {header?.description && (
                  <p className="tool-layout-description">{header.description}</p>
                )}
              </div>
              {header?.actions && header.actions.length > 0 && (
                <div className="tool-layout-actions">
                  {header.actions.map((action, index) => (
                    <div key={index} className="tool-layout-action">
                      {action}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Content Row */}
      <div className="tool-layout-main-row">
        {hasSidebar && sidebar && (
          <div className="tool-layout-sidebar">
            {sidebar.collapsible && (
              <button
                className="sidebar-toggle"
                onClick={sidebar.onToggleCollapse}
                aria-label={sidebar.collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                {sidebar.collapsed ? '→' : '←'}
              </button>
            )}
            <div className="tool-layout-sidebar-content">
              {sidebar.content}
            </div>
          </div>
        )}

        <div className="tool-layout-content">
          {panels.single ? (
            <div className="tool-layout-single-panel">
              {panels.single}
            </div>
          ) : hasTwoPanels ? (
            <div className="tool-layout-dual-panels">
              <div className="tool-layout-panel tool-layout-left-panel">
                {panels.left}
              </div>
              <div className="tool-layout-panel tool-layout-right-panel">
                {panels.right}
              </div>
            </div>
          ) : (
            <div className="tool-layout-single-panel">
              {panels.left || panels.right}
            </div>
          )}
        </div>
      </div>

      {/* Status Bar Row */}
      {hasStatusBar && (
        <div className="tool-layout-status-bar">
          {statusBar}
        </div>
      )}
    </div>
  );
};