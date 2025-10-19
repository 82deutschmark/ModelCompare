<!--
 * Author: gpt-5-codex
 * Date: 2025-10-18 22:15 UTC
 * PURPOSE: Outline the work required to align debate streaming with the updated OpenAI prompt version and validate variable payloads.
 * SRP/DRY check: Pass - Focuses solely on the prompt version alignment tasks and avoids duplicating other planning content.
-->

# Plan: Debate Prompt Version Alignment

## Objective
Resolve the OpenAI 400 errors by updating the debate streaming flow to reference the correct stored prompt version while confirming variable payload integrity across the stack.

## Tasks
- Verify the stored prompt metadata supplied to the provider and switch to the current version (`4`).
- Ensure debate stream payloads convert numeric intensity values to strings prior to provider calls.
- Audit documentation and tests for references to the previous prompt version and update as needed.
- Capture the fix in the changelog with an appropriate semantic version increment and timestamp.

## Validation
- Manual reasoning review of `server/routes/debate.routes.ts` to confirm the prompt reference uses version 4 with lowercase variable keys.
- If time permits, run the existing debate SSE regression test; otherwise, rely on code inspection and prior coverage noting no functional logic shift beyond constants.
