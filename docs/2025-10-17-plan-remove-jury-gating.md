* Author: GPT-5 Codex
* Date: 2025-10-17 and the 20:05 UTC
* PURPOSE: Outline the approach to disable mandatory jury review gating in the debate flow, covering affected client components, server interactions, and documentation updates to restore a smoother streaming experience.
* SRP/DRY check: Pass - Planning artifact focused on the jury gating rollback with cross-references to dependent UI surfaces and changelog tasks.

# 2025-10-17-Plan-Remove-Jury-Gating

## Goal
Allow debate continuations and phase controls to operate without blocking on jury review tasks while keeping gentle affordances for optional annotations.

## Current Understanding
- The `continueDebate` handler hard-stops when unresolved jury annotations exist, surfacing a destructive toast.
- `DebateControls` disables phase advancement and shows blocking messaging whenever `hasJuryPending` is true.
- Streaming handshake and server routes already succeed once the client permits the request.

## Tasks
1. Audit `client/src/pages/debate.tsx` for hard stops in `continueDebate` and adjust messaging/flow to permit streaming even with pending jury items.
2. Update `client/src/components/debate/DebateControls.tsx` to remove disabling logic tied to `hasJuryPending` while retaining non-blocking cues.
3. Refresh `CHANGELOG.md` with a 0.4.x entry documenting the rollback of mandatory jury gating for debate continuations.

## Validation
- Manually verify the Continue button triggers streaming despite unresolved jury annotations.
- Confirm phase advancement remains available and shows only informational copy when jury items are outstanding.
- Ensure documentation reflects the change and no typescript errors emerge during build (spot-check via `npm run check` if needed).
