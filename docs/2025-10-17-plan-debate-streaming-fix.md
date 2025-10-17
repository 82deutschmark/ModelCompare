# 2025-10-17-Debate-Streaming-Fix-Plan

* Author: GPT-5 Codex
* Date: 2025-10-17 and the 16:21 UTC
* PURPOSE: Lay out the actionable steps to diagnose and repair the debate streaming crash, referencing existing streaming hooks, server routes, and provider implementations so the investigation stays aligned with established modules.
* SRP/DRY check: Pass - Dedicated planning document for this fix; verified no other 2025-10-17 debate streaming fix plan exists.

# Goal
Restore stable streaming on the debate page without regressing shared streaming flows or duplicating validation logic.

## Current Understanding
- Debate streaming briefly mounts UI before crashing, with console errors pointing to an invalid `MutationObserver.observe` target emitted from `web-client-content-script`.
- `useDebateStreaming` recently began delegating to `useAdvancedStreaming`, which coordinates with `/api/debate/stream` endpoints and SSE transport.
- Server route availability may not fully match the expected init + stream contract that the client now calls.
- Mutation observer failure hints that the DOM target (likely an iframe housing streaming display) is missing when observer attaches, possibly due to race conditions triggered by the crash.

## Todo
1. Confirm the client flow by tracing `useDebateStreaming` → `useAdvancedStreaming` → `StreamingDisplay` to capture when observers attach and what DOM nodes they require.
2. Inspect debate-related server routes to ensure init + SSE handlers exist and validate payload shape vs. client expectations.
3. Review provider orchestration (especially OpenAI streaming implementation) to ensure it supports the SSE path invoked by debate mode.
4. Reproduce the MutationObserver crash path to pinpoint the missing node and decide whether to harden the observer setup or adjust mount order.
5. Draft a surgical fix plan (client, server, or both) that preserves SRP by updating the responsible module only and reuses shared utilities where possible.
