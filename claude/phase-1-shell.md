# Phase 1 — App shell & navigation

Rebuild the chrome around the tools to match the NFO aesthetic: thin top bar
with wordmark + tabs, no heavy sidebar, mono everywhere.

Depends on phase 0.

## Goal

A user landing on DROP sees: the `unwn` wordmark in serif italic top-left, a
mono tab strip for active tools, and a status area on the right. The current
tool fills the rest of the viewport.

## Tasks

1. **Top bar**
   - New `src/components/Layout/TopBar.tsx` modelled on
     `ui_kits/device-editor/index.html` `TopBar`: 48px tall, `--bg-alt`
     background, `1px solid var(--border)` bottom hairline.
   - Left: `unwn` wordmark (`--font-wordmark`, italic, regular weight).
   - Center: mono tab strip — uppercase, 9px font, `.1em` letter-spacing,
     active tab gets a 2px accent under-border, inactive uses `--ink-4`.
   - Right: device-status indicator slot (later wired in phase 2) + settings
     icon button.
   - Commit: `feat(shell): add NFO top-bar with wordmark and tab strip`.

2. **Remove the vertical navbar**
   - Delete `src/components/Navigation/VerticalNavbar.*` usage from `App.tsx`.
     The top-bar tab strip replaces it.
   - Delete the navbar visibility toggle and its keyboard shortcut.
   - Commit: `refactor(shell): replace VerticalNavbar with top-bar tabs`.

3. **Tool registry refactor**
   - Move `ENABLED_TOOL_IDS` and the tool list out of `App.tsx` into
     `src/tools/registry.ts` (id, label, component, lowercase name).
   - Pre-populate placeholders for `firmware` and `wav2datum`; mark others as
     hidden until they get NFO restyles.
   - Persist active tool in `localStorage` under `drop-active-tool` (unchanged
     key).
   - Commit: `refactor(shell): centralise tool registry`.

4. **Tool layout container**
   - Update `src/design-system/layouts/ToolLayout/` to NFO conventions:
     no rounded corners, hairline borders between regions, `--page-gutter`
     for outer padding, `--max-width` cap with `auto` margins.
   - Provide `<ToolHeader title="firmware" subtitle="flash & download for eisei" />`
     slot using the section-label `01  [ TITLE ]  ─────` convention.
   - Commit: `style(shell): retool ToolLayout for NFO`.

5. **Settings modal restyle**
   - Apply Panel chrome, square corners, mono labels. Keep settings keys and
     storage shape.
   - Commit: `style(shell): restyle SettingsModal in NFO panel chrome`.

6. **(PWA-related chrome moved to phase 5)**
   - PWAStatus and the service worker are removed entirely in phase 5 — no
     restyle needed here.

## Acceptance

- App boots with one chrome bar across the top, no vertical sidebar.
- Switching tools works via tab clicks and persists across reloads.
- Keyboard shortcut for "bigger editor" still toggles the editor-mode layout
  (or is removed if no longer applicable — confirm with user).
- Light/dark theme remains correct in the chrome.

## Open questions

- Should the device-connect button live in the top bar (always visible) or
  inside the firmware tool? Plan assumes top bar as a future hook
  (placeholder slot now, wired in phase 2).
- Keep the bigger-editor keyboard shortcut?
