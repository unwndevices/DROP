# Codebase Structure

**Analysis Date:** 2026-02-08

## Directory Layout

```
DROP/
├── .planning/             # Planning documents (GSD workflow)
├── dev-dist/              # Development build output
├── dist/                  # Production build output
├── lib/                   # External library packages
│   └── enjin2-wasm/       # Enjin2 WASM library (local package)
├── public/                # Static assets served from root
│   ├── icons/             # PWA icons
│   ├── lib/               # Web libraries (e.g., webdfu)
│   └── screenshots/       # Documentation screenshots
├── src/                   # Source code
│   ├── components/        # Feature components
│   │   ├── DeviceBridge/  # Device connection UI
│   │   ├── Editor/        # Code editor logic
│   │   ├── FirmwareSelector/ # Firmware download component
│   │   ├── Layout/        # Main layout components
│   │   ├── Navigation/    # Vertical navbar
│   │   ├── PixelArt/      # Pixel art export UI
│   │   ├── Spectral/      # Spectral data export UI
│   │   ├── UI/            # Modal, settings, PWA status
│   │   └── Visualizer/    # Chart components
│   ├── contexts/          # React Context providers
│   ├── design-system/     # Unified UI component library
│   │   ├── components/    # Reusable components
│   │   │   ├── Button/
│   │   │   ├── Card/
│   │   │   ├── CodeEditor/
│   │   │   ├── Input/
│   │   │   ├── Modal/
│   │   │   ├── Select/
│   │   │   ├── StatusIndicator/
│   │   │   ├── Timeline/
│   │   │   └── Toast/
│   │   ├── layouts/       # Layout containers
│   │   │   ├── TerminalShell/
│   │   │   └── ToolLayout/
│   │   ├── tokens/        # CSS variable definitions
│   │   ├── styles.css     # Design system styles
│   │   └── index.ts       # Barrel export
│   ├── hooks/             # Custom React hooks
│   ├── lib/               # Utility libraries (empty)
│   ├── services/          # Business logic layer
│   │   ├── DataModel/     # Core type definitions
│   │   ├── DatumPersistence/ # File I/O services
│   │   ├── DeviceBridge/  # Bluetooth/Serial service
│   │   ├── LuaEngine/     # Lua execution service
│   │   ├── PixelArt/      # Pixel art generation services
│   │   ├── PWAService.ts  # PWA registration service
│   │   └── index.ts       # Barrel export
│   ├── styles/            # Global styles
│   ├── tools/             # Tool implementations
│   │   ├── daisy-flasher/
│   │   ├── datum-viewer/
│   │   ├── device-bridge/
│   │   ├── esp32-flasher/
│   │   ├── pixel-art-generator/
│   │   ├── spectral-analysis/
│   │   ├── ui-graphics/
│   │   └── ToolLayout.css # Shared tool styles
│   ├── types/             # TypeScript type definitions
│   ├── utils/             # Utility functions
│   ├── App.tsx            # Root component with tool routing
│   ├── main.tsx           # Application entry point
│   ├── tools-config.ts    # Tool enable/disable config
│   ├── debug-lua-globals.ts # Debug utilities
│   └── vite-env.d.ts      # Vite environment types
├── .github/               # GitHub workflows
├── node_modules/          # Dependencies
├── package.json           # Dependencies and scripts
├── tsconfig.json          # TypeScript config
├── vite.config.ts         # Vite build config
└── index.html             # HTML template
```

## Directory Purposes

**src/:**
- Purpose: Application source code root
- Contains: All TypeScript/TSX files, styles, assets
- Key files: `main.tsx`, `App.tsx`, `tools-config.ts`

**src/components/:**
- Purpose: Feature-specific UI components shared across tools
- Contains: Device bridge UI, editor components, visualizers
- Key files: `Navigation/VerticalNavbar.tsx`, `Layout/MainContent.tsx`, `Editor/CodeEditor.tsx`

**src/design-system/:**
- Purpose: Unified component library for consistent UI
- Contains: Reusable Button, Card, Modal, Input, Select, ToolLayout
- Key files: `index.ts`, `layouts/ToolLayout/ToolLayout.tsx`, `components/Button/Button.tsx`

**src/tools/:**
- Purpose: Independent tool implementations
- Contains: Tool components, tool-specific CSS
- Key files: `device-bridge/DeviceBridge.tsx`, `spectral-analysis/SpectralAnalysis.tsx`

**src/services/:**
- Purpose: Business logic and external service integrations
- Contains: Lua engine, device communication, file persistence, PWA
- Key files: `LuaEngine/LuaService.ts`, `DeviceBridge/DeviceService.ts`, `DatumPersistence/DatumFileService.ts`

**src/contexts/:**
- Purpose: React Context providers for global state
- Contains: Settings context, Toast context
- Key files: `SettingsContext.tsx`

**src/types/:**
- Purpose: TypeScript type definitions
- Contains: Domain types, external API definitions
- Key files: `settings.ts`, `dfu.d.ts`, `enjin2.d.ts`

**src/hooks/:**
- Purpose: Custom React hooks
- Contains: Keyboard shortcuts hook
- Key files: `useKeyboardShortcuts.ts`

**src/utils/:**
- Purpose: Utility functions and helpers
- Contains: Color utilities for theming
- Key files: `colorUtils.ts`

**src/styles/:**
- Purpose: Global CSS and theme definitions
- Contains: Theme presets, global styles
- Key files: `theme.ts`, `globals.css`

**public/:**
- Purpose: Static assets served from root URL
- Contains: PWA icons, WebDFU library, screenshots
- Key files: `icons/icon-*.png`, `lib/webdfu/`

**lib/:**
- Purpose: External local packages
- Contains: Enjin2 WASM library
- Key files: `enjin2-wasm/package.json`

## Key File Locations

**Entry Points:**
- `src/main.tsx`: React application bootstrap
- `src/App.tsx`: Tool routing, provider setup, keyboard shortcuts
- `index.html`: HTML template with root div

**Configuration:**
- `vite.config.ts`: Build config, PWA plugin, path aliases
- `tsconfig.json`: TypeScript compiler config
- `package.json`: Dependencies and npm scripts
- `src/tools-config.ts`: Tool enable/disable flags
- `src/styles/theme.ts`: Theme color definitions

**Core Logic:**
- `src/services/LuaEngine/LuaService.ts`: Lua execution environment
- `src/services/DeviceBridge/DeviceService.ts`: Hardware communication
- `src/services/DatumPersistence/`: File import/export
- `src/design-system/layouts/ToolLayout/`: Standard tool layout

**Testing:**
- Not applicable (no test files detected)

## Naming Conventions

**Files:**
- React components: PascalCase (e.g., `DeviceBridge.tsx`, `ToolLayout.tsx`)
- Hooks: camelCase with "use" prefix (e.g., `useKeyboardShortcuts.ts`)
- Services: PascalCase (e.g., `LuaService.ts`, `DeviceService.ts`)
- Types files: camelCase or PascalCase based on context
- CSS files: camelCase matching component (e.g., `DeviceBridge.css`)
- Utility files: camelCase (e.g., `colorUtils.ts`)

**Directories:**
- kebab-case for features and tools (e.g., `device-bridge`, `spectral-analysis`)
- PascalCase for services (e.g., `LuaEngine`, `DataModel` - though mixed usage)
- camelCase for utilities and types (e.g., `hooks`, `utils`, `types`)

**Components:**
- Exported components: PascalCase (e.g., `ToolLayout`, `Button`)
- Props interfaces: PascalCase + "Props" suffix (e.g., `ToolLayoutProps`, `ButtonProps`)

**Types:**
- Interfaces: PascalCase (e.g., `Settings`, `DeviceParameter`)
- Type aliases: PascalCase (e.g., `ThemeName`, `AppEvent`)
- Enums (if any): PascalCase (not detected in codebase)

## Where to Add New Code

**New Feature:**
- Primary code: `src/tools/[feature-name]/[FeatureName].tsx`
- Tests: N/A (test infrastructure not set up)
- Styles: `src/tools/[feature-name]/[FeatureName].css` or use design system

**New Component/Module:**
- Implementation: `src/components/[category]/[ComponentName]/`
- If reusable UI: `src/design-system/components/[ComponentName]/`

**Utilities:**
- Shared helpers: `src/utils/[helperName].ts`
- Service-level logic: `src/services/[ServiceName]/`

**New Tool:**
- Add entry to `src/components/Navigation/VerticalNavbar.tsx` in `DEFAULT_TOOLS`
- Enable in `src/tools-config.ts`
- Create directory: `src/tools/[tool-id]/[ToolName].tsx`

**Design System Component:**
- Add to `src/design-system/components/[ComponentName]/`
- Export from `src/design-system/index.ts`

**Service:**
- Create in `src/services/[ServiceName]/`
- Add types in `src/services/[ServiceName]/types.ts`
- Export from `src/services/index.ts`

## Special Directories

**dev-dist:**
- Purpose: Development build output
- Generated: Yes
- Committed: No (in .gitignore)

**dist:**
- Purpose: Production build output
- Generated: Yes
- Committed: No (in .gitignore)

**node_modules:**
- Purpose: Installed npm packages
- Generated: Yes
- Committed: No (in .gitignore)

**public/lib:**
- Purpose: External JavaScript libraries not in npm
- Generated: No
- Committed: Yes (WebDFU libraries)

**lib/enjin2-wasm:**
- Purpose: Local npm package for Enjin2 WASM
- Generated: No
- Committed: Yes (linked as local dependency)

**.github/workflows:**
- Purpose: GitHub Actions CI/CD
- Generated: No
- Committed: Yes

---

*Structure analysis: 2026-02-08*
