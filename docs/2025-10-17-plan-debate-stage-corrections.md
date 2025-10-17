<!--
 * Author: gpt-5-codex
 * Date: 2025-10-17 19:25 UTC
 * PURPOSE: Action plan to correct debate stage layout regressions and finalize Robert's Rules workflow polish.
 * SRP/DRY check: Pass - planning notes isolated from implementation code.
-->
# Debate Stage Corrections & Polish Plan

## Goals
- Resolve functional gaps introduced in the initial debate stage refactor (jury gating, exports, controls).
- Tighten UX cues for Robert's Rules flow so users understand phase/floor status and review obligations.
- Ensure documentation and changelog capture the follow-up adjustments for transparency.

## Task List
1. **Jury Workflow Corrections**
   - Fix the review toggle wiring so "Mark Reviewed" actually clears pending status.
   - Stop auto-clearing `needsReview` on score/tag/note edits so jurors must explicitly confirm review.
   - Ensure controls and continue buttons remain blocked until all jurors mark reviewed.
2. **Stage Timeline & Controls Polish**
   - Disable phase advancement once closing arguments begin and surface floor status clearly.
   - Double-check phase/floor helpers from `useDebateSession` for consistency and memoization.
3. **Export Data Integrity**
   - Feed the actual topic text plus jury metadata into exports so downstream artifacts carry the new annotations.
4. **Documentation & Quality Checks**
   - Update changelog with a new version entry summarizing corrections.
   - Run TypeScript checks (`npm run check`) and note any outstanding issues.
