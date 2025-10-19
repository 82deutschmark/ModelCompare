<!--
 * Author: gpt-5-codex
 * Date: 2025-10-16 20:35 UTC
 * PURPOSE: Document the step-by-step remediation plan for fixing the OpenAI Responses API
 *          integration bugs, covering reasoning parameter defaults, streaming adoption,
 *          output extraction, and changelog updates across server providers and routes.
 * SRP/DRY check: Pass - Focused solely on capturing today's plan without duplicating
 *                code-level logic stored elsewhere in the repository.
-->
# Plan: Responses API Streaming Remediation

## Goals
- Restore compliant usage of the OpenAI Responses API for GPT-5 and o-series reasoning models.
- Capture real-time reasoning streams with the required verbosity settings.
- Ensure non-streaming calls correctly handle all response output shapes.
- Align debate streaming routes and shared types with the updated configuration surface.
- Record the release in the changelog with an appropriate semantic version bump.

## Tasks
1. **Type Updates**
   - Extend `CallOptions` and `StreamingCallOptions` reasoning config to carry verbosity controls.
   - Confirm shared provider contracts remain SRP compliant after the extension.
2. **Provider Fixes**
   - Update `callModel` to default reasoning summary to `detailed` for GPT-5/o-models and inject `text.verbosity`.
   - Migrate `callModelStreaming` to `openai.responses.stream`, handle all SSE event variants, and use `finalResponse()` for completion metadata.
   - Extract output parsing into a reusable helper that accounts for `output_text`, `output_parsed`, and `output[]` blocks.
3. **Route Adjustments**
   - Default debate streaming API payloads to `reasoningSummary = 'detailed'` and `reasoningVerbosity = 'high'`.
   - Forward optional verbosity overrides through to the provider call.
4. **Changelog**
   - Add a new semantic version entry at the top of `CHANGELOG.md` summarizing the fixes.
5. **Verification**
   - Run targeted TypeScript checks or relevant tests to ensure type safety.
   - Review diffs for compliance with AGENTS instructions before committing.

## Open Questions
- Confirm whether any other routes (e.g., analysis streaming) need matching verbosity defaults.
- Validate if o3/o4 models require alternative reasoning payloads beyond summary defaults.

## Next Steps
- Implement type and provider changes.
- Update routes and changelog.
- Execute verification commands and prepare PR summary.
