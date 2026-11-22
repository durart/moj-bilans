# Recipe builder v2.7 — staging verification

## Baseline and scope
- Production application: `main` at `durart/moj-bilans`.
- Feature branch: `feature/moj-bilans-v2.7-recipes`.
- No production merge or deployment is authorized.
- The existing `preview/` directory is older than the current production app; do not treat its current UI as an equivalent staging build.
- Stage must be refreshed from the current production assets without overwriting existing test data.

## Required automated checks
1. Recipe calculations: ingredient macros per 100 g, total batch macros, finished yield and portion scaling.
2. Reject zero/negative yield, invalid nutrients, empty names and oversized payloads.
3. Recipe CRUD: create, edit, duplicate and delete by stable IDs.
4. Diary snapshot: changing or deleting a recipe must not change past diary entries.
5. Backup round-trip: `recipes` survives JSON export/import; old backups without `recipes` still import.
6. Persist failure: failed localStorage write must not silently change in-memory state.
7. Search: basic foods, saved catalog, diacritics and manual fallback.
8. Date/meal routing: diary entry goes to selected date and meal.
9. Isolation: staging storage key and IndexedDB must differ from production.
10. PWA: refresh, offline loading, Service Worker cache and updates.

## Manual acceptance
- Android Chrome installed PWA, desktop Chrome.
- Add a recipe with at least two searched ingredients and one manually entered ingredient.
- Save, reopen, edit and duplicate.
- Add a 200 g portion to a selected meal/date, verify displayed totals.
- Change recipe, verify historical diary snapshot remains unchanged.
- Export JSON, import into clean staging profile, verify full restore.
- Verify existing journal, history, measurements, goals and backups.

## Blocking items
- Stage current production files and all required scripts/styles under an isolated `preview/` path.
- Run syntax, regression and browser tests on that exact build.
- Verify the staging URL returns the actual application (not a 404).
- Record production baseline SHA and tested staging SHA.
- Ask for explicit production approval only after successful staging acceptance.
