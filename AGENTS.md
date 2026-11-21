# Codex instructions — Mój Bilans

## Project and deployment
- This is a **Polish-language, mobile-first static PWA** published on GitHub Pages: https://durart.github.io/moj-bilans/
- The `main` branch can be deployed automatically. Make meaningful code changes in a separate branch/PR and leave releases to an explicit decision. No Netlify deployment.
- Preserve compatibility with existing installed PWAs and previously saved browser data. Use relative paths, never a root-relative asset path that ignores the GitHub Pages subdirectory.
- Inspect current files before editing; do not rely on outdated version labels in comments or old README text.
- Avoid new external dependencies, CDNs, background requests, telemetry or data export unless explicitly requested and justified.

## Relevant code
Static app sources in `index.html`, `style.css`, `app.js`, domain `.mjs` modules, `sw.js`; test scripts via `package.json`. Main UI and behavior are browser JavaScript; do not introduce a new framework casually.

## Data integrity (critical)
The main diary state lives in localStorage under `moj-bilans-v1`; local recovery copies use IndexedDB `moj-bilans-kopie-lokalne-v1` (store `copies`). Do not change either contract or import/export semantics without a migration and regression tests. Sensitive eating, weight and measurements data must remain local/private; never add personal backup JSON to Git.

## Product-specific behavior
Important flows: calories and macro calculations, food search and per-100g/portion conversion, daily diary history, weight/measurements, recovery/export, offline data and PWA updates. Nutrition figures are estimates unless verified; never suggest inferred values are exact.

## Using local Codex skills
Relevant tasks may activate these repo-local skills under `.agents/skills/`:
- `pwa-design` — UI, responsive layout, accessibility, visual hierarchy.
- `pwa-motion` — animations, timer/sound cues and microinteractions.
- `pwa-data-safety` — persistence, imports/exports, offline/cache and migration.
Use the following **only when explicitly requested**, for example with a `$` skill reference:
- `$prototype` — compare multiple UI variants in isolation.
- `$pick-ui-library` — compare dependencies before adoption.
- `$review-animations` — structured critique without automatic edits.
Skills are guidance, not authorization to override the user's requested scope. If guidance conflicts with working data preservation, prioritize data preservation.

## Verification and communication
Run `npm test` after any logic or storage change (if Node is available), and `node --check` for changed standalone JS. Check `sw.js` cache list/version whenever runtime assets change. Explain if browser or real-device checks could not be performed.
- For UI changes, review at 320-390px wide and desktop, check focus/keyboard, text contrast, scroll and touch target size. Honor reduced-motion preferences.
- Use synthetic test data only. Do not publish the user's diary, workouts, identifiers or backups.
- Before finalizing, summarize files modified, actual tests performed, behavior preserved, risks and manual checks remaining.
- A UI polish task is not permission to change nutrition/fitness formulas or user data.
