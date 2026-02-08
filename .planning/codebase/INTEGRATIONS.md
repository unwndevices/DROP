# External Integrations

**Analysis Date:** 2025-02-08

## APIs & External Services

**Firmware Repository:**
- GitHub (unwndevices/unwn_fw) - Firmware distribution
  - Endpoint: `https://raw.githubusercontent.com/unwndevices/unwn_fw/main/releases.json`
  - Purpose: Fetch firmware version metadata and download URLs
  - Usage: `src/components/FirmwareSelector/FirmwareSelector.tsx`
  - Auth: None (public repository)
  - CORS: Required (fetch with mode: 'cors')

**Google Fonts:**
- Google Fonts CDN - Web fonts
  - Endpoint: `fonts.googleapis.com` and `fonts.gstatic.com`
  - Purpose: External font resources
  - Caching: Cached via Workbox runtime caching (`vite.config.ts` line 70-78)

## Data Storage

**Databases:**
- None - Client-side only application

**File Storage:**
- Local browser storage (localStorage)
  - Usage: User settings, saved scripts, tool preferences
  - Files persisting state: `src/App.tsx`, `src/tools/spectral-analysis/SpectralAnalysis.tsx`, `src/tools/pixel-art-generator/PixelArtGenerator.tsx`
  - Key storage keys: `drop-active-tool`, `drop-script`, `drop-spectral-settings`, `drop-pixel-art-*`, `drop-chart-settings`

**Caching:**
- Service Worker (via Workbox) - PWA offline caching
  - Cache patterns: `js, css, html, ico, png, svg, wasm` files
  - Implementation: `vite.config.ts` (VitePWA plugin configuration)
  - Cache strategy: CacheFirst for Google Fonts, precache for app assets

## Authentication & Identity

**Auth Provider:**
- None - No user authentication required

## Monitoring & Observability

**Error Tracking:**
- None - Console logging only

**Logs:**
- Console API - Browser console logging
  - Usage throughout codebase for debugging
  - Pattern: `console.log('DROP: message')` for app-specific logs
  - Examples: `src/services/LuaEngine/LuaService.ts`, `src/services/DeviceBridge/DeviceService.ts`, `src/services/PWAService.ts`

## CI/CD & Deployment

**Hosting:**
- GitHub Pages (configured via `build:gh-pages` script in `package.json`)
  - Production base path: `/DROP/`
  - Static site deployment

**CI Pipeline:**
- None detected (manual deployment)

## Environment Configuration

**Required env vars:**
- None (application runs without environment configuration)

**Secrets location:**
- Not applicable (no secrets required for basic operation)

## Webhooks & Callbacks

**Incoming:**
- None - No webhooks configured

**Outgoing:**
- None - No external webhooks

## Hardware Integrations (Browser Web APIs)

**WebUSB API:**
- Daisy Seed devices - DFU firmware flashing
  - Implementation: `src/tools/daisy-flasher/DaisyFlasher.tsx`
  - Device filter: Vendor ID 0x0483 (STMicroelectronics)
  - Interface: DFU (Device Firmware Upgrade)
  - Protocol: Custom DFU implementation adapted from webdfu library
  - Type definition: `src/types/web-apis.d.ts`

**Web Serial API:**
- ESP32 devices - Firmware flashing and serial communication
  - Implementation: `src/tools/esp32-flasher/ESP32Flasher.tsx`, `src/services/DeviceBridge/DeviceService.ts`
  - Default baud rate: 115200
  - Libraries: esptool-js for flashing, native Web Serial for communication
  - Type definition: `src/types/web-apis.d.ts`

**Web Bluetooth API:**
- BLE devices (Eisei, Nordic UART) - Wireless device communication
  - Implementation: `src/services/DeviceBridge/DeviceService.ts`
  - Service UUID: `6e400001-b5a3-f393-e0a9-e50e24dcca9e` (Nordic UART)
  - Characteristics:
    - Parameters/RX: `6e400002-b5a3-f393-e0a9-e50e24dcca9e`
    - Data stream/TX: `6e400003-b5a3-f393-e0a9-e50e24dcca9e`
    - Info: `6e400004-b5a3-f393-e0a9-e50e24dcca9e`
  - Protocol: Nordic UART Service (NUS)
  - Auth: Requires secure context (HTTPS or localhost)

## Native Integration Requirements

**Browser Requirements:**
- Secure context required for all hardware APIs (HTTPS or localhost)
- WebUSB requires user gesture to request device access
- Web Serial requires user gesture to request port access
- Web Bluetooth requires user gesture and device selection

**Device Compatibility:**
- **Daisy Seed**: STM32 microcontroller, DFU mode for flashing
- **ESP32-S3**: ESP-IDF compatible devices via esptool-js
- **BLE devices**: Nordic nRF52+ with Nordic UART Service

---

*Integration audit: 2025-02-08*
