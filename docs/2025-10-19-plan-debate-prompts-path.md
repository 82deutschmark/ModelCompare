/**
 * Author: gpt-5-codex
 * Date: 2025-10-19 03:16 UTC
 * PURPOSE: Plan remediation for debate prompt markdown loading so production builds
 *          resolve assets from a stable root instead of transient bundle directories.
 * SRP/DRY check: Pass - Focused on path resolution and related verification steps only.
 */

# Plan: Debate Prompts Path Resolution

## Goals
- Ensure `server/routes/debate.routes.ts` can resolve `debate-prompts.md` after bundling to `dist/`.
- Preserve developer/system intensity guidance so debate streams keep descriptive metadata in production.
- Document and validate the fix with changelog and targeted checks.

## Tasks
1. Replace the `__dirname`-relative markdown path with a project-root resolver based on `process.cwd()` and reuse it after bundling.
2. Harden `loadDebateInstructions` to surface the resolved path in error logs for easier debugging while keeping caching intact.
3. Verify TypeScript types via `npm run check` and update the changelog with a new semantic version entry.
