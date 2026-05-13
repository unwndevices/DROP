# Phase 0 — NFO design foundations

Establish the NFO design system inside DROP so every later phase can build on
shared tokens and primitives. No tool UI changes here — we only touch
`src/design-system/` and the global stylesheet.

## Goal

`src/design-system` produces components that render in the NFO style by default:
mono Fira Mono, warm-paper background, zero radius, `[ BRACKETED ]` panel
chrome, `›` prompt character, status badges.

## Tasks

1. **Vendor the NFO assets**
   - Create `src/design-system/nfo/`.
   - Copy `colors_and_type_nfo.css` into `src/design-system/nfo/tokens.css`.
   - Copy the WOFF2 font files (`FiraMono-{Regular,Medium,Bold}.woff2`,
     `HelveticaNeueCyr-{Roman,Italic,Light,Medium,Bold}.woff2`) into
     `public/fonts/` and fix the `@font-face` `url(...)` paths to
     `/fonts/...`.
   - Commit: `chore(design-system): vendor NFO fonts and token CSS`.

2. **Wire tokens into the existing `--ds-*` proxy layer**
   - Update `src/design-system/tokens/index.css` so the `--ds-color-*`,
     `--ds-font-*`, `--ds-spacing-*` variables resolve to NFO values
     (`--bg`, `--ink-1`, `--accent`, `--font-primary`, `--space-N`, etc.).
   - Map zero-radius across the board: `--ds-border-radius-* : 0`.
   - Force mono on body: `--ds-font-sans: var(--font-primary)`.
   - Remove the glow/blur shadow tokens (set to `none`).
   - Commit: `style(design-system): retheme ds tokens to NFO palette`.

3. **Add NFO-specific primitives**
   - `src/design-system/components/Panel/` — wrapper with `[ TITLE ]` chrome
     header, optional action slot, body padding token. Replaces ad-hoc Card use
     where the NFO panel pattern fits.
   - `src/design-system/components/SectionLabel/` —
     `01  [ LABEL ]  ──────────────` row.
   - `src/design-system/components/StatusBadge/` — `[OK]/[ERR]/[WARN]/[INFO]`
     inline badge (text-only, no fill).
   - `src/design-system/components/Segmented/` — segmented button group
     (used by Flash/Download tab + target picker).
   - `src/design-system/components/DropZone/` — dashed-border drag/drop area
     with `[ drop file here ]` label.
   - `src/design-system/components/Terminal/` — dark-background log with `›`
     prefix and ok/err/warn/info color rows.
   - Export from `src/design-system/index.ts`.
   - Commit each component separately:
     `feat(ds-nfo): add Panel primitive`, etc.

4. **Restyle existing primitives in place**
   - `Button` — variants `primary | accent | secondary | ghost | danger` with
     square corners, uppercase mono label, `letter-spacing: .1em`, no shadow.
     Preserve current API.
   - `Input`, `Select` — square, hairline border, `›` accent prefix slot,
     focus = `border-strong` color shift.
   - `Card` — flatten (no shadow, square corners, hairline). Keep API; rely on
     new `Panel` for chrome-heavy use cases.
   - `StatusIndicator` — convert to text-only `[OK]/[ERR]/...` bracket
     convention; drop the colored dot if it conflicts with NFO.
   - Commit: `style(ds-nfo): restyle Button + Input + Select + Card to NFO`.

5. **Retire the retro CRT overlay**
   - Remove `src/components/UI/RetroOverlay/` import from `App.tsx` (delete
     usage, leave the component file behind in case we want it later — or
     delete if confirmed unused).
   - Drop any blur/glow CSS leftovers from `src/styles/globals.css`.
   - Commit: `refactor(shell): drop CRT retro overlay in favour of NFO`.

6. **Light/dark mode switch**
   - Ensure `[data-theme="dark"]` on `<html>` flips the dark palette. Surface
     the toggle in the existing settings modal (keep API).
   - Default: respect `prefers-color-scheme`, fall back to light.
   - Commit: `feat(ds-nfo): wire light/dark theme via data-theme attribute`.

## Acceptance

- `npm run dev` renders the existing tools with the NFO palette and Fira Mono
  body text without crashes (visual is rough but tokens resolve).
- New primitives (`Panel`, `SectionLabel`, `StatusBadge`, `Segmented`,
  `DropZone`, `Terminal`) render correctly in isolation.
- No lingering rounded corners, glows, or backdrop-blur in the DS.
- Light/dark toggle round-trips.

## Open questions

- Keep the WOFF font files in-repo (~600 KB total) or host them on a CDN?
  Plan assumes in-repo for offline PWA support.
- Drop `RetroOverlay` entirely or keep it behind a settings flag for nostalgia?
  Plan assumes drop.
