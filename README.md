# DROP

Browser tools for [unwn](https://unwn.dev) **eisei** owners. Three tools live
under one roof, styled in the NFO design system (warm-paper light / warm-ink
dark, mono-first, zero radius, rust accent).

## Tools

| Tool          | What it does                                                                       |
| ------------- | ---------------------------------------------------------------------------------- |
| `firmware`    | Flash daisy (DFU) and esp32 (serial) over USB, or download the right files for microSD. |
| `wav2datum`   | Convert a `.wav` / `.mp3` / `.ogg` / `.flac` / `.m4a` file into a spectral `.datum` preset. |
| `datum-viewer` | Inspect a saved `.datum` (or `.dat` / `.json`) file — properties + spectral preview. |

## Local development

```sh
npm install
npm run dev      # vite dev server on :5173
npm run build    # production bundle into dist/
npm run preview  # serve the built bundle
```

WebUSB / WebSerial are required for the firmware tool — use a Chromium-based
browser, plug in eisei, and accept the device prompts.

## Theme

Light/dark cycle lives in the top-bar (sun / moon / monitor icon). The
selected mode persists to `localStorage`. `system` follows the OS via
`prefers-color-scheme`.

## Project links

- Firmware releases feed:
  `https://raw.githubusercontent.com/unwndevices/unwn_fw/main/releases.json`
- Hardware: <https://unwn.dev>
