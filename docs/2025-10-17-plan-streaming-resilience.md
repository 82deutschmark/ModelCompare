<!--
 * Author: GPT-5 Codex
 * Date: 2025-10-17 and the 18:14 UTC
 * PURPOSE: Working plan to execute the streaming resilience fixes requested on 2025-10-17, clarifying scope,
 *          stakeholders, and dependencies across client hooks and debate SSE endpoints while cataloging open
 *          questions for the Responses API integration.
 * SRP/DRY check: Pass - Dedicated planning artifact for today's streaming work; verified no duplicate plan
 *                for this goal exists in docs/.
-->

# 2025-10-17-Streaming-Resilience-Plan

## Goal
Restore reliable debate streaming by aligning the React streaming hook with OpenAI's Responses API guidance (chunk accumulation via refs, stable SSE parsing) and tightening the server-side stream lifecycle so clients no longer lose chunks or emit DOM errors.

## Context Recap
- `client/src/hooks/useAdvancedStreaming.ts` reads `/api/debate/stream` with `ReadableStream` but concatenates chunks directly into state on every event, creating rerender pressure and risking stale closures.
- Backend endpoint `server/routes/debate.routes.ts` already sets `stream: true` and `store: true` against OpenAI Responses API but lacks keepalive heartbeats and relies on client concatenation for final buffers.
- Production users report intermittent chunk loss and React errors during active debates despite successful server traces.

## Assumptions
- Debate flows remain sequential; only one stream is active per browser tab.
- OpenAI Responses API credentials remain valid and return SSE events using the documented schema (reasoning/content chunks plus completion metadata).
- We must maintain compatibility with existing debate UI components (`StreamingDisplay`, `DebateMessageList`) that expect `reasoning`, `content`, `progress`, `responseId`.

## Risks / Unknowns
- Need to confirm whether other modes reuse `useAdvancedStreaming`; regression testing must cover shared consumers.
- Keepalive cadence must balance proxy requirements without spamming the client.
- Must ensure ref-based buffering flushes state synchronously on completion to avoid perceived truncation.

## TODO Checklist
1. ✅ (You are here) Capture high-level plan and constraints.
2. Audit `useAdvancedStreaming` consumer list to understand shared state expectations.
3. Refactor hook to:
   - Buffer reasoning/content in `useRef` collectors.
   - Schedule batched state updates via `requestAnimationFrame` or trailing timers.
   - Guard against stale closures and handle cancellation cleanup.
4. Enhance SSE handler in `debate.routes.ts` with optional heartbeats and stricter JSON framing (validate before emitting).
5. Update docs/changelog to record streaming resilience changes once implementation lands.

## Validation Strategy
- Manual debate run (GPT-5 Mini vs GPT-5 Nano) ensuring continuous stream with no truncation.
- Inspect React DevTools to confirm rerender count drops relative to chunk count.
- Simulate mid-stream cancellation to verify cleanup and absence of memory leaks.

## Open Questions
- Should we generalize the ref-based buffering into a shared utility for other streaming modes?
- Do we need configurable throttle intervals for different network conditions?
- Would adding server-side retry-on-transient failures provide additional robustness?

