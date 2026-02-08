# Technology Stack

**Analysis Date:** 2025-02-08

## Languages

**Primary:**
- TypeScript 5.8.3 - All source code in `src/`

**Secondary:**
- Lua - User scripting via `wasmoon` WebAssembly runtime
- JavaScript - Runtime environment and dependencies

## Runtime

**Environment:**
- Browser-based Progressive Web App (PWA)
- ES2022 target (from `tsconfig.app.json`)
- Secure context required (HTTPS or localhost)

**Package Manager:**
- npm (lockfile: `package-lock.json` present)
- Node.js required for development

## Frameworks

**Core:**
- React 19.1.0 - UI framework (`src/`)
- Vite 7.0.0 - Build tool and dev server
- vite-plugin-pwa 1.0.1 - PWA features and service workers

**Testing:**
- Not applicable (no test framework detected)

**Build/Dev:**
- TypeScript 5.8.3 - Type checking and compilation
- ESLint 9.29.0 - Linting with React-specific plugins
- @vitejs/plugin-react 4.5.2 - React JSX support in Vite

## Key Dependencies

**Critical:**
- @codemirror/* (multiple packages) - Code editor with Lua, JavaScript, Python syntax highlighting (`src/components/Editor/CodeEditor.tsx`)
- wasmoon 1.16.0 - Lua engine via WebAssembly (`src/services/LuaEngine/LuaService.ts`)
- esptool-js 0.5.6 - ESP32 firmware flashing via Web Serial (`src/tools/esp32-flasher/ESP32Flasher.tsx`)
- webdfu 1.0.5 - DFU firmware flashing via WebUSB (adapted from webdfu library) (`src/tools/daisy-flasher/dfu-webdfu.ts`)

**Infrastructure:**
- workbox-webpack-plugin 7.3.0 - Service worker and caching (via vite-plugin-pwa)
- enjin2-wasm (file:./lib/enjin2-wasm) - Pixel art generation engine (`lib/enjin2-wasm/`)

**UI/UX:**
- @radix-ui/react-slider 1.3.5 - Slider component
- lucide-react 0.525.0 - Icon set (`src/components/Navigation/VerticalNavbar.tsx`)
- marked 16.1.1 - Markdown rendering (`src/components/FirmwareSelector/FirmwareSelector.tsx`)
- uplot 1.6.32 + uplot-react 1.2.2 - Charting library (`src/components/Visualizer/`)

**Data Processing:**
- file-saver 2.0.5 - File downloads (`src/services/DatumPersistence/DatumFileService.ts`)
- jszip 3.10.1 - ZIP file creation
- asciichart 1.5.25 - ASCII chart generation

## Configuration

**Environment:**
- No `.env` file detected (no environment variables required for basic operation)
- PWA manifest configured in `vite.config.ts` (VitePWA plugin)
- Production base path: `/DROP/` (configured via `NODE_ENV=production`)

**Build:**
- `vite.config.ts` - Main build configuration
- `tsconfig.json` - Root TypeScript config (references app and node configs)
- `tsconfig.app.json` - Application TypeScript config (ES2022 target, strict mode)
- `tsconfig.node.json` - Node/build TypeScript config
- `eslint.config.js` - ESLint configuration with TypeScript, React Hooks, and React Refresh

## Platform Requirements

**Development:**
- Node.js (version not specified)
- npm
- Modern browser with HTTPS or localhost support

**Production:**
- Secure context (HTTPS) required for Web APIs:
  - WebUSB (Daisy Seed DFU flashing)
  - Web Serial (ESP32 flashing, device communication)
  - Web Bluetooth (BLE device communication)
- Browsers supporting required Web APIs:
  - Chrome/Edge (full support)
  - Firefox (partial - limited WebUSB support)
  - Safari (limited - no WebUSB/Web Serial)

**PWA Deployment:**
- Static hosting (GitHub Pages configured via `build:gh-pages` script)
- Service worker caching for offline operation
- Google Fonts cached via Workbox runtime caching

---

*Stack analysis: 2025-02-08*
