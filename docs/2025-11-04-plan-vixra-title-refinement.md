<!--
Author: Cascade using GPT-4.1
Date: 2025-11-04 20:19 UTC-05:00
PURPOSE: Document action plan for refining Vixra paper title handling in exports.
SRP/DRY check: Pass - Dedicated planning note for single goal.
-->

# Vixra Title Refinement Plan - November 4, 2025

**Author:** Cascade using GPT-4.1
**Date:** 2025-11-04
**Goal:** Remove placeholder Vixra paper titles by deriving names from generated content while keeping exports clean.

## Objectives
1. Eliminate hardcoded fallback titles from export flows so empty titles remain blank.
2. Improve title extraction from the Abstract response with more robust parsing heuristics.
3. Derive export titles from generated section content (prefer Abstract headings, otherwise fall back to first meaningful heading).

## Tasks
- [ ] Audit `vixraUtils.ts` and `vixra.tsx` title handling to identify dependencies on the fallback text.
- [ ] Implement shared helper utilities for extracting candidate titles from section content and deriving a final paper title.
- [ ] Update export pipelines (PDF/print, download, clipboard) to rely on derived titles and suppress placeholder text.
- [ ] Enhance Abstract completion logic to auto-populate the UI title field using the new helper when the user has not set a title.
- [ ] Validate UI behaviour manually (regenerate Abstract, export markdown/PDF) to ensure no placeholder text remains.

## Open Questions
- Should we surface a gentle prompt if no title can be derived, encouraging the user to enter one manually?
- Do we need to update any server-side export or audit logs to reflect the new title derivation logic?
