* Author: GPT-5 Codex
* Date: 2025-10-17 and the 20:18 UTC
* PURPOSE: Capture the tasks to refine debate page scroll handling so users can inspect prior reasoning without the viewport snapping to the latest reply.
* SRP/DRY check: Pass - Dedicated plan for scroll behavior adjustments with references to affected hooks/components only.

# 2025-10-17-Plan-Debate-Scroll-Behavior

## Goal
Stop automatic viewport locking on the newest debate message while preserving helpful autoscroll when the user is already near the bottom.

## Tasks
1. Inspect the existing `scrollIntoView` logic in `client/src/pages/debate.tsx` and the `StreamingDisplay` usage to pinpoint when the snapping occurs.
2. Introduce a user-intent guard (e.g., distance threshold or manual pinning flag) so autoscroll triggers only when the user is near the bottom or streaming just started.
3. Adjust related hooks/components if they rely on forced scrolling to keep status UI visible.
4. Validate manually that scrolling upward holds position while new chunks arrive, and that reaching the bottom resumes autoscroll.

## Validation
- Manual browser test: scroll upward during a live stream and confirm the viewport stays put.
- Scroll back to the bottom and verify new completions auto-scroll again.
- Ensure no console errors or layout thrashing is introduced.
