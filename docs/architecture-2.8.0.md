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

## Verification status
- Refactor modules extracted: domain/nutrition.js, domain/diary-format.js, domain/storage.js, domain/values.js, domain/products.js, domain/recipes.js and ui/dom.js.
- Automated and browser regression: both passed on commit a591cf89 (GitHub Actions run #45). Subsequent checks remain commit-specific; never assume later commits passed.
- New regression suites cover nutrition, diary serialization, guarded persistence, DOM escaping, date/number conversions, product provenance and recipe rules.
- Production storage key and JSON backup schema remain unchanged; no data migration.
- Existing preview builder is exercised in CI, but 2.8.0 has not been published to a publicly reachable staging URL.
- Service-worker cache revision and public staging verification remain release blockers.
- Production merge and deployment: NOT AUTHORIZED.

## Release gate
1. Obtain a green unit and browser CI run on the final candidate commit.
2. Review script order and cache revision, ensure offline module graph is complete.
3. Publish isolated staging and verify online, offline, SW update, import/export and recovery on the actual staging URL.
4. Complete UI controller extraction or explicitly document remaining debt.
5. Prepare a rollback procedure and obtain explicit production approval before merging.
