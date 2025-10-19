* Author: GPT-5 Codex
* Date: 2025-10-18 00:45 UTC
* PURPOSE: Document validation plan to preserve the modern debate streaming handshake by adding regression
*          coverage, endpoint hardening, and automated verification that the SSE pipeline persists turn data.
* SRP/DRY check: Pass - Captures plan only; verification steps reuse implemented routes/tests elsewhere.

# 2025-10-18 Debate Streaming Validation Plan

## Goals
- Reinforce the `/api/debate/stream/init` → `/api/debate/stream/:taskId/:modelKey/:sessionId` handshake.
- Prevent silent fallbacks to the legacy single POST endpoint by hard failing calls to `/api/debate/stream`.
- Add automated coverage that mocks provider streaming and asserts persisted session data integrity.

## Tasks
1. **Endpoint Hardening**
   - Update `server/routes/debate.routes.ts` to emit an explicit `410 Gone` JSON response from the retired
     `POST /api/debate/stream` route, guiding callers to the handshake flow.
   - Maintain streaming init + SSE handlers with shared helpers and TTL registry cleanup.

2. **Automated Regression Coverage**
   - Write Vitest integration targeting the debate router to spin up an Express app with mocked provider
     streaming and in-memory storage fallback.
   - Verify init route returns session metadata, SSE stream emits init/status/chunk/complete events, and
     session persistence captures turn history and response identifiers.
   - Assert subsequent GET reuse fails (session consumed) and the legacy endpoint returns `410`.

3. **Documentation & Change Log**
   - Summarize validation scope in this plan for future traceability.
   - Reference automated tests in PR summary to demonstrate coverage.

## Acceptance Criteria
- Automated test passes locally without external API calls.
- Legacy endpoint responds with 410 and migration hint.
- SSE test confirms persisted debate session with reasoning/content captured in storage turn history.
