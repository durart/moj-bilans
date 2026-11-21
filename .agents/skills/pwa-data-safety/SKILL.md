---
name: pwa-data-safety
description: Use when changing localStorage, IndexedDB, import/export, backup/restore, workout or diary persistence, PWA caching, offline behavior, or migrations. Activate before stateful changes that could lose user data.
---

# Preserve user data and offline behavior

1. Inventory current storage keys, schemas, save/read/restore paths and service-worker behavior from the actual code.
2. Maintain backward compatibility. Never rename storage keys, wipe local storage, delete caches containing user data or reset existing records without an explicit migration and recovery plan.
3. Make imports and migrations validate input, handle partial/corrupt data safely and avoid overwriting good data. Prefer explicit conflict handling, backups and idempotent operations.
4. Test with representative fake data only; do not commit real personal records or export files. Cover first use, existing data, empty/corrupt input, reload, and interrupted task.
5. Distinguish offline-capable core features from any features requiring remote resources. Keep all GitHub Pages URLs relative to the repo base path.
6. For any service-worker change, reason about cache versioning and upgrade behavior on already installed PWAs.
7. State remaining risks and the steps needed to verify on the user's actual phone. Do not claim real-device testing unless it happened.

Coordinate with pwa-design or pwa-motion when a change also affects UI or feedback.
