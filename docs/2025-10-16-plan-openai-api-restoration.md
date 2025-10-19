* Author: gpt-5-codex
* Date: 2025-10-16 00:00 UTC
* PURPOSE: Outline investigation steps and remediation tasks to restore OpenAI API traffic after Responses API refactor.
* SRP/DRY check: Pass - single planning document referencing existing implementation guides in docs/ without duplicating logic.

## Goal
Re-establish OpenAI Responses API calls so user requests reach OpenAI again after the refactor regression.

## Current Understanding
- Provider refactor now routes all OpenAI calls through `server/providers/openai.ts`.
- Reports indicate no traffic reaches OpenAI despite valid API keys across environments.
- Recent refactor introduced new message-to-prompt conversion and streaming payload builder; likely mismatch with Responses API contract.

## Investigation Tasks
1. Review `OpenAIProvider` request construction to confirm `input` payload matches Responses API schema (role/content objects with text parts).
2. Verify reasoning configuration only applies to models that actually expose reasoning; avoid sending unsupported parameters that short-circuit the SDK.
3. Inspect streaming path to ensure it reuses the same payload construction and does not bypass fixes from (1).
4. Audit logging/return values for `systemPrompt` to retain observability after payload adjustments.

## Remediation Plan
- Implement a helper that converts `ModelMessage[]` plus optional system prompt into both structured Responses input and human-readable prompt string.
- Update non-streaming and streaming calls to use the helper, including temperature/max token handling.
- Gate reasoning metadata on model capabilities to prevent client-side validation failure.
- Keep retry/timeout behavior unchanged while ensuring partial responses still propagate through callbacks.

## Validation Steps
- Run targeted unit/integration checks locally if available (e.g., `npm run health-check:openai` with stubbed API key) to confirm request dispatch.
- Perform manual smoke test against staging with valid credentials to confirm OpenAI usage logs populate again.
- Monitor logs for reasoning/streaming callbacks to ensure no regression in SSE delivery.
