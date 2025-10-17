* Author: GPT-5 Codex
* Date: 2025-10-17 and the 16:24 UTC
* PURPOSE: Capture the work plan for aligning our streaming modals with the Responses API contract—covering the POST→SSE handshake, SSE harness, OpenAI stream normalization, and client orchestration updates so the implementation matches the shared guide without duplicating logic.
* SRP/DRY check: Pass - Dedicated planning artifact for the streaming alignment effort; verified no other 2025-10-17 plan covers this scope.

# 2025-10-17-Streaming-Modal-Alignment-Plan

## Goal
Ensure debate (and future analysis) streaming modals follow the documented Responses API streaming guidelines end-to-end, including handshake, harness, event normalization, persistence, and client state management.

## Current Gaps
- Client still performs single POST `/api/debate/stream` fetch parsing; no POST→GET handshake or EventSource usage.
- SSE responses omit `stream.status`, metadata, and timestamps; no shared `SSEStreamManager` or harness abstraction.
- `debate.routes.ts` writes directly to the response without verifying URL params against the cached payload.
- Provider streaming already calls `openai.responses.stream` but bypasses a reusable `handleStreamEvent` normalizer; JSON/annotation chunks are ignored.
- Final persistence only stores text + reasoning; token usage, response IDs, and reasoning summaries are not routed through a shared parser for turn storage.
- Feature flag consistency (`STREAMING_ENABLED`) is not checked server/client before advertising streaming.

## Architecture Plan
- **Shared streaming infra**: Introduce `SseStreamManager`, `StreamHarness`, and `StreamSessionRegistry` under `server/streaming/` to manage connections, TTL cleanup, and event enrichment (taskId/modelKey/timestamps).
- **POST→GET handshake**: Maintain `/api/debate/stream/init` for payload validation, return `{sessionId, taskId, expiresAt}`; add SSE GET route `/api/debate/stream/:taskId/:modelKey/:sessionId` that verifies all params against the cached payload before launching the provider run.
- **Responses event normalization**: Add `handleResponsesStreamEvent` utility that maps every `response.*` event into `StreamHarness` chunk/status/error calls. Update `OpenAIProvider.callModelStreaming` to delegate to it and emit structured JSON/annotation chunks alongside text/reasoning.
- **Persistence pass-through**: After `stream.finalResponse()`, reuse existing response parser to assemble final summary, token usage, response id, and structured output; persist via `storage.updateDebateSession` (extended to accept usage + summaries) and broadcast through `stream.complete`.
- **Client orchestration**: Update `useAdvancedStreaming` (and helpers) to call new `createAnalysisStream` style helper: POST init, open EventSource, subscribe to `stream.init/status/chunk/complete/error`, merge reasoning/text/json buffers, and expose lifecycle metadata.
- **Feature gating + telemetry**: Ensure both client and server honor `STREAMING_ENABLED` (with legacy fallback) and surface handshake/stream failure codes for UI badges.

## TODO
1. Audit existing debate stream payload builder to extract reusable `buildDebateStreamRequest` utility for both sync + streaming paths.
2. Implement streaming infra modules (registry, manager, harness, OpenAI event handler) and unit-test them with mocked streams where practical.
3. Refactor `debate.routes.ts` to use the registry + harness for POST `/stream/init` and GET `/stream/:taskId/:modelKey/:sessionId`, keeping legacy POST fallback temporarily behind feature flag.
4. Expand `storage.updateDebateSession` (and shared types) to accept final summaries, token usage, and cost metadata gathered from the harness pipeline.
5. Update client streaming helpers/hooks to use handshake + EventSource, wiring new events into the debate modal state machine.
6. Validate end-to-end with a local GPT-5 run, confirm stream logs show reasoning/text chunks, status updates, and final persistence, then document verification results.
