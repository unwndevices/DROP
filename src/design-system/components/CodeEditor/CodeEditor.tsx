import React from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { StreamLanguage } from '@codemirror/language';
import { lua } from '@codemirror/legacy-modes/mode/lua';
import { keymap } from '@codemirror/view';
import { Prec, type Extension } from '@codemirror/state';
import { autocompletion, completionKeymap, type CompletionSource } from '@codemirror/autocomplete';
import { foldGutter, codeFolding } from '@codemirror/language';
import { lineNumbers, highlightActiveLineGutter } from '@codemirror/view';
import { lintGutter } from '@codemirror/lint';
import { createEditorTheme } from '../../../components/Editor/editorTheme';
import { useSettings } from '../../../contexts/SettingsContext';
import './CodeEditor.css';

export interface CodeEditorError {
  message: string;
  line?: number;
}

export interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  onExecute?: (code: string) => void;
  errors?: CodeEditorError[];
  className?: string;
  
  // Plugin system
  linter?: Extension;
  completions?: CompletionSource[];
  
  // Legacy props for backward compatibility
  frameCount?: number;
  onFrameCountChange?: (count: number) => void;
  
  // Optional customization
  placeholder?: string;
  readOnly?: boolean;
  minHeight?: string;
  maxHeight?: string;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({
  value,
  onChange,
  onExecute,
  errors = [],
  className = '',
  linter: customLinter,
  completions = [],
  frameCount,
  onFrameCountChange,
  placeholder,
  readOnly = false,
  minHeight = '200px',
  maxHeight = '100%'
}) => {
  const { settings } = useSettings();

  // Create the editor theme
  const theme = createEditorTheme(settings.theme.name);

  // Create extensions array
  const extensions: Extension[] = [
    StreamLanguage.define(lua),
    lineNumbers(),
    highlightActiveLineGutter(),
    foldGutter(),
    codeFolding(),
    ...(customLinter ? [lintGutter(), customLinter] : []),
    ...(completions.length > 0 ? [autocompletion({ override: completions })] : []),
    Prec.highest(
      keymap.of([
        {
          key: 'Ctrl-Enter',
          run: () => {
            onExecute?.(value);
            return true;
          }
        },
        {
          key: 'Cmd-Enter',
          run: () => {
            onExecute?.(value);
            return true;
          }
        },
        ...completionKeymap
      ])
    ),
    theme
  ];

  return (
    <div className={`unified-code-editor ${className}`} style={{ height: '100%' }}>
      <CodeMirror
        value={value}
        onChange={onChange}
        extensions={extensions}
        placeholder={placeholder}
        readOnly={readOnly}
        height={maxHeight === '100%' ? '100%' : undefined}
        style={{
          height: maxHeight === '100%' ? '100%' : undefined,
          minHeight: maxHeight === '100%' ? undefined : minHeight,
          maxHeight: maxHeight === '100%' ? undefined : maxHeight,
          fontSize: '14px',
          fontFamily: 'var(--font-mono)'
        }}
      />
      
      {/* Legacy frame count controls for backward compatibility */}
      {frameCount !== undefined && onFrameCountChange && (
        <div className="editor-controls">
          <div className="frame-controls">
            <label htmlFor="frameCount">Frame Count:</label>
            <input
              id="frameCount"
              type="number"
              min="1"
              max="10000"
              value={frameCount}
              onChange={(e) => onFrameCountChange(parseInt(e.target.value) || 1)}
              className="input input-sm"
            />
          </div>
        </div>
      )}
      
      {/* External errors display */}
      {errors.length > 0 && (
        <div className="editor-errors">
          {errors.map((error, index) => (
            <div key={index} className="editor-error">
              {error.line && <span className="error-line">Line {error.line}:</span>}
              <span className="error-message">{error.message}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};