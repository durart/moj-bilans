# Architecture refactoring 2.8.0 — baseline and execution gates

## Verified baseline
- Repository: durart/moj-bilans
- Production branch: main
- Baseline commit: fbb00e85d5de70e58173008a5bda11113acf19e1
- Baseline package version: 2.7.1
- Stabilization PR: #22, merged
- Working branch: refactor/architecture-2.8.0
- Existing application entry points: index.html, app.js
- Existing regression command: npm test
- Existing preview builder: build-staging.mjs
- Applicable coding standard: Standard programowania AI — zasady globalne, latest document revision read on 2026-11-22.

## Safety constraints
1. Do not merge to main or modify production assets without explicit approval.
2. Preserve the persisted data schema and storage keys until characterized by tests.
3. Keep preview storage and service-worker scope isolated from production.
4. Reuse the existing preview deployment rather than create redundant environments.
5. Before any module extraction, capture current behavior with regression tests.
6. After every extraction run unit, integration and browser regression checks.
7. Test backup export/import round trips and legacy 2.7.1 restore.
8. Verify online/offline loading, SW upgrade, and cache cleanup on the deployed preview.
9. Document baseline and tested commit SHAs, failures, and rollback instructions.

## Execution sequence
- Inventory scripts, data keys, global dependencies, service worker and preview workflow.
- Characterize calculation and serialization behavior with tests.
- Extract pure calculations and validation first, preserving external interfaces.
- Isolate persistence behind a repository adapter without migrating stored data.
- Extract controllers and rendering logic incrementally.
- Audit service-worker precache and update activation.
- Run complete regression and publish isolated preview.
- Prepare PR for review, stop before production merge.

## Initial observations
- app.js is approximately 112 KB; index.html approximately 51 KB.
- Existing modules include backup-validation.js, goal-calculator.js, np-history-24.js and np-body-25.js.
- build-staging.mjs copies assets based on sw.js references and rewrites preview HTML/manifest.
- No architectural refactor branch existed before this task.

## Verification status (updated 2026-11-22)
- Extracted domain modules: nutrition, diary-format, storage, values, products, recipes, diary-state, measurements, water.
- Extracted UI modules: dom, navigation, water, settings. Existing large renderers remain in app.js and are explicitly deferred technical debt.
- Added isolated regression suites for the extracted modules and registered them in npm test.
- Last fully verified candidate before this documentation update: commit 74e57f319c968e9728e2c9c487e92e9e4800ae12, GitHub Actions #115: verify, browser, publish-preview, live-preview all passed.
- Later hydration module commit ce6751bbe1cf2370a68823a2e48766bb91f360d2: verify passed; browser and publication must be checked separately. Never extrapolate CI status to newer commits.
- Public isolated preview: https://durart.github.io/moj-bilans/preview/ (GitHub Actions #115 confirmed live-preview).
- Production key `moj-bilans-v1`, preview key `moj-bilans-preview-v27`, and schema v6 remain unchanged.
- Service-worker revision `v280-rc1` and isolated preview cache scope are covered by CI browser tests.
- Actual-device acceptance (Android installation, offline refresh, SW update, backup restore) remains open; CI cannot substitute for a physical device.
- Production merge and deployment: NOT AUTHORIZED.

## Outstanding technical debt
- app.js retains the larger journal, history, weight and measurement UI renderers, plus orchestration and mutation code.
- Further extraction should be scoped to a separate iteration if it risks expanding the regression surface of this release.
- Do not claim full modularization of app.js; this is an incremental architecture release.

## Release gate
1. Obtain a green unit and browser CI run on the final candidate commit.
2. Review script order and cache revision, ensure offline module graph is complete.
3. Publish isolated staging and verify online, offline, SW update, import/export and recovery on the actual staging URL.
4. Complete UI controller extraction or explicitly document remaining debt.
5. Prepare a rollback procedure and obtain explicit production approval before merging.

## Staging deployment and rollback
- PR #23 publishes only `preview/` to the GitHub Pages branch after both verify and browser jobs succeed.
- Preview URL: https://durart.github.io/moj-bilans/preview/ (do not claim live availability until live-preview passes).
- Preview data key: `moj-bilans-preview-v27`; preview IndexedDB: `moj-bilans-preview-copies-v27` (names retained to avoid breaking earlier preview data).
- Production data key remains `moj-bilans-v1`; no data migration or production application files changed by the staging publisher.
- Cache namespace: `moj-bilans-preview-recipes-v280-rc1` for preview; `moj-bilans-cache-v280-rc1` for future production after explicit approval.
- Rollback preview by restoring the previous `preview/` directory from Git history; do not remove production root files or clear production storage.
- Never merge PR #23 to main without explicit user approval.
