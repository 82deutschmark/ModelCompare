<!--
Author: gpt-5-codex
Date: 2025-10-18 20:10 UTC
PURPOSE: Capture the plan for infusing the plan assessment hero with colorful accents
         and ensuring default model preselection while keeping SRP/DRY alignment.
SRP/DRY check: Pass - Documentation only, references existing components without duplicating logic.
-->

# Plan: Plan Assessment Polish

## Goals
- Preselect the "Plan Trio" models (gpt-5-mini, gpt-5-nano, Haiku 4.5) so users see critiques immediately.
- Introduce more vibrant gradients, colorful buttons, and energetic pills in the plan hero.
- Preserve existing shared comparison flow while elevating first-run visual delight.

## Tasks
1. Update `plan-assessment.tsx` to seed the default trio once models load.
2. Refresh `PlanAssessmentHero` styling with gradients, colorful badges, and expressive controls.
3. Verify pills, buttons, and prompt preview align with the new accent palette.
4. Run `npm run check` to confirm TypeScript health.

## Risks & Notes
- Ensure model IDs include release suffixes (`-2025-08-07`, `-20251015`).
- Avoid regressing accessibility: maintain contrast and readable font sizes.
- Gradient layers should remain decorative (pointer-events none) to keep interactions smooth.

