import React from 'react';
import './Card.css';

export interface CardProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  variant?: 'default' | 'glass' | 'outline';
  interactive?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  style,
  variant = 'default',
  interactive = false
}) => {
  const classes = [
    'ds-card',
    variant !== 'default' && `ds-card-${variant}`,
    interactive && 'ds-card-interactive',
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={classes} style={style}>
      {children}
    </div>
  );
};

export interface CardHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export const CardHeader: React.FC<CardHeaderProps> = ({ children, className = '' }) => {
  return (
    <div className={`ds-card-header ${className}`}>
      {children}
    </div>
  );
};

export interface CardBodyProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export const CardBody: React.FC<CardBodyProps> = ({ children, className = '', style }) => {
  return (
    <div className={`ds-card-body ${className}`} style={style}>
      {children}
    </div>
  );
};

export interface CardFooterProps {
  children: React.ReactNode;
  className?: string;
}

export const CardFooter: React.FC<CardFooterProps> = ({ children, className = '' }) => {
  return (
    <div className={`ds-card-footer ${className}`}>
      {children}
    </div>
  );
};