<!--
 * Author: gpt-5-codex
 * Date: 2025-10-21 03:33 UTC
 * PURPOSE: Capture the remediation plan for debate session creation failures caused by missing database bootstrap.
 * SRP/DRY check: Pass - Dedicated planning note for this regression fix.
-->
# Plan: Restore Debate Session Bootstrap

## Goal
Ensure PostgreSQL deployments provision the `debate_sessions` table so new debates can initialize successfully when persistence is enabled.

## Tasks
1. Extend `DatabaseManager.ensureTablesExist` to create the `debate_sessions` table with JSON columns and timestamp defaults mirroring `shared/schema.ts`.
2. Verify the legacy fallback in `server/db.ts` already defines the table so no further changes are required there.
3. Update `CHANGELOG.md` with a new version entry documenting the regression fix.

## Validation
- Static review of the SQL definition to confirm column names/types match the Drizzle schema.
- Rely on the existing storage layer tests/utilities since automated build tooling is unavailable in this environment.
