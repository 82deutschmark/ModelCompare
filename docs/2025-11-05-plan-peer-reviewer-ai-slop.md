<!--
Author: Cascade (GPT-5)
Date: 2025-11-05 01:03 UTC-05:00
PURPOSE: Outline tasks to add a peer-reviewer assessor persona focused on detecting AI slop within Plan Assessment mode.
SRP/DRY check: Pass - Documentation solely tracks this enhancement plan.
-->

# Plan: Peer Reviewer Assessor for Plan Assessment Mode

**Author:** Cascade (GPT-5)

**Date:** 2025-11-05

**Goal:** Introduce a peer-reviewer assessor option that excels at spotting AI-generated sloppiness while keeping integration aligned with the variable registry, UI, and prompt system.

## Context
- Plan Assessment mode uses `shared/variable-registry.ts` enums to drive persona selections.
- Prompts live in `client/public/docs/plan-assessment-prompts.md` and must describe any new role-specific behaviours.
- UI selection options are defined in `PlanAssessmentHero` and defaults live in `PlanAssessmentPage`.

## Tasks
1. Extend the plan assessment variable registry to include a `peer-reviewer` persona focused on AI slop detection.
2. Update the Plan Assessment UI to expose the new persona in the Assessor Role selector with clear labeling.
3. Enrich the prompt template so that selecting the peer reviewer adds guidance on identifying AI artifacts, hallucinations, and repetitive padding.
4. Verify defaults remain sensible and that preview/rendered prompts incorporate the new persona text.
5. Update changelog with new version entry documenting the peer-reviewer addition.

## Open Questions
- Should the peer reviewer adjust tone defaults toward `direct`? (Initial scope keeps existing defaults.)
- Do we need a server-side enforcement of persona-specific instructions beyond template expansion?
