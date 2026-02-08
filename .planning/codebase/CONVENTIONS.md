# Coding Conventions

**Analysis Date:** 2026-02-08

## Naming Patterns

**Files:**
- Components: PascalCase (e.g., `CodeEditor.tsx`, `SettingsModal.tsx`)
- Utilities/services: camelCase (e.g., `colorUtils.ts`, `useKeyboardShortcuts.ts`)
- Type definitions: PascalCase or descriptive name (e.g., `web-apis.d.ts`, `settings.ts`)
- Styles: Same name as component (e.g., `CodeEditor.css`)

**Functions:**
- camelCase for all functions (e.g., `generateColorVariants`, `applyTheme`)
- `use` prefix for custom hooks (e.g., `useSettings`, `useKeyboardShortcuts`)
- `handle` prefix for event handlers (e.g., `handleToolChange`, `handleSettings`)

**Variables:**
- camelCase (e.g., `activeTool`, `isSettingsOpen`, `handleSerialConnect`)
- `is` prefix for boolean state (e.g., `isConnecting`, `isSettingsOpen`)

**Types:**
- PascalCase for interfaces and types (e.g., `Tool`, `SettingsContextType`, `DeviceConnection`)
- `Props` suffix for component prop interfaces (e.g., `CodeEditorProps`, `ModalProps`)
- `Options` suffix for configuration objects (e.g., `KeyboardShortcutsOptions`)
- Union types use pipe notation (e.g., `'primary' | 'secondary' | 'danger'`)

## Code Style

**Formatting:**
- Tool: ESLint (no Prettier configuration detected)
- Config: `eslint.config.js` with TypeScript ESLint rules
- Linting enabled with `npm run lint`
- Strict TypeScript mode enabled in `tsconfig.app.json`
- Key rules: `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`

**Import Organization:**

Order in files:
1. External libraries (React, third-party packages)
2. Internal modules with relative paths (`./components/...`)
3. Type imports (mixed with regular imports)
4. CSS/asset imports

Examples from `src/App.tsx`:
```typescript
import { useState, useCallback, useEffect } from 'react';
import { Header } from './components/Layout/Header';
import { SettingsModal } from './components/UI/SettingsModal';
import './styles/globals.css';
```

**Path Aliases:**
- `@/design-system/*` → `src/design-system/*`
- `@/components/*` → `src/components/*`
- `@/tools/*` → `src/tools/*`
- `@/services/*` → `src/services/*`
- `@/styles/*` → `src/styles/*`
- `@/contexts/*` → `src/contexts/*`
- `@/hooks/*` → `src/hooks/*`
- `@/utils/*` → `src/utils/*`
- `@/types/*` → `src/types/*`

## Error Handling

**Patterns:**
- Try/catch for async operations that may fail
- `console.error()` for errors with context prefix (e.g., `DROP:`, `DROP PWA:`)
- `console.warn()` for non-critical issues
- `console.log()` for debug information with prefix

Example from `src/contexts/SettingsContext.tsx`:
```typescript
try {
  const savedSettings = localStorage.getItem('drop-settings');
  if (savedSettings) {
    const parsed = JSON.parse(savedSettings);
    setSettings(mergedSettings);
  }
} catch (error) {
  console.warn('DROP: Failed to load settings from localStorage:', error);
}
```

**Error Propagation:**
- `throw new Error()` for critical validation failures
- Toast notifications for user-facing errors (using `useToast` from design system)
- Event-driven error handling in services (e.g., `CONNECTION_ERROR` events)

**Type-safe error checking:**
```typescript
if (error instanceof Error) {
  showError(error.message, 'Connection Failed');
}
```

## Logging

**Framework:** Console API (no external logging library)

**Patterns:**
- Prefix convention: `DROP:`, `DROP PWA:`, `DRO:`
- Use `console.log()` for debug/info
- Use `console.warn()` for recoverable issues
- Use `console.error()` for failures
- Production logging may be conditional (check `import.meta.env.PROD`)

Example from `src/services/PWAService.ts`:
```typescript
console.log('DROP PWA: Initializing PWA service');
console.error('DROP PWA: Service worker registration failed:', error);
```

## Comments

**When to Comment:**
- Complex algorithms (e.g., color conversion functions)
- Public API functions
- Magic numbers or constants
- Workarounds and TODOs

**JSDoc/TSDoc:**
- Used for public interfaces and utility functions
- No strict JSDoc enforcement for internal code
- Inline comments for complex logic

Example from `src/utils/colorUtils.ts`:
```typescript
/**
 * Convert hex color to HSL
 */
function hexToHsl(hex: string): [number, number, number] {
  // Implementation...
}
```

## Function Design

**Size:** No explicit size guidelines, but large functions are common (e.g., `DeviceBridge.tsx` ~981 lines, `PWAService.ts` ~314 lines)

**Parameters:**
- Destructuring for complex objects
- Optional parameters with default values
- Interface definitions for complex props

Example from `src/design-system/components/Button/Button.tsx`:
```typescript
export const Button: React.FC<ButtonProps> = ({
  variant = 'secondary',
  size = 'md',
  fullWidth = false,
  icon = false,
  loading = false,
  className = '',
  children,
  disabled,
  ...props
}) => {
  // Implementation
}
```

**Return Values:**
- Explicit return types for all exported functions
- Union types for conditional returns
- Async functions return `Promise<T>`

## Module Design

**Exports:**
- Named exports preferred: `export const ComponentName`, `export function functionName`
- Type exports alongside component exports: `export type { Props }`
- Export interfaces separately: `export interface InterfaceName`

**Barrel Files:**
- `index.ts` files for re-exports in organized directories
- Pattern: `export * from './ComponentName'` for components
- Explicit type exports in design system barrel

Example from `src/design-system/index.ts`:
```typescript
export { Button } from './components/Button';
export type { ButtonProps } from './components/Button';

export { Input, TextArea } from './components/Input';
export type { InputProps, TextAreaProps } from './components/Input';
```

**Singleton Pattern:**
Services exported as singleton instances:

Example from `src/services/PWAService.ts`:
```typescript
export const pwaService = new PWAService();
```

## Component Patterns

**Functional Components:**
- All components use `React.FC<Type>` syntax
- Props interfaces defined above component
- Early returns for conditional rendering

Example pattern:
```typescript
export const ComponentName: React.FC<ComponentProps> = ({
  prop1,
  prop2,
  ...rest
}) => {
  if (someCondition) return null;

  return (
    <div className="component-class">
      {/* JSX */}
    </div>
  );
};
```

**State Management:**
- `useState` for local state
- `useContext` for global state
- Context providers at app root (e.g., `SettingsProvider`, `ToastProvider`)

**Effect Hooks:**
- `useEffect` for side effects and event listeners
- Cleanup functions returned from effects

**Custom Hooks:**
- Prefix with `use`
- Accept options object for configuration
- Return tuple or object as needed

Example from `src/hooks/useKeyboardShortcuts.ts`:
```typescript
export const useKeyboardShortcuts = (options: KeyboardShortcutsOptions) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Logic
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [options]);
};
```

---

*Convention analysis: 2026-02-08*
