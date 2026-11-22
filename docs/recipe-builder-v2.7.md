# Recipe Builder v2.7 — implementation contract

Status: development branch; not released.

## Scope
- Create, edit, duplicate and delete user recipes.
- Ingredients reference stable product IDs where available and keep a nutrition snapshot per 100 g.
- Recipe includes ingredient quantities, total input weight, optional cooked yield weight, and calculated total nutrition.
- Portion calculation uses cooked yield weight, never raw ingredient weight when a cooked yield is supplied.
- Journal entries store a snapshot of calories and macros at insertion time, so later recipe edits do not change history.
- Recipe data must be included in existing backup export/import, with duplicate ID handling.
- Mobile-first Polish UI, accessible controls and explicit destructive-action confirmation.

## Nutrition calculation
For each nutrient N: totalN = sum(ingredient.quantityGrams / 100 * ingredient.per100g[N]).
Per100g = totalN * 100 / yieldGrams.
PortionN = totalN * portionGrams / yieldGrams.
Validate finite nonnegative nutrient values, positive weights and nonempty names. Round only for presentation.

## Safety and compatibility
- Preserve all pre-existing journal entries and settings.
- Do not overwrite legacy storage keys.
- Add versioned recipe storage with migration and validation.
- Verify existing backup and restore flow before integrating new data.
- Keep staging storage and service-worker scope isolated from production.
- Test offline refresh, recipe editing, backup roundtrip, zero/invalid weights, 100 g vs portion and history immutability.

## Release gates
1. Complete architecture and storage review.
2. Implement on this feature branch.
3. Automated unit and regression tests.
4. Publish to existing /preview/ environment only after checking isolation.
5. User acceptance on desktop and Android.
6. Production merge only with explicit approval.
