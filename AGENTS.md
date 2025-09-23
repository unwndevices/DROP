# Repository Guidelines

## Project Structure & Module Organization
DROP is a Vite-powered React app. Application code resides in `src/`, starting from `src/main.tsx` and `src/App.tsx`. Shared UI wrappers live in `src/components`, context/providers in `src/contexts`, cross-cutting services in `src/services`, and reusable hooks and utilities in `src/hooks` and `src/utils`. Individual tools (spectral analysis, datum viewer, flashers, etc.) live under `src/tools/*` with co-located styles in each tool folder and global styles in `src/styles`. Static assets are served from `public/`; built artifacts land in `dist/` while `dev-dist/` can be treated as disposable. Reference notes and memory assets sit in `memory-bank/`—do not ship them.

## Build, Test, and Development Commands
- `npm install` sets up dependencies, including the local `enjin2-wasm` workspace link.
- `npm run dev` launches the Vite dev server with HMR on http://localhost:5173.
- `npm run build` type-checks with `tsc -b` then produces an optimized bundle in `dist/`.
- `npm run preview` serves the production build for smoke testing.
- `npm run lint` runs ESLint across TS/TSX; fix issues before committing.

## Coding Style & Naming Conventions
Favor TypeScript + React functional components. Keep 2-space indentation, trailing commas, and single quotes—`npm run lint` enforces the defaults. Name components and files with PascalCase (`VerticalNavbar.tsx`), hooks with `use` + camelCase, and context/services with clear domains (`SettingsContext`, `PWAService`). Co-locate CSS files next to their components or tools; shared tokens belong in `src/styles` or `src/design-system`.

## Testing Guidelines
No automated runner ships today; rely on targeted linting and manual exercises. For hardware-focused flows, load the HTML harnesses (`test_enjin2.html`, `test_lua_debugging.html`, etc.) from the repo root and confirm console output. When adding tests, mirror the existing patterns: colocate lightweight fixtures under the relevant tool folder and gate complex suites behind explicit npm scripts.

## Commit & Pull Request Guidelines
Commit messages follow a single concise line in present tense (e.g., `add esp32 flasher retry`). Group related changes together and avoid multi-topic commits. Pull requests should summarize the change, list any manual verification (`npm run lint`, harness URLs), reference issues or TODO entries, and include screenshots or recordings whenever UI changes are visible.

## Environment & Assets
Ensure the relative `enjin2-wasm` dependency resolves by keeping the sibling `unwn-vcv` repository checked out. Large binary assets should live under `src/assets` or tool-specific folders; prefer zipped payloads via `jszip` utilities when shipping firmware. Store local experiments in `memory-bank/` or docs under `TODO.md`, not within `src/` unless they are production-ready.
