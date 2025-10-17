* Author: GPT-5 Codex
* Date: 2025-10-17 and the 02:10 UTC
* PURPOSE: Capture the analysis roadmap for diagnosing the debate streaming gap so future fixes align with SRP-driven route and hook responsibilities without duplicating existing streaming utilities.
* SRP/DRY check: Pass - Single documentation file describing one investigation plan; verified no similar plan doc for this timestamp.

# Goal
Understand why the debate client never issues an OpenAI request when starting a streamed turn.

## Investigation Plan
- Confirm the client-side streaming workflow (hooks, services, mutation triggers) to see which endpoints it targets.
- Trace the Express debate routes to compare expected endpoints against the client handshake.
- Verify provider wiring (OpenAI streaming implementation) so we can reason about whether the issue is routing or provider-level.
- Record findings and recommend a fix that keeps the hooks and routes aligned without duplicating logic.

## Notes
- Client `useAdvancedStreaming` now expects a two-phase flow: POST `/api/debate/stream/init` followed by SSE from `/api/debate/stream/:sessionId`.
- Current server registration appears to expose only POST `/api/debate/stream`, hinting at a contract mismatch.

## Implementation Decision (2025-10-17)
- Align the backend with the two-phase client contract while keeping the original POST `/api/debate/stream` endpoint for scripted compatibility.
- Add an in-memory streaming job registry that stores the validated payload collected during `/stream/init` so the GET handler can launch the provider call without duplicating validation code.
- Reuse shared streaming logic across both entry points to avoid divergence and keep SRP intact for the route module.
