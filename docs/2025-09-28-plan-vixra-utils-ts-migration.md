<!--
Author: Codex using GPT-5
Date: 2025-09-28T11:29:14-04:00
PURPOSE: Working checklist and plan for restoring vixra utilities as TypeScript while keeping architecture aligned with existing flows.
SRP/DRY check: Pass - Documentation file focused on single planning responsibility.
shadcn/ui: Pass - No UI components involved; reference only.
-->

# Vixra Utils TS Migration Plan

**Date:** 2025-09-28T11:29:14-04:00

## Goal
- Restore the Vixra utility module as a clean TypeScript implementation that the UI can depend on without corrupt sections.

## To-Do
- [ ] Capture all required helpers (variable generation, substitution, template parsing, export helpers) from the corrupted markdown version.
- [ ] Rebuild the utilities as client/src/lib/vixraUtils.ts with proper typing, SRP, and DRY conformance.
- [ ] Ensure the new module integrates with existing query client helpers and respects shadcn/ui usage constraints.
- [ ] Remove the corrupted markdown artifact once the TypeScript version is in place.
- [ ] Review downstream imports and run lightweight validations if available.

## Notes
- Keep variable generation asynchronous and reuse /api/models/respond via piRequest for consistency with other flows.
- Maintain satirical flavor while prioritizing deterministic, testable logic for exports and formatting helpers.
- Watch for duplicate logic already present in ixraWorkflow.ts; prefer reuse or alignment where sensible.
