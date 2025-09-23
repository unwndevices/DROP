# DROP Codebase Refactoring Plan

## Executive Summary

The DROP (Datum Research Open Platform) codebase has evolved from a single-tool application to a multi-tool platform. This growth has resulted in architectural inconsistencies, particularly in UI styling and layout patterns. This document outlines a comprehensive refactoring plan to establish a unified architecture that supports scalability and maintainability.

## Current State Analysis

### 1. Architecture Issues

#### 1.1 Styling Fragmentation
- **Button styles** are duplicated across 17 different CSS files
- Each tool (ESP32Flasher, DaisyFlasher, etc.) defines identical button classes:
  - `.tool-button`, `.connect-button`, `.flash-button`, `.clear-button`, `.send-button`
- CSS variables are inconsistently used (some use `--color-*`, others use `--surface-*`)
- same for inputs, selects, cards, modals, status indicators, etc.
- No centralized component library for common UI elements

#### 1.2 Layout Inconsistency
- Tools use `MainContent`, `SplitLayout`, and `Panel` components but implement custom layouts within
- No standardized layout structure across tools
- Header/content/footer patterns vary between tools

#### 1.3 Code Duplication
- Two separate CodeEditor implementations:
  - `CodeEditor.tsx` for spectral analysis
  - `PixelArtCodeEditor.tsx` for pixel art (nearly identical with minor differences)
- Duplicate styling across all tool CSS files
- Repeated connection/status patterns in hardware tools

### 2. Current File Structure

```
src/
├── components/          # Shared components (partially used)
├── contexts/           # Global state management
├── services/           # Business logic
├── tools/              # Individual tools with own styles
├── styles/             # Global styles (underutilized)
└── App.tsx            # Main app with CSS imports for each tool
```

## Proposed Architecture

### 1. Unified Component Library

Create a centralized design system with consistent components:

```
src/
├── design-system/
│   ├── components/
│   │   ├── Button/
│   │   │   ├── Button.tsx
│   │   │   ├── Button.module.css
│   │   │   └── index.ts
│   │   ├── Input/
│   │   ├── Select/
│   │   ├── Card/
│   │   ├── Modal/
│   │   └── StatusIndicator/
│   ├── layouts/
│   │   ├── ToolLayout/
│   │   │   ├── ToolLayout.tsx
│   │   │   ├── ToolLayout.module.css
│   │   │   └── index.ts
│   │   └── types.ts
│   └── tokens/
│       ├── colors.css
│       ├── spacing.css
│       ├── typography.css
│       └── index.css
```

### 2. Standardized Tool Layout

Implement a consistent layout structure that all tools must follow:

```tsx
interface ToolLayoutProps {
  logo?: ReactNode;
  header: {
    title: string;
    description?: string;
    actions?: ReactNode[];
  };
  sidebar?: {
    content: ReactNode;
    collapsible?: boolean;
  };
  panels: {
    left?: ReactNode;
    right?: ReactNode;
    single?: ReactNode;
  };
  statusBar?: ReactNode;
}
```

### 3. Unified Code Editor

Consolidate the two CodeEditor implementations into a single, configurable component:

```
src/
├── components/
│   └── CodeEditor/
│       ├── CodeEditor.tsx
│       ├── CodeEditor.module.css
│       ├── themes/
│       ├── linters/
│       │   ├── spectralLinter.ts
│       │   └── pixelArtLinter.ts
│       ├── completions/
│       │   ├── spectralCompletions.ts
│       │   └── pixelArtCompletions.ts
│       └── index.ts
```

## Implementation Phases

### Phase 1: Design System Foundation (Week 1-2)

1. **Create design tokens**
   - Extract all colors to CSS variables
   - Standardize spacing scale (4px base)
   - Define typography scale
   - Create breakpoint system

2. **Build core components**
   - Button (primary, secondary, danger, ghost variants)
   - Input (text, number, file)
   - Select
   - Card
   - Modal
   - StatusIndicator

3. **Implement ToolLayout component**
   - Header with consistent styling
   - Flexible panel system
   - Collapsible sidebar
   - Status bar

### Phase 2: Code Editor Consolidation (Week 3)

1. **Merge CodeEditor implementations**
   - Create base CodeEditor with plugin system
   - Move linting to separate modules
   - Move completions to separate modules
   - Support theme switching

2. **Create editor presets**
   - SpectralEditor preset
   - PixelArtEditor preset
   - Extensible for future editors

### Phase 3: Tool Migration (Week 4-6)

Migrate tools in order of complexity:

1. **Simple tools first**
   - DatumViewer
   - UIGraphicsConverter

2. **Hardware tools**
   - ESP32Flasher
   - DaisyFlasher
   - DeviceBridge

3. **Complex tools**
   - SpectralAnalysis
   - PixelArtGenerator

### Phase 4: Cleanup and Optimization (Week 7)

1. **Remove redundant code**
   - Delete tool-specific CSS files
   - Remove duplicate button styles
   - Clean up unused imports

2. **Optimize bundle**
   - Implement proper code splitting
   - Lazy load tools
   - Optimize CSS delivery

3. **Documentation**
   - Component storybook
   - Migration guide
   - Architecture documentation

## Migration Strategy

### 1. Component Migration Pattern

```tsx
// Before (tool-specific styling)
<button className="tool-button">Click</button>

// After (design system)
import { Button } from '@/design-system/components';
<Button variant="secondary">Click</Button>
```

### 2. Layout Migration Pattern

```tsx
// Before (custom layout)
export const ToolName: React.FC = () => {
  return (
    <div className="tool-container">
      <div className="tool-header">...</div>
      <div className="tool-content">...</div>
    </div>
  );
};

// After (standardized layout)
import { ToolLayout } from '@/design-system/layouts';

export const ToolName: React.FC = () => {
  return (
    <ToolLayout
      header={{
        title: "Tool Name",
        description: "Tool description",
        actions: [<Button>Action</Button>]
      }}
      panels={{
        left: <EditorPanel />,
        right: <VisualizationPanel />
      }}
      statusBar={<StatusBar />}
    />
  );
};
```

## Benefits

1. **Consistency**: Unified look and feel across all tools
2. **Maintainability**: Single source of truth for components
3. **Scalability**: Easy to add new tools following established patterns
4. **Performance**: Reduced CSS duplication, better code splitting
5. **Developer Experience**: Clear patterns and reusable components

## Risks and Mitigation

1. **Risk**: Breaking existing functionality
   - **Mitigation**: Implement changes incrementally with thorough testing

2. **Risk**: User confusion from UI changes
   - **Mitigation**: Maintain visual consistency, document changes

3. **Risk**: Performance regression
   - **Mitigation**: Monitor bundle size, implement proper code splitting

## Success Metrics

1. **Code Reduction**: 50% reduction in CSS code
2. **Component Reuse**: 90% of UI elements from design system
3. **Bundle Size**: 20% reduction in overall bundle size
4. **Development Speed**: 2x faster to create new tools

## Next Steps

1. Review and approve this plan
2. Set up design system structure
3. Begin Phase 1 implementation
4. Create proof-of-concept with one simple tool
5. Iterate based on feedback

## Appendix: Technical Details

### CSS Module Configuration

```js
// vite.config.ts addition
css: {
  modules: {
    localsConvention: 'camelCase',
    generateScopedName: '[name]__[local]___[hash:base64:5]'
  }
}
```

### TypeScript Path Aliases

```json
// tsconfig.json
{
  "compilerOptions": {
    "paths": {
      "@/design-system/*": ["src/design-system/*"],
      "@/components/*": ["src/components/*"],
      "@/tools/*": ["src/tools/*"]
    }
  }
}
```

### Component Template

```tsx
// Button component example
import React from 'react';
import styles from './Button.module.css';

export interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'medium',
  disabled = false,
  onClick,
  children
}) => {
  const className = [
    styles.button,
    styles[variant],
    styles[size],
    disabled && styles.disabled
  ].filter(Boolean).join(' ');

  return (
    <button
      className={className}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
};
```