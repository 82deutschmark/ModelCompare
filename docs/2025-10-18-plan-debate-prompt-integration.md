/**
 * Author: gpt-5-codex
 * Date: 2025-10-18 22:01 UTC
 * PURPOSE: Outline implementation steps to align debate streaming with OpenAI stored prompt usage,
 *          ensuring adversarial intensity variables are injected via the unified variable pipeline and
 *          Responses API prompt references follow the expected shape.
 * SRP/DRY check: Pass - Document scopes planning details for this change only, referencing existing modules without duplication.
 */

# Plan: Debate Prompt Integration

## Goals
- Use the OpenAI stored prompt `pmpt_6856e018a02c8196aa1ccd7eac56ee020cbd4441b7c750b1` for debate turns.
- Ensure adversarial intensity, position, and topic variables flow as strings through the server/provider stack.
- Maintain compatibility with existing providers and the streaming harness.

## Tasks
1. Extend provider call options (non-streaming & streaming) to accept optional prompt references with variables.
2. Update the OpenAI provider to forward prompt references to `openai.responses.create` and `responses.stream` while preserving retries, reasoning config, and fallback logic.
3. Modify the debate streaming route to compute position/intensity/topic variables, pass them as strings, and prefer the stored prompt while retaining message fallbacks for non-OpenAI providers.
4. Verify front-end streaming options already provide required fields; adjust if additional parameters (e.g., position) must cross the network explicitly.
5. Document the change (CHANGELOG) and ensure plan completion notes.

## Validation
- Manual sanity check via `npm run test` (or targeted debate stream tests) if runtime available.
- Confirm TypeScript types compile and lint without errors.
