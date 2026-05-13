# DROP rework — eisei launch

Multi-phase plan to rework DROP around the **NFO** design system and refocus the
toolset on what eisei owners actually need. Each phase has its own file with a
detailed task list and acceptance criteria. Commits are atomic per task.

## Status table

| #  | Phase                              | File                          | Status   |
| -- | ---------------------------------- | ----------------------------- | -------- |
| 0  | NFO design foundations             | `phase-0-foundations.md`      | done     |
| 1  | App shell & navigation             | `phase-1-shell.md`            | done     |
| 2  | Firmware tool (flash + download)   | `phase-2-firmware.md`         | pending  |
| 3  | Wav2Datum rework                   | `phase-3-wav2datum.md`        | pending  |
| 4  | Tool curation & cleanup            | `phase-4-cleanup.md`          | pending  |
| 5  | Polish, PWA, docs                  | `phase-5-polish.md`           | pending  |

Update the status column as phases progress: `pending` → `in-progress` → `done`.

## Source-of-truth references

- **NFO design system** (extracted handoff bundle):
  `/tmp/nfo-design/unknown-devices-design-system/` — copy the parts we need into
  `src/design-system/nfo/` in phase 0. Re-extract from
  `https://api.anthropic.com/v1/design/h/zLI-fFZb8dIIKu1bzAkTIw` (gzip tarball)
  if the tmp copy is gone.
- **Firmware releases feed**:
  `https://raw.githubusercontent.com/unwndevices/unwn_fw/main/releases.json`
  — already structured with `latest`, `releases[]`, `version`, `releaseDate`,
  `changelog[]`, `platforms.{daisy,daisy_debug,esp32,littlefs}`.
- **microSD filename conventions** (from `unwn/Libs/unwnlib/Protocol/FirmwareUpdateChecker.cpp`
  and `unwn/eisei/daisy/DaisyFirmwareReceiver.cpp`):
  - ESP32 firmware on SD root: **`eisei-X.Y.Z.esp`** (prefix `eisei-`, ext `.esp`,
    Daisy scans and forwards over UART).
  - Daisy own firmware on SD root: **`firmware.bin`** (Daisy bootloader auto-flash).
- **Beta marker**: any version string containing the letter `b` after the patch
  number (e.g. `v1.0.1b1`). Hide by default; toggle to reveal.

## Cross-phase decisions

- **Theme**: NFO fork (warm-paper light + warm-ink dark, mono-first Fira Mono,
  zero radius, rust accent `#da532c`). Drop the existing CRT/RetroOverlay vibe
  — NFO replaces it.
- **Firmware utility**: single tool called `firmware`, two top-level segmented
  tabs `flash` / `download`. Replaces `daisy-flasher` + `esp32-flasher`.
- **Beta toggle**: off by default.
- **Download filenames**: rename to device convention on save
  (`firmware.bin`, `eisei-X.Y.Z.esp`).
- **Tone**: lowercase UI labels, `[ BRACKETED ]` panel titles, `›` prompt char,
  `[OK]/[ERR]/[WARN]/[INFO]` status badges. No emoji.

## Commit etiquette

- Atomic commits per task — each task in a phase file is a commit-sized unit.
- Conventional-commits prefix: `feat(firmware):`, `style(ds-nfo):`,
  `refactor(shell):`, `chore(deps):`, etc.
- When a phase completes, mark its row `done` in this file as part of the final
  commit for the phase.
