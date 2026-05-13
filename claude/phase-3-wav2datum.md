# Phase 3 — Wav2Datum rework

Simplify and re-skin the Wav2Datum tool. Same functionality, NFO surface, one
clear top-to-bottom flow.

Depends on phase 0.

## Goal

A single scrollable column:

```
[ WAV2DATUM ]

01 [ SOURCE ] ───────────────────────────────────
   [ drop wav here ] or click to browse
   loaded: mysample.wav · 44100 Hz · 3.2 s

02 [ ANALYSIS ] ─────────────────────────────────
   detail rate  › 1× — 2 kHz, max 27 s (std)
   input gain   ▮▮▮▮▮▯▯▯▯▯ 1.00
   preroll      › reverse

03 [ PREVIEW ] ──────────────────────────────────
   ┌────────────────────────────────────────────┐
   │ spectral preview (transport bar)           │
   └────────────────────────────────────────────┘
   slot fits 162 / 256 frames        [OK]  ready

04 [ OUTPUT ] ───────────────────────────────────
   preset name › my_sample__
   [ download .datum ]
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
   - Keep `SimpleSpectrumChart`. Wrap in `Panel` with `[ SPECTRAL PREVIEW ]`
     header.
   - Add the NFO `TransportBar` (frame counter + scrubbable line + accent
     dot) replacing the current play controls.
   - Surface the slot-capacity bar from commit `0a7b810` as a mono
     `slot fits N / 256 frames` line + a 1px progress hairline.
   - Commit: `style(wav2datum): NFO preview + transport bar`.

5. **Output**
   - Preset name as `TextInput` with `›` prefix.
   - Single primary button `[ DOWNLOAD .DATUM ]` (NFO uppercase mono).
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
