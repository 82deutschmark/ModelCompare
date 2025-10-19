# 2025-10-17-Debate-Streaming-Observation-Plan

* Author: GPT-5 Codex
* Date: 2025-10-17 and the 19:52 UTC
* PURPOSE: Document the investigation path to reproduce and trace the debate streaming pipeline when launching a GPT-5 mini versus GPT-5 nano session, ensuring we validate the hooks, services, server routes, and provider orchestration that must fire to hit the external APIs.
* SRP/DRY check: Pass - Focused planning document for the current debate streaming observation; confirmed no overlapping 2025-10-17 plan for this goal exists.

## Goal
Confirm the debate streaming flow actually triggers GPT-5 mini and GPT-5 nano provider calls and explain why streaming appears stalled.

## Key Questions
- Which client surface kicks off the stream request and with what payload?
- How does the server debate route resolve providers and enqueue streaming jobs?
- Are GPT-5 mini/nano models filtered out by capability or quota guards?
- What do server diagnostics show when we hit the endpoint locally?

## Investigation Checklist
- [x] Review the client debate initiation flow (`DebateControls`, `debateService`, `useDebateStreaming`).
- [x] Trace the server debate streaming route (`debate.routes.ts`, `routes.ts`) and its SSE lifecycle.
- [x] Inspect model capability lookups for GPT-5 mini/nano in `model.service` and provider registry.
- [x] Exercise the debate streaming endpoint locally with real models and capture server logs.
- [x] Verify the client receives streaming chunks or diagnose failure response handling.
- [x] Summarize findings with recommended remediation steps.

## Deliverables
- Reproduction steps with observed behavior.
- Root cause analysis or prioritized hypotheses with code references.
- Recommended fixes or configuration changes ready for implementation.

## Findings (2025-10-18)

### Previous Session
- Streaming failures traced to OpenAI's Responses API rejecting the `temperature` parameter for GPT-5 family models; removing the field restores GPT-5 mini/nano streaming.
- Defaulting debate setup to GPT-5 Mini vs GPT-5 Nano on Topic 13 keeps the regression fixture one click away for fast streaming validation.

### Current Session (2025-10-17 21:15 UTC)
✅ **Streaming is working correctly!**

#### Test Results
- Created test script (`test-debate-stream.mjs`) that triggers debate between GPT-5 Mini and GPT-5 Nano
- Successfully validated full streaming pipeline:
  1. POST `/api/debate/stream/init` → Returns `sessionId`, `taskId`, `modelKey`
  2. GET `/api/debate/stream/:taskId/:modelKey/:sessionId` → SSE stream with chunks
  3. Reasoning chunks streaming correctly
  4. Content chunks streaming correctly
  5. Stream completes with `responseId`, `tokenUsage`, `cost`

#### Key Code Locations
- **Server Routes**: `server/routes/debate.routes.ts` (lines 459-521)
  - Init endpoint: Line 459
  - SSE endpoint: Line 490
  - Stream handler: Line 270-383 (`streamDebateTurn`)
- **Temperature Filtering**: `server/providers/openai.ts:765`
  - `supportsTemperature()` method correctly filters out temperature for GPT-5 models
  - Applied at lines 528, 653
- **Client Hook**: `client/src/hooks/useAdvancedStreaming.ts:322`
  - `startStream()` implements two-stage handshake (init + SSE)
- **Model IDs**: Must use full IDs from `shared/model-catalog.ts`
  - ✅ `gpt-5-mini-2025-08-07` (not `gpt-5-mini`)
  - ✅ `gpt-5-nano-2025-08-07` (not `gpt-5-nano`)

#### No Issues Found
- Temperature parameter is correctly filtered for GPT-5 models
- Provider resolution working
- SSE streaming working
- OpenAI Responses API calls working
- No server errors logged
