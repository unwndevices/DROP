# Phase 4 — Tool curation & cleanup

Decide which existing tools survive the rework, restyle the survivors, and
delete the rest. Final shape of the tool palette for eisei launch.

Depends on phase 0–3.

## Current tools (from `src/tools-config.ts`)

| ID                  | Status today | Action     | Notes |
| ------------------- | ------------ | ---------- | ----- |
| `firmware`          | new          | **keep**   | built in phase 2 |
| `wav2datum`         | enabled      | **keep**   | reworked in phase 3 |
| `datum-viewer`      | enabled      | **keep**   | inspect saved `.datum` files; restyle |
| `daisy-flasher`     | enabled      | **delete** | folded into `firmware` (phase 2) |
| `esp32-flasher`     | enabled      | **delete** | folded into `firmware` (phase 2) |
| `device-bridge`     | enabled      | **delete** | killed for now |
| `ui-graphics`       | enabled      | **delete** | killed for now |
| `pixel-art-generator` | disabled  | **delete** | not eisei-relevant |
| `spectral-analysis` | disabled     | **delete** | superseded by wav2datum preview |

Final shipping tools: `firmware`, `wav2datum`, `datum-viewer`.

## Tasks

1. **`datum-viewer` restyle**
   - DropZone for `.datum` file, spectral preview panel, transport bar
     reused from phase 3 work.
   - Commit: `style(datum-viewer): NFO restyle`.

2. **Delete retired tools**
   - Remove directories under `src/tools/` for `device-bridge`,
     `ui-graphics`, `pixel-art-generator`, `spectral-analysis`, and (already
     folded) `daisy-flasher` / `esp32-flasher`.
   - Drop their entries from the registry.
   - Drop unused dependencies (e.g. WebSerial wrappers, image-conversion
     libs) if they were dragged in only for these tools.
   - Commit each removal separately:
     `chore(tools): remove device-bridge`,
     `chore(tools): remove ui-graphics`,
     `chore(tools): remove pixel-art-generator`,
     `chore(tools): remove spectral-analysis`.

3. **Sweep the codebase**
   - Find stray references in `src/components/`, `src/services/`,
     `src/styles/` to deleted tools and clean them up.
   - Search for `RetroOverlay`, glow CSS, blur backdrops — remove any
     leftovers.
   - Commit: `chore(cleanup): sweep dead references and styles`.

## Acceptance

- `npm run build` is clean.
- No dead imports.
- All surviving tools render in NFO style and pass a smoke test
  (load → use main affordance → see expected result).
