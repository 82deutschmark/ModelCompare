<!--
 * Author: gpt-5-codex
 * Date: 2025-10-22 00:45 UTC
 * PURPOSE: Capture the alignment plan for restoring debate mode behavior to match the working main branch implementation.
 * SRP/DRY check: Pass - Dedicated plan for this regression investigation with no duplicated content elsewhere.
 -->
# Debate Page Main Branch Alignment Plan

## Goal
Bring the `work` branch debate experience back in line with the verified working behavior on `main` so sessions start, hydrate,
and stream correctly without the regressions introduced by recent guard tweaks.

## Tasks
1. Diff `client/src/pages/debate.tsx` against commit `e841c8c` (main) and restore the working hydration flow while ensuring
   session resets do not block new debates.
2. Revert supporting hook changes in `client/src/hooks/useDebateSession.ts` to the stable main branch snapshot, removing the
   over-aggressive guard logic that stalled hydration.
3. Confirm auxiliary helpers such as `useDebatePrompts` still match main and adjust if needed to avoid divergence.
4. Update `CHANGELOG.md` with a new entry documenting the reversion to the main branch implementation and the restored debate
   functionality.

## Verification
- Launching a fresh debate produces streaming turns without resurrecting prior transcripts.
- Selecting a saved debate session from history hydrates exactly as it did on `main`.
- `npm run check` (TypeScript) is monitored even though type stubs are unavailable locally; note missing typings in the report.
