/**
 * Author: gpt-5-codex
 * Date: 2025-10-20 04:05 UTC
 * PURPOSE: Outline a corrective plan for restoring stable debate prompt loading
 *          after the regression introduced by relying solely on process.cwd().
 * SRP/DRY check: Pass - Focuses exclusively on locating and caching the debate
 *                prompt markdown plus verifying no downstream regressions.
 */

# Plan: Debate Prompt Path Reliability & Race Hardening

## Goals
- Restore successful loading of `client/public/docs/debate-prompts.md` in both source-driven and bundled deployments.
- Eliminate the fallback "debate setup" UI regression by ensuring intensity descriptors are delivered consistently.
- Audit `loadDebateInstructions()` for possible race or cache hazards and implement guards as needed.
- Capture the fix in the changelog with an updated semantic version entry.

## Tasks
1. Implement a robust resolver that searches multiple stable roots (explicit env override, cwd, __dirname ancestry, executable dir) for `debate-prompts.md`, caching the discovered path.
2. Guard `loadDebateInstructions()` with improved logging and fast-fail semantics so a transient read error does not poison future attempts.
3. Re-test the debate streaming initialization path locally (via `npm run check`) to confirm type safety, and update the changelog documenting the regression fix.
