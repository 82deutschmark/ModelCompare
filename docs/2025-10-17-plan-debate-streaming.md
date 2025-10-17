<!--
 * Author: gpt-5-codex
 * Date: 2025-10-17 15:26 UTC
 * PURPOSE: Documents the plan and verification steps for updating the debate
 *          streaming hook to consume the unified /api/debate/stream endpoint
 *          and confirm frontend behavior.
 * SRP/DRY check: Pass - File solely tracks planning details for the
 *                debate streaming refactor.
-->
# Debate streaming refactor plan

## Goal
Align the client debate streaming hook with the consolidated `/api/debate/stream` endpoint while preserving existing UX expectations for progress and cancellation.

## Task List
1. Audit current `useAdvancedStreaming` hook to catalog EventSource usage and progress logic.
2. Implement fetch-based SSE parsing using `ReadableStreamDefaultReader`, mapping `stream.chunk`, `stream.complete`, and `stream.error` events to state updates.
3. Ensure cancellation routines (cancel/pause/resume) leverage the same `AbortController` and release streaming resources.
4. Validate integration from `client/src/pages/debate.tsx` to confirm streamed reasoning/content render without initialization errors.

## Verification Notes
- Manual testing: initiate a debate turn via `/debate` UI, confirming reasoning and text append progressively and no "Failed to initialize stream" toast appears.
- Regression awareness: monitor estimated cost/progress updates and cancellation behavior to ensure parity with prior implementation.

## 2025-10-17 22:31 UTC Update
- [x] Investigated `ROBERTS_RULES_PHASES` runtime reference errors triggered in `client/src/pages/debate.tsx`.
- [x] Confirmed constant export already exists in `useDebateSession` and should be imported where used.
- [ ] Validate debate UI after adjusting imports to ensure structured phase metadata renders and streaming resumes.
