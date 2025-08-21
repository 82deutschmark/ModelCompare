---
description: Migrate all OpenAI usage to the Responses API with reasoning support
---

# OpenAI Responses API Migration Plan

This plan migrates all OpenAI calls to the Responses API and deprecates Chat Completions usage across the backend. It ensures reasoning summaries are surfaced, output tokens are not starved by hidden reasoning, and response IDs are persisted for chaining and diagnostics.

## Scope and Impact

- Provider module: `server/providers/openai.ts` (`OpenAIProvider.callModel()`)
- Unified API: `server/routes.ts` endpoints (`/api/compare`, `/api/models/respond`, `/api/generate` streaming and non-streaming)
- Storage: `server/storage.ts` persistence for response IDs and optional raw JSON logs
- Types (if needed): `shared/api-types.ts`, `shared/schema.ts`

## Goals

- Use only `openai.responses.create()` (or streaming variant) — no `chat.completions` fallback.
- Correct parameter names for Responses API: `reasoning.summary`, `max_output_tokens`, optional `previous_response_id`.
- Parse `response.output_text`, `response.output` blocks, and `response.output_reasoning.*`.
- Increase visible-output cap (e.g., `max_output_tokens`) so final answers aren’t starved by internal reasoning.
- Persist `response.id` and optionally the raw response JSON for diagnostics; support session chaining via `previous_response_id`.
- Keep simple retries/backoff and a request timeout. On timeout, persist partials if present.

## Design Changes

1) Endpoint and Request Shape
- Replace all `openai.chat.completions.create` calls with `openai.responses.create`.
- Base request:
  - `model`: selected model ID
  - `input`: the resolved user prompt string (keep simple text; no tools/calls in this phase)
  - `reasoning`: `{ summary: "auto" }` (configurable via options)
  - `max_output_tokens`: default 16384 for most models; GPT‑5 series set to 128000 (both configurable; see Token Budgeting)
  - `metadata` (optional): include app trace IDs for debugging
  - `previous_response_id` (optional): when continuing a session chain
- Timeouts: default 10 minutes (600,000 ms) per request; configurable via env `OPENAI_TIMEOUT_MS`; request-level abort controller. Shorter per-call overrides allowed for quick operations.
- Retries: exponential backoff on 429/5xx (2–3 attempts)

2) Model/Endpoint Compatibility
- Treat all OpenAI entries in `server/providers/openai.ts` as Responses-capable.
- For older non-reasoning models: still use Responses (it is backwards-compatible). Set `reasoning.summary: "off"` if needed, but default to `"auto"` consistently to simplify.

3) Parsing and Mapping
- Prefer fields in this order:
  - `response.output_text` → `ModelResponse.content`
  - Fallback: scan `response.output[]` blocks for the first text content or tool output
  - `response.output_reasoning.summary` → `ModelResponse.reasoning`
  - Optionally map `response.output_reasoning.items[]` → `reasoningHistory` (future-friendly; keep internal for now)
- Persist `response.id` to storage alongside the message for potential chaining.
- If `output_text` is empty but there are content blocks, synthesize final text from the blocks.

4) Token Budgeting
- Default `max_output_tokens`: 16384 for most models to reduce starvation.
- GPT‑5 series (`gpt-5-2025-08-07`, `gpt-5-mini-2025-08-07`, `gpt-5-nano-2025-08-07`): set `max_output_tokens` to 128000.
- Allow override from request options and/or env. Ensure visible output is not starved by hidden/internal reasoning.

5) Streaming vs Non-Streaming
- Non-streaming: use `openai.responses.create` and return the final `output_text` and `output_reasoning.summary`.
- Streaming: use streaming variant and forward:
  - Reasoning summary deltas as they arrive (when present)
  - Final output block (`output_text`) at end
- If true streaming is complex to integrate now, keep current SSE shape but implement a polling fallback that fetches the Responses object until `status=completed`.

6) Persistence and Diagnostics
- Extend storage to optionally keep the raw JSON response for one or more calls per run (toggle via env `DEBUG_SAVE_RAW=1`).
- Persist `response.id` with each saved message/comparison entry.
- On timeout, if a partial `id` exists, persist it as well for follow-up polling.

7) Error Handling
- Backoff on 429/5xx.
- Treat empty `output_text` with non-empty `output[]` as a valid reply (use fallback parsing).
- Include `response.id` (if known) in error logs.

## File-by-File Implementation Plan

- `server/providers/openai.ts`
  - Remove Chat Completions fallback entirely.
  - Implement a single `responses.create()` code path.
  - Add request options: `reasoning.summary`, `max_output_tokens`, optional `previous_response_id`.
  - Parse `output_text`, `output`, `output_reasoning.summary`.
  - Return `responseId` and optionally `raw` when diagnostic logging is enabled.

- `server/routes.ts`
  - `/api/compare` and `/api/models/respond`: no shape change; benefit from richer fields returned by provider.
  - `/api/generate` (SSE): forward reasoning deltas when streaming; otherwise include final `reasoning` and `content`.
  - Add a debug route guarded by env (optional): `/api/debug/openai-responses` to run the quick repro test.

- `server/storage.ts`
  - Extend stored response objects to include `responseId`.
  - Add optional `raw` field behind env flag to persist limited-size raw JSON for diagnosis.

- `shared/api-types.ts` (if needed)
  - Add `responseId?: string` to message/response shapes.
  - Optionally `reasoningHistory?: any[]` for future use.

## Testing Plan

- Quick repro test (optional debug route): call with `reasoning: { summary: "auto" }`, `max_output_tokens: 512`, verify presence of `output_reasoning.summary` and `output_text`.
- Unit test provider parser with samples:
  - Case A: `output_text` present
  - Case B: `output_text` empty, `output[]` text blocks present
  - Case C: reasoning present vs absent
  - Case D: 429 retry
- Manual test via `/api/generate` with `options.stream=true` to see reasoning deltas.

## Acceptance Checklist

- [ ] Confirm all OpenAI calls use `/v1/responses` (no Chat Completions).
- [ ] Params use Responses names: `reasoning.summary`, `max_output_tokens`, `previous_response_id` when chaining.
- [ ] Parser reads `output_text`, `output[]`, and `output_reasoning.summary`.
- [ ] Visible-output cap increased; not starved by reasoning.
- [ ] GPT‑5 series requests use `max_output_tokens = 128000`.
- [ ] `response.id` persisted; chaining supported.
- [ ] Optional raw JSON logged for one failing run; keys inspected (`id`, `output_reasoning`, `output_text`, `output`, `items`).
- [ ] Fallback parsing works when `output_text` is empty.
- [ ] Retries/backoff and an extended timeout (up to 10 minutes, configurable) in place; partials persisted on timeout.
- [ ] Quick repro test verified.

## Config and Env

- Requires `OPENAI_API_KEY` in `.env`.
- Optional:
  - `DEBUG_SAVE_RAW=1` to persist one raw JSON per run for diagnosis
  - `OPENAI_MAX_OUTPUT_TOKENS` default override (e.g., `16384` or `128000` for GPT‑5)
  - `OPENAI_TIMEOUT_MS` request timeout override (default `600000` for 10 minutes)

## Rollback Plan

- If issues arise, re-enable Chat Completions behind a feature flag `USE_CHAT_COMPLETIONS=false` (default false). This plan intends to keep it off by default; the flag is a temporary safety valve during rollout.

## Timeline

- 1/2 day: refactor provider + parser; compile-time tests
- 1/2 day: streaming/polling, diagnostics, and manual tests
- Total: ~1 day, then remove the rollback flag once stable
