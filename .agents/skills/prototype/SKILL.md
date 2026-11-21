---
name: prototype
description: Use only when the user explicitly asks for a prototype, UI variants, a side-by-side comparison, or invokes $prototype. Do not activate for normal production UI edits.
---

# Compare interface variants safely

1. Clarify the UI element and success criteria from the request; do not ask extra questions when context is sufficient.
2. Produce 2-3 materially distinct, usable alternatives, with clearly identified trade-offs for mobile ergonomics, legibility, implementation effort and accessibility.
3. Implement comparisons in an isolated preview or documented plan rather than changing the live app behavior by default.
4. Avoid production storage writes and real user data in previews. Use synthetic fixture data and preserve the existing application's styling context.
5. Recommend one default with concise reasoning. Wait for an explicit implementation request before replacing the production interface.
