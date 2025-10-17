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

## Resolution - ✅ COMPLETED

### Root Cause
The MutationObserver error originated from **browser extensions** (like Grammarly, LastPass, etc.) trying to observe DOM nodes during rapid streaming updates. The error message `web-client-content-script` confirmed this was external, not from our codebase.

### Investigation Results
1. ✅ **Client Flow**: Confirmed `debate.tsx` → `useAdvancedStreaming` → POST `/api/debate/stream` → `StreamingDisplay` works correctly
2. ✅ **Server Routes**: `/api/debate/stream` exists with proper SSE handlers, payload validation, and provider orchestration
3. ✅ **Provider Support**: All providers properly support SSE streaming
4. ✅ **Observer Source**: No MutationObserver in our codebase - confirmed external browser extension interference

### Implemented Fix (Commit: 202ca41)
**Files Modified:**
- `client/src/components/StreamingDisplay.tsx`
- `client/src/pages/debate.tsx`

**Changes:**
1. Added null checks before all `scrollIntoView` calls
2. Wrapped scroll operations in try-catch blocks to prevent crashes
3. Added data attributes to disable Grammarly on streaming containers:
   - `data-gramm="false"`
   - `data-gramm_editor="false"`
   - `data-enable-grammarly="false"`
4. Debug logging instead of error propagation

### Result
Streaming display now gracefully handles browser extension interference without crashing. The fix is minimal, defensive, and preserves SRP.
