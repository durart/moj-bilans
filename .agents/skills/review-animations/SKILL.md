---
name: review-animations
description: Use only when the user explicitly asks to review or critique motion, timings, transitions, sound or invokes $review-animations. Do not activate for routine UI changes.
---

# Motion review

1. Inventory every relevant animation and feedback mechanism in the target flow (CSS, JS timers, SVG, WAAPI, audio).
2. Report issues by severity with actual file/selector/function references: correctness, accidental repetition, interruptibility, reduced motion, audio/autoplay, CPU/battery load, and perceived latency.
3. Review behavior during rapid input, route changes, app backgrounding, pause/resume and lost focus.
4. Give concrete repairs and small measurable verification steps. Distinguish observed behavior from code-inferred risks.
5. Do not edit code unless the user explicitly requests fixes.
