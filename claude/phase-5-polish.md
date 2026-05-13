# Phase 5 — Polish & docs

Final pass before announcing the rework. PWA has been dropped — DROP is a
plain web tool now.

Depends on phase 0–4.

## Tasks

1. **Strip the PWA**
   - Remove `vite-plugin-pwa` (or whatever PWA plugin) from
     `vite.config.ts` and `package.json`.
   - Delete `src/services/PWAService.ts` and any service-worker registration
     in `main.tsx` / `App.tsx`.
   - Delete `src/components/UI/PWAStatus.tsx`.
   - Delete `public/manifest.json`, `public/sw.js`, the `dev-dist/` folder,
     and any `apple-touch-icon` / PWA icon assets that are no longer used.
   - Drop `<link rel="manifest">` and PWA `<meta>` tags from `index.html`.
   - Commit: `chore(pwa): remove PWA shell, manifest, and service worker`.

2. **Favicon + meta refresh**
   - Replace the favicon with a small rust-on-cream NFO mark.
   - Update `<title>` and `<meta name="description">` in `index.html`.
   - Commit: `chore(meta): NFO favicon and page metadata`.

3. **Empty / error states**
   - Audit every surviving tool for "no data", "no device", "fetch failed"
     states. Each should render an NFO `StatusBadge` + a `›` hint, never a
     plain unstyled text node.
   - Commit: `style(ds-nfo): unify empty and error states`.

4. **Keyboard a11y pass**
   - Tab order through the top-bar tabs, then through tool controls.
   - Focus ring uses `outline: 1px solid var(--accent)` everywhere
     (already declared in NFO tokens).
   - Commit: `fix(a11y): focus order and visible focus ring`.

5. **README**
   - Replace the Vite boilerplate `README.md` with a short page describing
     DROP, the firmware utility, wav2datum, datum-viewer, and the link to
     `unwn.dev`.
   - Commit: `docs: rewrite README for eisei launch`.

6. **Build check**
   - `npm run build`, run `vite preview`, click through each tool.
   - Verify the bundle no longer contains workbox/PWA chunks.
   - Commit: `chore(build): post-PWA bundle trim`.

## Acceptance

- No service worker registers in DevTools → Application.
- `npm run build` is clean and the dist bundle has no PWA assets.
- README accurately describes the current tool set (firmware, wav2datum,
  datum-viewer).
- All surviving tools pass a smoke test in `vite preview`.
