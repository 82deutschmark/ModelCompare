<!--
 * Author: gpt-5-codex
 * Date: 2025-10-16 18:40 UTC
 * PURPOSE: Document today's objectives and ordered tasks for aligning the OpenAI provider with the Responses API specification.
 * SRP/DRY check: Pass - planning document consolidates scope without duplicating existing docs.
-->

# Plan: OpenAI Responses API Corrections

## Goal
Bring `OpenAIProvider` into parity with the October 2025 Responses API expectations and update shared types so conversation metadata and steering options are supported consistently.

## Context
The current provider still converts messages into a flattened prompt, relies on invalid streaming events, and lacks support for new parameters like `instructions` and `previous_response_id`. Fixing these requires coordinated changes in both the base provider types and the OpenAI provider implementation.

## Tasks
1. **Update shared provider interfaces**
   - Add `developer` role support to `ModelMessage`.
   - Extend `CallOptions` with `instructions`, `previousResponseId`, and optional reasoning configuration for parity with streaming options.
   - Refresh header comment to repository standard.
2. **Refactor OpenAI provider request builders**
   - Replace prompt concatenation with direct message arrays and map custom roles.
   - Support optional `instructions`, `temperature`, and conversation chaining for both streaming and non-streaming calls.
   - Simplify reasoning defaults to `auto` summary and remove undocumented verbosity control.
3. **Correct streaming event handling**
   - Switch to the documented `response.output_text.delta` and `response.done` events.
   - Accumulate reasoning from the final response payload.
   - Ensure cost calculation uses provided usage stats.
4. **Tighten response parsing**
   - Trust `response.output_text` for text output while still exposing IDs and usage for downstream consumers.
   - Maintain compatibility with existing cost/reporting fields.
5. **Validation**
   - Run `npm run check` to confirm updated types compile across the project.

## Risks & Mitigations
- **SDK typings drift**: Use defensive optional chaining when reading new properties to avoid runtime crashes.
- **Downstream expectations**: Preserve `systemPrompt` output by deriving a readable trace from normalized messages.
- **Streaming interface changes**: Keep callbacks intact and surface errors promptly through `onError`.

## Success Criteria
- Requests send structured message arrays with accurate roles.
- Streaming callbacks receive text via `response.output_text.delta` events.
- Non-streaming responses expose reasoning summaries when present.
- TypeScript compilation succeeds without consumers needing updates.
