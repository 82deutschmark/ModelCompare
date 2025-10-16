<!--
 * Author: gpt-5-codex
 * Date: 2025-10-16 and 15:52 UTC
 * PURPOSE: Outline plan to resolve debate session creation failure leading to 500 errors
 * SRP/DRY check: Pass - single-purpose planning document for current task
-->
# Plan: Restore Debate Session Creation

## Goal
Resolve the backend 500 errors encountered when creating debate sessions so that debate mode can initialize correctly without requiring external scripts like Stripe.

## Current Understanding
- POST `/api/debate/session` currently returns HTTP 500 with `{"error":"Failed to create debate session"}`.
- The server logs likely originate from `server/routes/debate.routes.ts` when `storage.createDebateSession` throws.
- Database bootstrap in `server/db.ts` only creates `comparisons` and `vixra_sessions` tables, so deployments with a real PostgreSQL database may lack the `debate_sessions` table defined in `shared/schema.ts`.
- Absence of that table would cause inserts to fail, matching the observed 500 error.

## Tasks
1. **Verify storage bootstrap**
   - Inspect `ensureTablesExist` to confirm missing `debate_sessions` creation.
2. **Implement migration fallback**
   - Extend `ensureTablesExist` with a `CREATE TABLE IF NOT EXISTS "debate_sessions"` statement mirroring the Drizzle schema.
   - Ensure JSON fields default to empty arrays and timestamps default to `now()`.
3. **Add regression coverage**
   - Update or add comments/tests if feasible to highlight the expectation that debate storage is available.
4. **Document the fix**
   - Summarize changes in commit and PR message.

## Risks & Mitigations
- **Risk:** SQL definition mismatching Drizzle schema.
  - *Mitigation:* Copy column names and types directly from `shared/schema.ts` definition.
- **Risk:** Future schema drift between migration and ensureTablesExist fallback.
  - *Mitigation:* Leave TODO note referencing Drizzle migrations to keep in sync.

## Definition of Done
- Creating a debate session against a fresh database no longer throws; backend returns 200 with session payload.
- Code passes lint/typecheck if run locally.
- Commit includes descriptive message and PR prepared via automation.
