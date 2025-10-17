<!--
 * Author: GPT-5 Codex
 * Date: 2025-10-17 23:26 UTC
 * PURPOSE: Document the action plan to verify the debate streaming endpoint uses the
 *          new init+SSE workflow, preserve recent backend work, and align docs.
 * SRP/DRY check: Pass - Plan file tracks tasks for this fix only; no redundant plan exists.
-->
# Debate Endpoint Verification & Documentation Plan

## Goals
- Confirm the `/api/debate` routes are serving the new init + SSE handshake.
- Ensure no code paths fall back to the removed legacy POST `/api/debate/stream` endpoint.
- Align repository documentation (README, changelog, reference docs) with the current implementation so contributors do not default to legacy flows.

## Tasks
1. Inspect `server/routes/debate.routes.ts` and related streaming helpers to verify only the handshake endpoints exist and operate as expected.
2. Search the codebase for any lingering calls to the legacy `POST /api/debate/stream` endpoint; refactor or remove stale references if found.
3. Update README and other docs (e.g., `CHANGELOG.md`, route docs) to describe the init + SSE flow explicitly and remove language suggesting the legacy route remains.
4. Run targeted lint or type checks if necessary to ensure documentation changes do not introduce build issues (docs-only so no build expected).

## Validation
- `git status` shows only intentional doc/code updates.
- Documentation clearly states that the legacy single-call endpoint is removed and points to the new flow.
