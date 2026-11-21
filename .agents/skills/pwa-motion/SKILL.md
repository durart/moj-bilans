---
name: pwa-motion
description: Use when adding or tuning interface motion, timer feedback, transition timing, sound cues, or microinteractions in this static mobile PWA. Avoid activating for unrelated static layout edits.
---

# Motion and feedback

1. Define the intended feedback: what event triggers it, what it communicates, and when it ends. Not every action needs an animation.
2. Prefer CSS transitions for simple state changes, native Web Animations API for controlled sequences, and existing project code. Avoid animation libraries unless there is a demonstrated need.
3. Animate transform and opacity where possible; avoid expensive layout thrashing, long-running loops or unnecessary re-renders. Motion must work on mid-range phones.
4. Honor `prefers-reduced-motion`. Ensure information and controls remain usable without animation.
5. For sound, use user-initiated playback and account for browser autoplay policies, mute/quiet operation, hidden tabs, repeated callbacks and interrupted sessions. Never emit duplicate notifications.
6. Test rapid repeated actions, pause/resume, background/foreground, screen locking, and navigation. Separate elapsed time calculations from display frame rate.
7. Explain the feedback pattern and timing, and distinguish simulated tests from real device tests.

Do not introduce background network calls or audio assets by default.
