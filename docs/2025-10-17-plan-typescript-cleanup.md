* Author: gpt-5-codex
* Date: 2025-10-17 23:15 UTC
* PURPOSE: Document the TypeScript error remediation plan for debate, auth, Luigi executor, and payment routes after merge conflicts introduced schema drift.
* SRP/DRY check: Pass - plan only enumerates remediation steps without duplicating existing documentation.

# Plan: TypeScript Cleanup After Debate Streaming Merge

## Goal
Clear all outstanding `npm run check` TypeScript errors by aligning client and server types with the post-merge architecture and removing stale props introduced during the debate streaming refactor.

## Tasks
1. **Luigi artifact rendering**
   - Update `LuigiArtifactPanel` to narrow `artifact.data` checks so React receives JSX instead of potentially passing the raw object.
2. **Auth user typing**
   - Broaden the auth hook response type to tolerate OAuth payloads while keeping device-user compatibility. Add a type guard for email detection.
   - Align device auth middleware request augmentation with the lean `users` table shape.
3. **Debate controls props**
   - Supply the phase, floor, and jury props required by `DebateControls` and remove unsupported props from `StreamingControls` usage.
4. **Luigi executor + storage contracts**
   - Extend `LuigiRunUpdate` to allow `updatedAt` and sanitize `currentStageId`/artifact payloads before persisting.
5. **Credits route user guard**
   - Ensure `/create-payment-intent` fails fast when no authenticated user is attached before referencing `user.id`.

## Validation
- Run `npm run check` to confirm zero TypeScript errors.
- Smoke the debate flow locally if time permits once types compile.
