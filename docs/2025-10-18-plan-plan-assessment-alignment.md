<!--
Author: gpt-5-codex
Date: 2025-10-18T18:40:00Z
PURPOSE: Document plan to realign plan assessment page UI with compare page layout, ensuring consistent model selection and results presentation while reusing shared components.
SRP/DRY check: Pass - Planning document focused solely on outlining upcoming work.
-->

# Plan Assessment Page Alignment Plan

**Date:** 2025-10-18T18:40:00Z

## Goal
- Rework `client/src/pages/plan-assessment.tsx` to mirror the modern compare experience with hero prompt area styling and shared comparison components.

## To-Do
- [ ] Audit existing compare flow (`EnhancedPromptArea`, `ComparisonResults`, `useComparison`) for reusable pieces that can support plan assessment inputs.
- [ ] Create a dedicated hero form component that captures plan fields (project type, constraints, plan markdown, optional context) while embedding floating model picker and action controls consistent with compare page.
- [ ] Update `plan-assessment.tsx` to leverage `useComparison`, new hero form, and shared `ComparisonResults` for responses/export handling.
- [ ] Ensure visual alignment with compare page spacing, background, and typography; remove legacy sidebar grid layout.
- [ ] Verify prompt composition remains accurate and responses trigger correctly for selected models.

## Notes
- Preserve plan-specific template lines but surface preview/character counts similar to compare experience for user confidence.
- When wiring actions, reuse toast handling inside `useComparison` to avoid duplicate mutation logic in the page.
- Maintain export support via `ComparisonResults` while passing the constructed prompt string.
