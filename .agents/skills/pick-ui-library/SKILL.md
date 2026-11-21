---
name: pick-ui-library
description: Use only when the user explicitly requests a library comparison, dependency recommendation, or invokes $pick-ui-library. Do not activate whenever a component is being edited.
---

# Choose the smallest viable library

1. Inspect the existing stack and requirements (size, browser targets, offline/PWA support, accessibility, license, maintenance and mobile performance).
2. Always evaluate a zero-dependency native HTML/CSS/JavaScript solution first.
3. Compare at most three real options, with honest costs: bundle size, additional runtime or build tooling, API compatibility, update risk and ongoing maintenance.
4. Verify currency-sensitive facts from official docs or package metadata when tools permit; label unknowns instead of inventing them.
5. Recommend the least risky choice. Do not add dependencies or CDNs without user approval and a clear implementation task.
