* Author: GPT-5 Codex
* Date: 2025-10-19 00:32 UTC
* PURPOSE: Document the concise plan, tasks, and verification steps for extending debate stream prompt variables, syncing documentation, and updating regression coverage.
* SRP/DRY check: Pass - Planning note dedicated to debate prompt variable enhancement; no redundant instructions.

## Goal
Ensure debate stream prompts propagate the debating role to providers and add regression coverage verifying the handshake forwards the role metadata.

## Tasks
- Inspect `server/routes/debate.routes.ts` to understand how prompt variables are assembled prior to invoking provider streaming APIs.
- Update the prompt variable map so the debated role propagates alongside other debate metadata.
- Extend `tests/server/debate-handshake.test.ts` to assert the mocked provider receives the new role variable.
- Sync `client/public/docs/debate-prompts.md` with the prompt variable contract (role, topic, position, intensity).
- Update `CHANGELOG.md` with the debate variable propagation summary for release tracking.
- Execute the targeted Vitest suite to confirm streaming handshake behavior remains intact.

## Validation
- Run `npm run test -- debate-handshake` to execute the focused Vitest scenario.
- Review git diff to confirm only intended files changed.
