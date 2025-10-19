* Author: GPT-5 Codex
* Date: 2025-10-17 and the 20:18 UTC
* PURPOSE: Capture the tasks to refine debate page scroll handling so users can inspect prior reasoning without the viewport snapping to the latest reply.
* SRP/DRY check: Pass - Dedicated plan for scroll behavior adjustments with references to affected hooks/components only.

# 2025-10-17-Plan-Debate-Scroll-Behavior

## Goal
Disable all automatic scrolling behaviors on the debate page so the viewport never moves without user input.

## Tasks
1. Inspect the existing `scrollIntoView` logic in `client/src/pages/debate.tsx` and the `StreamingDisplay` usage to pinpoint when the snapping occurs.
2. Remove the debate page `scrollIntoView` hooks so messages no longer trigger automatic snapping.
3. Update `StreamingDisplay` to allow opt-out of its internal auto-scroll and pass that flag from the debate page.
4. Validate manually that scrolling upward holds position while new chunks arrive, and that reaching the bottom resumes autoscroll.

## Validation
- Manual browser test: scroll upward during a live stream and confirm the viewport stays put.
- Confirm no auto-scroll occurs during streaming or when new messages arrive.
- Ensure no console errors or layout thrashing is introduced.
