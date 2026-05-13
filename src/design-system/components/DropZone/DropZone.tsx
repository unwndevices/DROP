import React, { useCallback, useRef, useState } from 'react';
import './DropZone.css';

export interface DropZoneProps {
  onFiles: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
  label?: React.ReactNode;
  hint?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}

export const DropZone: React.FC<DropZoneProps> = ({
  onFiles,
  accept,
  multiple = false,
  disabled = false,
  label = '[ drop file here ]',
  hint,
  className = '',
  children,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  const handleFiles = useCallback(
    (list: FileList | null) => {
      if (!list || list.length === 0) return;
      onFiles(Array.from(list));
    },
    [onFiles],
  );

  const onDragOver = (e: React.DragEvent) => {
    if (disabled) return;
    e.preventDefault();
    setOver(true);
  };

  const onDragLeave = () => setOver(false);

  const onDrop = (e: React.DragEvent) => {
    if (disabled) return;
    e.preventDefault();
    setOver(false);
    handleFiles(e.dataTransfer.files);
  };

  const onClick = () => {
    if (disabled) return;
    inputRef.current?.click();
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      inputRef.current?.click();
    }
  };

  const classes = [
    'nfo-dropzone',
    over && 'is-over',
    disabled && 'is-disabled',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={classes}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={onClick}
      onKeyDown={onKey}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        className="nfo-dropzone__input"
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = '';
        }}
      />
      {children ?? (
        <>
          <span className="nfo-dropzone__label">{label}</span>
          {hint && <span className="nfo-dropzone__hint">{hint}</span>}
        </>
      )}
    </div>
  );
};
