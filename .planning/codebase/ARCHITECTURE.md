# Architecture

**Analysis Date:** 2026-02-08

## Pattern Overview

**Overall:** Multi-tool PWA with service-oriented architecture and unified design system

**Key Characteristics:**
- Tool-centric architecture with independent feature modules
- Centralized routing/navigation through tool registry
- Shared service layer for cross-tool functionality
- Unified design system with ToolLayout abstraction
- Context-based state management for global app state
- Path alias system for clean imports

## Layers

**Presentation Layer:**
- Purpose: UI rendering and user interaction
- Location: `src/components/`, `src/design-system/`, `src/tools/`
- Contains: React components, layouts, visualizations
- Depends on: Services layer, Contexts, Data Model types
- Used by: Entry point (App.tsx)

**Business Logic Layer:**
- Purpose: Core business logic and external integrations
- Location: `src/services/`
- Contains: Lua execution, device communication, file persistence, PWA functionality
- Depends on: Data Model types, external APIs (Bluetooth, Serial, WASM)
- Used by: Presentation layer tools

**State Management Layer:**
- Purpose: Global application state
- Location: `src/contexts/`
- Contains: React Context providers for settings, toast notifications
- Depends on: LocalStorage for persistence
- Used by: Presentation layer components

**Data Model Layer:**
- Purpose: Type definitions and data structures
- Location: `src/types/`, `src/services/DataModel/types.ts`
- Contains: TypeScript interfaces for domain entities
- Depends on: External type definitions
- Used by: All layers

**Tool Layer:**
- Purpose: Feature-specific implementations
- Location: `src/tools/[tool-name]/`
- Contains: Tool components, tool-specific CSS, local state
- Depends on: Design system, Services, Contexts
- Used by: App router

## Data Flow

**Tool Execution Flow:**

1. User selects tool from `VerticalNavbar`
2. `App.tsx` renders active tool component from tool registry
3. Tool component uses `ToolLayout` from design system
4. Tool component calls services (e.g., `luaService.execute()`)
5. Services process logic and return typed results
6. Tool updates local state, triggering re-render
7. Visualizations update via props or state changes

**Settings Flow:**

1. `SettingsProvider` initializes from `localStorage`
2. Child components access settings via `useSettings()` hook
3. Settings changes propagate through context
4. Theme changes trigger immediate CSS variable updates
5. Changes persisted to `localStorage` for next session

**Device Communication Flow:**

1. Tool creates `DeviceService` singleton instance
2. User triggers connection via UI controls
3. Service establishes Bluetooth/Serial connection
4. Real-time data streams to component state
5. Component visualizes data and handles user parameter changes
6. Parameter updates sent back through service

**State Management:**
- Global state: React Context (`SettingsContext`, `ToastContext`)
- Local state: React `useState` in tool components
- Service state: Singleton pattern for long-lived services
- Persistence: LocalStorage for user preferences

## Key Abstractions

**Tool Registry:**
- Purpose: Centralized tool configuration and routing
- Examples: `src/components/Navigation/VerticalNavbar.tsx`, `src/App.tsx`
- Pattern: Array of `Tool` objects with id, name, icon, component; filtered by `ENABLED_TOOL_IDS`

**Design System:**
- Purpose: Unified UI component library
- Examples: `src/design-system/index.ts`, `src/design-system/layouts/ToolLayout/`
- Pattern: Reusable components (`Button`, `Card`, `Modal`, `Input`) with variant props

**Lua Service:**
- Purpose: Lua script execution environment
- Examples: `src/services/LuaEngine/LuaService.ts`
- Pattern: Singleton with WASM-backed Lua engine, template system for code generation

**Device Service:**
- Purpose: Hardware communication abstraction
- Examples: `src/services/DeviceBridge/DeviceService.ts`
- Pattern: Event-driven service with connection management and parameter synchronization

**Datum Persistence:**
- Purpose: File import/export for spectral data
- Examples: `src/services/DatumPersistence/`
- Pattern: Binary format with validation, supports JSON and custom binary formats

## Entry Points

**main.tsx:**
- Location: `src/main.tsx`
- Triggers: Browser DOM ready
- Responsibilities: React root initialization, global CSS imports

**App.tsx:**
- Location: `src/App.tsx`
- Triggers: main.tsx mount
- Responsibilities: Tool routing, provider setup (Settings, Toast), keyboard shortcut binding, PWA initialization

**Tool Components:**
- Location: `src/tools/[tool-name]/[ToolName].tsx`
- Triggers: App router selection
- Responsibilities: Feature-specific UI, service integration, local state management

## Error Handling

**Strategy:** Try/catch in service layer, user-facing errors via toasts

**Patterns:**
- Services throw typed errors with messages
- Components catch errors and display via `Toast` notifications
- Lua errors captured as `LuaError[]` with line numbers
- File operations validate structure before parsing

## Cross-Cutting Concerns

**Logging:** Console logging with "DROP:" prefix for filtering
**Validation:** Service-layer validation for Lua code, file formats, device parameters
**Authentication:** None (client-side PWA with local storage only)
**Theming:** CSS variable system with named theme presets
**PWA:** Service worker via vite-plugin-pwa for offline capability

---

*Architecture analysis: 2026-02-08*
