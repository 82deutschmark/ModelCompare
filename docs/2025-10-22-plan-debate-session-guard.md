<!--
 * Author: gpt-5-codex
 * Date: 2025-10-22 00:01 UTC
 * PURPOSE: Outline the fix for the debate session hydration regression that repopulates cleared state when
 *          the cached session detail query still holds stale data.
 * SRP/DRY check: Pass - Focused troubleshooting note specific to the debate session hydration guard.
 -->
# Debate Session Hydration Guard Plan

## Goal
Prevent stale debate session payloads from rehydrating the UI after the user resets or starts a new session.

## Context
- `client/src/pages/debate.tsx` clears debate state before starting a new session, but the React Query cache still
  exposes the previous session payload.
- The hydration effect currently runs as long as session detail data exists, regardless of whether the data matches
  the active session identifier.
- This causes the cleared state to instantly repopulate with the old transcript, blocking new session bootstrapping.

## Tasks
1. Update the hydration `useEffect` guard in `client/src/pages/debate.tsx` to require a non-null active session ID
   and a matching session identifier before calling `hydrateFromSession`.
2. Retain the existing signature comparison logic so legitimate updates still hydrate when the server turn history
   advances.
3. Refresh the changelog with a new version entry documenting the regression fix.

## Verification
- Reset the debate or start a fresh session: the transcript should remain empty until the new stream begins.
- Reopen a saved session from the history drawer: hydration should occur once the selected session data loads.
- Run targeted TypeScript checks (`npm run check`) when dependencies are available to confirm type safety.
