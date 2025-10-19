* Author: GPT-5 Codex
* Date: 2025-10-17 22:56 UTC
* PURPOSE: Document the removal of legacy debate streaming flows and outline tasks to align client, server, and docs with the unified init/SSE pipeline.
* SRP/DRY check: Pass - Planning note focused solely on this cleanup effort without duplicating implementation docs.

# Debate streaming cleanup plan (2025-10-17)

## Goal
Retire all legacy debate streaming endpoints/hooks and ensure the modern streaming flow triggers reliably when users start a debate.

## Task list
1. Delete `client/src/hooks/useDebateStream.ts` and migrate any remaining callers to `useDebateStreaming`.
2. Refactor `client/src/pages/debate.tsx` start flow to invoke streaming with fresh dependencies (avoid stale closure on `debateService`).
3. Remove legacy `POST /api/debate/stream` endpoint from `server/routes/debate.routes.ts` and update documentation (`server/routes.md`, `CHANGELOG.md`).
4. Update any docs referencing the removed hook to point to the new `useDebateStreaming` contract.
5. Smoke test by verifying lint/build or targeted unit tests if available (manual for now).

## Notes
- Ensure all modified files include the repository-required header block.
- Prefer incremental commits with descriptive messages summarizing scope.
