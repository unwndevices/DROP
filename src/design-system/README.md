# DROP Design System

A unified design system for the DROP (Datum Research Open Platform) that provides consistent styling and components across all tools.

## Quick Start

```tsx
import { ToolLayout, Button, Card, Input } from '@/design-system';

// Use ToolLayout for consistent tool structure
const MyTool: React.FC = () => {
  return (
    <ToolLayout
      header={{
        title: "My Tool",
        description: "Tool description",
        actions: [
          <Button variant="primary">Primary Action</Button>,
          <Button variant="secondary">Secondary Action</Button>
        ]
      }}
      panels={{
        left: <div>Left panel content</div>,
        right: <div>Right panel content</div>
      }}
      statusBar={<span>Status information</span>}
    />
  );
};
```

## Components

### ToolLayout

The main layout component that provides the standard tool structure:

```tsx
<ToolLayout
  logo={<Logo />} // Optional logo
  header={{
    title: "Tool Name",
    description: "Optional description",
    actions: [<Button>Action</Button>] // Array of action buttons
  }}
  sidebar={{ // Optional sidebar
    content: <SidebarContent />,
    collapsible: true,
    collapsed: false,
    onToggleCollapse: () => {}
  }}
  panels={{
    left: <LeftPanel />,
    right: <RightPanel />,
    single: <SinglePanel /> // Use instead of left/right for single panel
  }}
  statusBar={<StatusBar />} // Optional status bar
/>
```

### Button

Consistent button component with multiple variants:

```tsx
<Button variant="primary" size="lg" fullWidth>Primary Button</Button>
<Button variant="secondary">Secondary Button</Button>
<Button variant="danger">Danger Button</Button>
<Button variant="success">Success Button</Button>
<Button variant="ghost">Ghost Button</Button>
```

**Props:**
- `variant`: 'primary' | 'secondary' | 'danger' | 'success' | 'ghost'
- `size`: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
- `fullWidth`: boolean
- `icon`: boolean
- All standard button HTML attributes

### Input

Form input components with consistent styling:

```tsx
<Input
  label="Input Label"
  placeholder="Enter text"
  error="Error message"
  helper="Helper text"
  size="md"
  variant="default"
/>

<TextArea
  label="Text Area"
  rows={4}
  error="Error message"
/>
```

### Select

Dropdown select component:

```tsx
<Select
  label="Select Option"
  options={[
    { value: '1', label: 'Option 1' },
    { value: '2', label: 'Option 2' }
  ]}
  placeholder="Choose option"
/>
```

### Card

Container component for grouping related content:

```tsx
<Card>
  <CardHeader>Card Title</CardHeader>
  <CardBody>
    Card content goes here
  </CardBody>
  <CardFooter>
    Footer actions
  </CardFooter>
</Card>
```

### Modal

Modal dialog component:

```tsx
<Modal
  isOpen={isOpen}
  onClose={onClose}
  title="Modal Title"
  size="md"
  footer={
    <div>
      <Button variant="secondary" onClick={onClose}>Cancel</Button>
      <Button variant="primary" onClick={onSave}>Save</Button>
    </div>
  }
>
  Modal content
</Modal>
```

### StatusIndicator

Alert and status components:

```tsx
<StatusIndicator variant="info">Information message</StatusIndicator>
<StatusIndicator variant="success">Success message</StatusIndicator>
<StatusIndicator variant="warning">Warning message</StatusIndicator>
<StatusIndicator variant="error">Error message</StatusIndicator>

<Badge variant="primary">Primary Badge</Badge>
<ProgressBar value={75} max={100} striped />
```

## Migration Guide

### Before (Old Pattern)

```tsx
import { MainContent, SplitLayout, Panel } from '../../components/Layout/MainContent';

export const MyTool: React.FC = () => {
  return (
    <div className="my-tool">
      <div className="tool-header">
        <button className="tool-button primary">Action</button>
      </div>
      <MainContent>
        <SplitLayout
          left={<Panel title="Left">Content</Panel>}
          right={<Panel title="Right">Content</Panel>}
        />
      </MainContent>
    </div>
  );
};
```

### After (New Pattern)

```tsx
import { ToolLayout, Button, Card, CardHeader, CardBody } from '@/design-system';

export const MyTool: React.FC = () => {
  return (
    <ToolLayout
      header={{
        title: "My Tool",
        actions: [
          <Button variant="primary">Action</Button>
        ]
      }}
      panels={{
        left: (
          <Card>
            <CardHeader>Left</CardHeader>
            <CardBody>Content</CardBody>
          </Card>
        ),
        right: (
          <Card>
            <CardHeader>Right</CardHeader>
            <CardBody>Content</CardBody>
          </Card>
        )
      }}
    />
  );
};
```

## Benefits

1. **Consistency**: All tools use the same layout and component styles
2. **Maintainability**: Single source of truth for styling
3. **Type Safety**: Full TypeScript support with proper interfaces
4. **Accessibility**: Built-in ARIA attributes and keyboard navigation
5. **Responsive**: Mobile-friendly layouts out of the box
6. **Theme Support**: Automatically inherits theme colors and styling

## Styling

The design system uses the existing CSS variable system in `src/styles/globals.css`. All components automatically adapt to theme changes.

### CSS Classes

The system provides utility classes for common patterns:
- `flex`, `flex-col`, `flex-row` - Flexbox layouts
- `gap-1`, `gap-2`, `gap-3` - Spacing
- `text-primary`, `text-secondary`, `text-error` - Text colors
- `p-1`, `p-2`, `p-3`, `m-1`, `m-2`, `m-3` - Padding and margin

## Path Aliases

Use the configured path aliases for clean imports:

```tsx
import { Button, ToolLayout } from '@/design-system';
import { MyService } from '@/services/MyService';
import { MyComponent } from '@/components/MyComponent';
```

## Next Steps

1. Migrate existing tools to use `ToolLayout` and design system components
2. Remove tool-specific CSS files and button styles
3. Update component imports to use path aliases
4. Test thoroughly with different themes