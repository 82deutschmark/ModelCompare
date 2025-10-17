* Author: gpt-5-codex
* Date: 2025-10-17 19:40 UTC
* PURPOSE: Outline tasks to restore jury annotation review gating after post-review edits.
* SRP/DRY check: Pass - Planning document centralizes steps without duplicating existing instructions.

# Plan for Jury Annotation Review Gating Fix

## Goal
Ensure jury annotation mutations (tags and notes) reinstate the review requirement so the gating logic blocks progression after any post-review edits.

## Tasks
1. Audit `useDebateSession` mutation handlers to confirm where `needsReview` should be updated when annotations change.
2. Update `toggleJuryTag` and `setJuryNotes` to set `needsReview` back to `true` whenever changes occur.
3. Verify no other handlers need adjustments and run targeted reasoning to ensure gating logic respects updates.
4. Prepare tests or manual validation notes if automated coverage is absent.
5. Document changes via commit and PR message following repository guidelines.

## Considerations
- Maintain SRP by keeping review flag logic encapsulated within annotation mutations.
- Avoid unintended resets when annotations are initialized or cleared.
- Confirm state updates remain immutable and consistent with existing hook patterns.
