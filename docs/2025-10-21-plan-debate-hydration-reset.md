<!--
 * Author: gpt-5-codex
 * Date: 2025-10-21 02:52 UTC
 * PURPOSE: Document the plan and goals for clearing stale hydration signatures when debate sessions reset or switch.
 * SRP/DRY check: Pass - planning notes for this fix live in a single task-specific file.
-->

# Debate Hydration Signature Reset Plan

## Goal
Restore debate transcript hydration when a user resets a session and reselects the same history entry by ensuring cached hydration signatures are cleared appropriately.

## Context
- `client/src/pages/debate.tsx` introduced `lastHydratedSignatureRef` to prevent redundant hydration.
- Resetting a debate sets `debateSessionId` to `null` before users re-open a historical session, causing the signature check to block rehydration.
- We need to clear the cached signature whenever the tracked session changes or resets to avoid stale guard values.

## Tasks
1. Inspect `debateSession.resetSession()` behavior to confirm when `debateSessionId` transitions to `null` and how selections propagate.
2. Update the debate page effect logic to clear `lastHydratedSignatureRef` when the active session identifier changes, avoiding redundant hydration while still preventing loops.
3. Verify TypeScript linting and interactions compile locally after the change.
4. Update `CHANGELOG.md` with a new entry summarizing the bugfix.
