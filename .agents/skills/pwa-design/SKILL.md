---
name: pwa-design
description: Use for designing, redesigning, auditing, or polishing screens, navigation, charts, forms, and UI components in this Polish-language, mobile-first static PWA. Do not activate for backend-only or data-only tasks.
---

# PWA interface design

1. Inspect the current HTML, CSS and JavaScript before proposing changes. Preserve existing information architecture unless the request calls for a redesign.
2. Identify the concrete user task, device width, existing visual tokens, states (loading, empty, error, completed) and accessibility needs.
3. Keep a cohesive visual system: spacing, type scale, touch targets, hierarchy, contrast, component states and responsive behavior. Prefer refinement over a wholesale aesthetic rewrite.
4. Build usable interactions, not static mockups. Every button, chart control, menu and form must have an actual behavior and an understandable Polish label.
5. Check narrow mobile widths (320-390px), typical mobile, and desktop. Avoid clipped inputs, horizontal overflow, inaccessible modals, fixed overlays obscuring controls, or tiny touch targets.
6. Retain the existing technology stack and relative asset paths for GitHub Pages. Prefer native browser/CSS functionality over new libraries.
7. Present what changed, why it helps, and what was or was not actually tested.

Do not silently modify persistence formats, reset stored data, or introduce analytics/remote font dependencies. For state-sensitive UI work also use pwa-data-safety.
