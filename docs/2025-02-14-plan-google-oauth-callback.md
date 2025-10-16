*
* Author: gpt-5-codex
* Date: 2025-02-14T00:00:00Z
* PURPOSE: Planning log for refining Google OAuth callback URL resolution across environments.
* SRP/DRY check: Pass - Focused documentation for a single remediation effort with references to existing code paths.

# Plan: Resolve Google OAuth callback environment regression

## Goal
Ensure Google OAuth callback resolution keeps local development on HTTP while preserving secure HTTPS callbacks in production and staging environments.

## Tasks
- [x] Review `server/auth.ts` for the environment resolution flow introduced in PR #36.
- [x] Identify how `DOMAIN` is prioritized ahead of environment checks and forces HTTPS even for localhost values.
- [x] Update the callback resolver to gate scheme normalization by environment (prod/staging vs. local).
- [x] Re-run mental test cases covering explicit callback, staging, production, and local defaults.
- [ ] Coordinate with maintainer if additional manual QA is required after merge.

## Notes
- Keep existing normalization helper but ensure local `.env` configurations do not need to change.
- Railway environment variables continue to short-circuit to hosted URLs when present.
