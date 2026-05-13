# Phase 2 — Firmware tool

Replace `daisy-flasher` and `esp32-flasher` with one **Firmware** tool that
covers both USB flashing and microSD download paths.

Depends on phase 0 and phase 1.

## Post-implementation note (2026-05-13)

Shipped shape differs from the original mock below. The final layout uses
**four numbered sections in a two-column grid** on desktop, with no
top-level segmented tabs and bare `OK`/`ERR`/`WARN`/`INFO` status tokens
(no `[ ]` chrome):

```
› firmware

┌── 01 version ─────────────┐  ┌── 02 flash esp32 (serial) ─┐
│ › v1.0.0  (latest)        │  │  connect esp32 (serial)    │
│ [_] show betas            │  │  flash                     │
│ release notes…            │  └────────────────────────────┘
│                           │  ┌── 03 flash daisy (dfu) ────┐
│                           │  │  connect daisy (dfu)       │
│                           │  │  flash                     │
│                           │  └────────────────────────────┘
│                           │  ┌── 04 download for microsd ─┐
│                           │  │ › daisy → firmware.bin     │
│                           │  │ › esp32 → eisei-1.0.0.esp  │
└───────────────────────────┘  └────────────────────────────┘
```

ESP32 is presented first to match recommended provisioning order; downloads
are last as a fallback path. On mobile, the grid collapses to a single
column.

## Goal (original mock — historical)

A single tool with two top-level segments:

```
firmware
  flash · download

01 target ───────────────────────────────────
   ( ) daisy   ( ) esp32   ( ) both

02 version ──────────────────────────────────
   › v1.0.0  (latest)            show betas ☐
   release notes...

03 action ───────────────────────────────────
   flash via usb        OR        download for microsd

   INFO connect daisy in DFU mode, then press flash.
   ........................... 100%   OK done.
```

## Folder layout

```
src/tools/firmware/
├── index.ts
├── Firmware.tsx               ← tool entry, holds tab/target state
├── flash/
│   ├── FlashPanel.tsx          ← orchestrates flow per target
│   ├── DaisyFlasher.ts         ← migrate dfu-webdfu logic here
│   ├── Esp32Flasher.ts         ← migrate esp32-flasher logic here
│   └── CombinedFlasher.ts      ← daisy → esp32 (+ littlefs) sequencer
├── download/
│   └── DownloadPanel.tsx       ← rename + save-as helper
├── releases/
│   ├── useReleases.ts          ← fetch + cache releases.json
│   ├── releases.types.ts       ← Release, Platform types
│   └── filters.ts              ← isBeta(version), latestStable(...)
└── ReleaseNotes.tsx            ← markdown renderer for the changelog array
```

## Tasks

1. **Releases data layer**
   - `useReleases()` hook fetches
     `https://raw.githubusercontent.com/unwndevices/unwn_fw/main/releases.json`
     with a 5-min in-memory cache and a `localStorage` fallback for offline.
   - `isBeta(version)` — true if version (after stripping `v`) matches
     `/\d+\.\d+\.\d+[a-z]/` (e.g. `1.0.1b1`).
   - `latestStable(releases)` — first release where `!isBeta`.
   - **Version floor**: filter out any release whose stable major.minor.patch
     is below `1.0.0`. v1.0 is the baseline for eisei launch; older versions
     never appear in the dropdown even when the beta toggle is on.
   - Commit: `feat(firmware): releases data layer with beta detection and v1.0 floor`.

2. **Firmware tool scaffolding**
   - Add `firmware` to the registry as the first tool. Default-on.
   - `Firmware.tsx` holds two pieces of state: `mode: 'flash'|'download'` and
     `target: 'daisy'|'esp32'|'both'`. Segmented selectors at top.
   - Version dropdown (uses `CustomSelect` NFO component). Beta toggle
     defaults to off — filters versions accordingly.
   - Release notes panel renders the selected version's `changelog[]` via
     `marked`.
   - Commit: `feat(firmware): tool scaffolding with target+mode segmenteds`.

3. **Migrate Daisy DFU flashing**
   - Move `src/tools/daisy-flasher/dfu-webdfu.ts` →
     `src/tools/firmware/flash/dfu/`. Keep the WebUSB logic unchanged.
   - `DaisyFlasher.ts` exposes
     `connect()`, `flash(blob, onProgress)`, `disconnect()`.
   - Erase QSPI sectors before write (same as current
     `daisy-flasher` behaviour, see commit `4fc0ec2`).
   - Commit: `refactor(firmware): migrate Daisy DFU flasher from daisy-flasher`.

4. **Migrate ESP32 flashing**
   - Move ESP-WebTools / esptool-js logic from `src/tools/esp32-flasher/` to
     `src/tools/firmware/flash/esp/`. Keep the same flash addresses
     (bootloader / partitions / app / spiffs) it currently uses.
   - `Esp32Flasher.ts` exposes
     `connect()`, `flash({app, littlefs}, onProgress)`, `disconnect()`.
   - Commit: `refactor(firmware): migrate ESP32 flasher from esp32-flasher`.

5. **Combined flow (both)**
   - `CombinedFlasher.ts` — flashes Daisy via DFU, then ESP32 (app +
     **LittleFS data partition containing the Daisy fw** from
     `releases.json.platforms.littlefs`).
   - UI shows two progress bars stacked, plus a Terminal log.
   - Commit: `feat(firmware): combined Daisy+ESP32 flash flow with littlefs`.

6. **Download panel (microSD)**
   - Render **one download link per file**, never auto-trigger or zip — the
     user clicks each link explicitly so they can save them where they want
     on the SD card.
   - File rename on save (via `download` attribute on the `<a>`):
     - Daisy → `firmware.bin`
     - ESP32 → `eisei-${version}.esp` (strip the `v` prefix from
       `releases.latest`, keep the rest, e.g. `eisei-1.0.0.esp` or
       `eisei-1.0.1b1.esp`).
   - Use the existing `littlefs` payload when target = `daisy` so the bin is
     the **Daisy firmware**, not the ESP wrapper — `daisy_debug` available as a
     "debug" sub-toggle (only shown when present in `platforms.daisy_debug`).
   - When target = `both`, render **two stacked download links**:
     `› daisy → firmware.bin` and `› esp32 → eisei-X.Y.Z.esp`. Each is a
     separate click. No zip.
   - Commit: `feat(firmware): download panel with microSD rename`.

7. **Top-bar device-status hook**
   - Plug DFU / serial connection state into the placeholder slot from
     phase 1: green dot + `connected` / `disconnected` text, mono.
   - Commit: `feat(firmware): surface connection status in top bar`.

8. **Retire old tools**
   - Delete `src/tools/daisy-flasher/` and `src/tools/esp32-flasher/`.
   - Delete `src/components/FirmwareSelector/` (logic now in
     `releases/useReleases.ts`).
   - Drop their entries from the registry.
   - Commit: `chore(firmware): remove standalone daisy-flasher and esp32-flasher`.

## Acceptance

- Single `firmware` tool in the top-bar.
- Default view: target = `daisy`, mode = `flash`, version = latest stable.
- Only versions >= `v1.0.0` ever appear. No `v0.x` entries.
- Beta toggle hidden → only stable versions in the dropdown.
- Beta toggle revealed → betas appear with a `(beta)` tag after the
  version string.
- "Flash" path:
  - Daisy alone → DFU flow, single progress bar.
  - ESP32 alone → ESP serial flow, single progress bar.
  - Both → Daisy DFU → ESP32 serial (app+littlefs), stacked progress bars,
    terminal log streams `OK` / `ERR` badges.
- "Download" path:
  - Daisy → one click → file named `firmware.bin`.
  - ESP32 → one click → file named `eisei-X.Y.Z.esp` (or `...b1.esp`
    for betas).
  - Both → two stacked links, one click each. No zip.
  - Daisy debug variant available when present.

## Open questions

- Should `flash` mode require an explicit "I have the device connected"
  acknowledgment before kicking off, given the daisy-flasher fix history
  (commits `1af67ac`, `4fc0ec2`)? Plan: yes, a small `flash` button
  becomes active only after `connect`.
