<!--
Author: Cascade (OpenAI GPT-4.1)
Date: 2025-11-02 04:36 UTC
PURPOSE: Capture intent, scope, and validation plan for the hyperbolic dashboard embellishments.
SRP/DRY check: Pass - plan isolates goals and tasks for this feature addition without duplicating existing docs.
-->

# Plan: Hyperbolic Dashboard Embellishments

## Goal
Add an over-the-top "Primary" descriptor module to the Arc AGI dashboard that amplifies the parody tone with animated, multicolour pseudo-technical claims while reusing existing layout primitives.

## Tasks
1. Audit current dashboard composition to identify the optimal insertion point for the new descriptor module while respecting responsive layout.
2. Implement a dedicated component that encapsulates the new pseudo-scientific status readout using `ArcAgiCard`, layered gradients, and lively animations.
3. Integrate the component into the dashboard page and adjust spacing/stacking so it feels intentional alongside existing metrics.
4. Rename the dashboard page to `ARC.tsx` to match the `/arc-agi` route, updating imports that reference the old filename.
5. Ship an auto-opening dystopian privacy policy modal that reuses shadcn dialog primitives and matches the parody tone.
6. Update documentation (changelog) and prepare git commit.

## Validation
- Local typecheck: `npm run check` (if time permits; skip if unchanged types).
- Manual verification: open `/arc-agi` dashboard, confirm new module renders with animated multicolour effects on each line and does not break existing layout at common breakpoints.
