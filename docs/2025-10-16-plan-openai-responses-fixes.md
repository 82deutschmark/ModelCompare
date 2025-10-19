<!--
 * Author: gpt-5-codex
 * Date: 2025-10-16 18:34 UTC
 * PURPOSE: Outline the implementation plan to correct OpenAI Responses API usage, covering message formatting, streaming events, reasoning config, and documentation updates to align with official references.
 * SRP/DRY check: Pass - Plan file only aggregates tasks related to the Responses API fixes without duplicating existing documentation.
-->
# Plan: OpenAI Responses API Critical Fixes

## Goal
Restore compliance with the OpenAI Responses API so that both streaming and non-streaming flows operate per October 2025 reference implementations, eliminating incorrect event handling and message formatting.

## Tasks
1. **Update type definitions**
   - Extend `ModelMessage` to support the `developer` role.
   - Add `instructions`, `previousResponseId`, and reasoning config fields to `CallOptions` / streaming options.
2. **Refactor OpenAI provider non-streaming flow**
   - Map `ModelMessage[]` directly to Responses API message objects.
   - Include new request parameters (`instructions`, `previous_response_id`, `store`).
   - Simplify response parsing to rely on `output_text` and `output_reasoning`.
3. **Refactor streaming flow**
   - Replace deprecated event names with `response.output_text.delta` and `response.done`.
   - Capture reasoning summary from `response.done` events.
   - Compute usage/cost from final response metadata.
4. **Cleanup reasoning configuration**
   - Remove `text.verbosity` usage and default to `{ summary: 'auto' }` when applicable.
   - Only attach `reasoning` settings for models that support it.
5. **Validation**
   - Run targeted TypeScript type check if feasible.
   - Verify updated logic compiles and integrates with existing provider architecture.

## Risks & Mitigations
- **SDK surface changes**: If the OpenAI SDK types differ, cast payloads to `any` where needed with clear comments.
- **Downstream dependencies**: Adjust return payloads carefully to avoid breaking consumers expecting `systemPrompt` or `responseId` fields.

## Expected Outcome
A corrected OpenAI provider that matches official Responses API behavior, supporting conversation chaining, reasoning summaries, and accurate streaming events without legacy artifacts.
