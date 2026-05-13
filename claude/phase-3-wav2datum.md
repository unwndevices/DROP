# Phase 3 — Wav2Datum rework

Simplify and re-skin the Wav2Datum tool. Same functionality, NFO surface, one
clear top-to-bottom flow.

Depends on phase 0.

## Post-implementation note (2026-05-13)

Final layout uses a **two-column grid** on desktop: `01 source` on the
left, `02 analysis` / `03 preview` / `04 output` stacked in the right
column. Mobile collapses to a single column. All `[ ]` chrome dropped —
section titles and badges render bare (e.g. `OK ready`, `download .datum`).

## Goal

```
› wav2datum

┌── 01 source ──────────────┐  ┌── 02 analysis ─────────────┐
│ drop wav here             │  │ detail rate › 1× — 2 kHz   │
│ loaded: mysample.wav      │  │ input gain  ▮▮▮▮▮▯▯ 1.00   │
│         44100 hz · 3.2 s  │  │ preroll     › reverse      │
└───────────────────────────┘  └────────────────────────────┘
                               ┌── 03 preview ──────────────┐
                               │ spectral preview chart     │
                               │ ◀ ▶  ───●──────  43 / 256  │
                               │ slot fits 162 / 256  OK    │
                               └────────────────────────────┘
                               ┌── 04 output ───────────────┐
                               │ › my_sample.datum          │
                               │   download .datum          │
                               └────────────────────────────┘
```

## Tasks

1. **Skeleton + sections**
   - Refactor `Wav2Datum.tsx` to use `Panel` + `SectionLabel` primitives.
   - Move the four steps into clearly numbered sections; no horizontal
     splits, no tabs.
   - Commit: `refactor(wav2datum): reorganise layout into 4 NFO sections`.

2. **DropZone replaces the file input + dropdown UI**
   - Use the new `DropZone` primitive for `01 SOURCE`. Below it: a one-line
     mono summary of loaded file (`name · sample rate · duration`).
   - Commit: `feat(wav2datum): use NFO DropZone for source`.

3. **Analysis controls as ParamSlider/CustomSelect**
   - Detail rate → `CustomSelect` with the existing `DETAIL_OPTIONS`.
   - Input gain → `ParamSlider` (0..2, step 0.01).
   - Preroll → `Segmented` (`reverse / loop / none`).
   - Commit: `style(wav2datum): NFO controls for analysis settings`.

4. **Preview panel**
   - Keep `SimpleSpectrumChart`. Wrap in `Panel` titled `spectral preview`.
   - Add the NFO `TransportBar` (frame counter + scrubbable line + accent
     dot) replacing the current play controls.
   - Surface the slot-capacity bar from commit `0a7b810` as a mono
     `slot fits N / 256 frames` line + a 1px progress hairline.
   - Commit: `style(wav2datum): NFO preview + transport bar`.

5. **Output**
   - Preset name as `TextInput` with `›` prefix.
   - Single primary button `download .datum` (accent border, lowercase).
   - Commit: `style(wav2datum): NFO output controls`.

6. **Status log**
   - Replace inline status messages with `StatusBadge` / `StatusLog` rows
     under each section that owns the state (e.g. WASM ready, conversion
     progress, errors).
   - Commit: `feat(wav2datum): status log using NFO badges`.

7. **Drop dead UI**
   - Remove the existing card grid, header icons, and any retro/glow styles.
   - Commit: `chore(wav2datum): remove legacy card grid styles`.

## Acceptance

- Loading a WAV → analysis runs → preview updates → `.datum` download
  produces a byte-identical output to the pre-rework tool for the same
  settings.
- All controls are NFO-styled (no rounded corners, no shadows, mono labels).
- Slot-capacity bar updates with detail-rate changes (preserves behaviour
  from commits `d10b24d`, `0a7b810`).

## Open questions

- Keep WASM filter-bank initialisation gated behind a "warm up" affordance,
  or load eagerly on tool mount? Plan: eager (matches current behaviour).
- Add a "load datum file" affordance for re-editing? Plan: out of scope —
  the existing `datum-viewer` tool covers that.
