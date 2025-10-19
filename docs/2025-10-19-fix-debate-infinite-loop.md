# Fix Debate Page Infinite Loop Crash

**Date:** 2025-10-19
**Author:** Claude Code using Sonnet 4.5
**Issue:** Infinite loop causing debate page crash after hydration fix

## Problem

Commit `c3276fe` ("Fix debate hydration regression") introduced an infinite React render loop that crashes the debate page.

### Root Cause

In [debate.tsx:342-348](../client/src/pages/debate.tsx#L342-L348), the `useEffect` dependency array included:
- `debateSession.messages.length`
- `debateSession.turnHistory.length`

These dependencies created an infinite loop because:
1. The effect calls `debateSession.hydrateFromSession()` when `sessionDetailsQuery.data` changes
2. `hydrateFromSession()` modifies `messages` and `turnHistory` state
3. Changes to `messages.length` and `turnHistory.length` trigger the effect to run again
4. Loop continues indefinitely → page crash

### Error Symptoms
- Browser console shows "Maximum update depth exceeded" error
- React DevTools shows rapid re-rendering
- Page becomes unresponsive or crashes
- Memory usage spikes

## Solution

**Removed** `debateSession.messages.length` and `debateSession.turnHistory.length` from the dependency array.

### Rationale
These values are only needed for **conditional checks** inside the effect to prevent stale hydration from overwriting local state. They should NOT trigger the effect to re-run.

The correct dependencies are:
- `sessionDetailsQuery.data` - Trigger hydration when new session data arrives
- `models` - Ensure model lookup map is current
- `debateSession.debateSessionId` - Track which session is active

### Changes Made

**File:** `client/src/pages/debate.tsx` (lines 342-346)

**Before:**
```javascript
  }, [
    sessionDetailsQuery.data,
    models,
    debateSession.debateSessionId,
    debateSession.messages.length,      // ❌ Caused infinite loop
    debateSession.turnHistory.length,   // ❌ Caused infinite loop
  ]);
```

**After:**
```javascript
  }, [
    sessionDetailsQuery.data,
    models,
    debateSession.debateSessionId,
  ]);
```

## Testing

- [x] TypeScript type check passes (`npm run check`)
- [ ] Start fresh debate session - verify no crash
- [ ] Load existing debate session - verify hydration works
- [ ] Check browser console - no "Maximum update depth" errors
- [ ] Verify setup panel stays hidden during active debate
- [ ] Confirm turn history persists correctly

## Notes

This is a classic React hook mistake where values modified inside an effect are also listed as dependencies, creating a feedback loop. The React docs warn against this pattern.

**Best Practice:** Only include dependencies that should *trigger* the effect to run, not values that are merely *used* inside the effect for conditional logic.
