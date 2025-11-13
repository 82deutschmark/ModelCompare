/*
 * Author: gpt-5-codex
 * Date: 2025-10-22 19:40 UTC
 * PURPOSE: Plan and goal to default Debate mode to always use the latest OpenAI Prompt Template version.
 *          Captures rationale, SRP/DRY notes, and verification steps.
 * SRP/DRY check: Pass - This doc scopes to the single change and related validation.
 */

# Goal
- Ensure debate streaming always uses the latest published OpenAI Prompt Template without manual version updates.

# Rationale
- Avoids drift when the stored prompt evolves.
- Minimizes operational overhead and reduces 400s from stale variable contracts.

# Plan
1. Update debate prompt reference to request latest
2. Make provider omit explicit version when latest
3. Verify end-to-end stream payload shape
4. Update changelog and communicate behavior

# Decisions
- Use `version: "latest"` in debate route, with provider mapping that omits the version field, allowing OpenAI to resolve to newest published version.
- Do not change PromptReference typing to keep shared contract stable; instead, interpret the sentinel value in the provider.

# Integration Notes
- `server/routes/debate.routes.ts`: Default prompt reference now sets `version` to `latest`.
- `server/providers/openai.ts`: `buildPromptPayload` now omits `version` when set to `latest` (or falsy) to defer to OpenAI.

# Validation Checklist
- Start a debate turn and inspect server logs for the Responses request payload; ensure `prompt` includes `id` and excludes `version`.
- Confirm OpenAI returns a valid response and debate session persists `responseId`.
- Confirm no prompt-variable mismatch occurs after prompt template updates.

# Rollback
- Set a fixed `version` (e.g., "6") in `STORED_DEBATE_PROMPT` if you need to pin behavior for an incident.

# Follow-ups (Optional)
- Add a config flag to pin a specific prompt version via env var for hotfixes.
- Add structured debug logging for `prompt.id` and whether `version` was sent.

