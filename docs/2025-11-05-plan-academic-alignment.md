<!--
Author: Cascade (GPT-5)
Date: 2025-11-05 14:00 UTC-05:00
PURPOSE: Capture plan for aligning Plan Assessment mode with academic paper needs alongside software plan workflows.
SRP/DRY check: Pass - Focused planning artifact for academic alignment enhancement without duplicating existing documentation.
-->

# Plan: Academic Alignment for Plan Assessment Mode

**Author:** Cascade (GPT-5)

**Date:** 2025-11-05

**Goal:** Make Plan Assessment equally effective for academic manuscripts by tailoring variables, prompts, and UI to academic contexts while preserving software planning support.

## Context
- Current variables assume software project scale (`hobby`, `startup`, etc.) and engineering-centric criteria (`architecture`, `operations`).
- Documentation already states the mode supports manuscripts, but UX and prompt copy do not surface academically relevant language.
- Need to avoid breaking existing software flows while adding academic-first terminology and scoring dimensions.

## Tasks
1. **Introduce Domain Selector**
   - Add `assessmentDomain` enum (`software-plan`, `academic-paper`).
   - Default to `software-plan` for backwards compatibility.
2. **Domain-Specific Criteria & Scale**
   - Expand `assessmentCriteria` enum to include academic categories (e.g., `structure`, `methodology`, `evidence`, `novelty`, `clarity`, `publication-readiness`).
   - Broaden `projectScale` into `contextLevel` covering software scales and academic venues (`undergraduate`, `graduate`, `conference`, `journal`).
   - Update UI to show domain-appropriate labels/tooltips while persisting same variable keys.
3. **Prompt Enhancements**
   - Branch system instructions based on domain, replacing irrelevant copy (e.g., project scale guidance) with publishing guidance when academic.
   - Ensure peer reviewer instructions remain applicable.
4. **UI Adjustments**
   - Add toggle in `PlanAssessmentHero` for domain selection.
   - Dynamically swap select options, labels, and placeholders per domain.
   - Update prompt preview to reflect contextual field names.
5. **Validation & Docs**
   - Verify markdown template substitution for new enums.
   - Update changelog and create user-facing documentation note if needed.

## Risks & Mitigations
- **Long enum values**: ensure values remain descriptive but concise; reuse translation maps for UI labels.
- **Backward compatibility**: keep default values stable and handle existing saved states by coercing unknown domain to `software-plan`.

## Open Questions
- Should academic scoring separate qualitative vs quantitative scores? (Out of scope—stick with shared scale for now.)
- Do we need additional optional fields like citation style? (Defer unless user requests.)
