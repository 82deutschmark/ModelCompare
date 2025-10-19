<!--
 * Author: gpt-5-codex
 * Date: 2025-10-19 01:18 UTC
 * PURPOSE: Capture the action plan for restoring the debate page boot flow, fixing template substitution, and validating the streaming handshake.
 * SRP/DRY check: Pass - Focused on documenting tasks for this fix without duplicating other plans.
-->

# Debate Regression Hotfix Plan

## Goal
Restore the debate page so it renders without runtime errors and ensure prompt generation matches the updated markdown template contract while keeping streaming features intact.

## Context Synopsis
- Debate page currently crashes at mount because `debateService.getNextDebater` is invoked before `debateService` instantiates.
- Markdown prompt placeholders were converted to lowercase, but our generators still perform uppercase substitutions, leaving previews and client-generated prompts unresolved.
- Backend flow remains functional; we need client fixes plus validation.

## Task Checklist
<<<<<<< Updated upstream
- [ ] Guard all render-time usages of `debateService.getNextDebater` in `client/src/pages/debate.tsx` by relying on the memoized `nextSpeakerId`.
- [ ] Update `DebateService.generatePrompts`, `DebateService.buildRebuttalPrompt`, and `useDebatePrompts.generateDebatePrompts` to replace both lowercase and uppercase template variables.
- [ ] Run `npm run check` and `npm run build` to verify type safety and production build stability.
- [ ] Smoke test debate startup (create session, stream opening, continue turn) after code changes.
- [ ] Update `CHANGELOG.md` with a new patch release entry summarizing the fixes.
- [ ] Commit changes with a detailed message after validation.
=======
- [x] Guard all render-time usages of `debateService.getNextDebater` in `client/src/pages/debate.tsx` by relying on the memoized `nextSpeakerId`.
- [x] Update `DebateService.generatePrompts`, `DebateService.buildRebuttalPrompt`, and `useDebatePrompts.generateDebatePrompts` to replace both lowercase and uppercase template variables.
- [x] Introduce a global MutationObserver guard so third-party extensions cannot crash the page before React mounts.
- [x] Run `npm run check` and `npm run build` to verify type safety and production build stability.
- [ ] Smoke test debate startup (create session, stream opening, continue turn) after code changes.
- [x] Update `CHANGELOG.md` with a new patch release entry summarizing the fixes.
- [x] Commit changes with a detailed message after validation.
>>>>>>> Stashed changes

## Risk Notes
- Ensure the template replacements remain backwards-compatible with any unconverted placeholders.
- Verify no additional debate hooks rely on the prior uppercase-only behavior.

## Validation Steps
1. `npm run check`
2. `npm run build`
3. Manual UI smoke test for debate start and continuation.
