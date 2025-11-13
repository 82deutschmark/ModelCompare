# 2025-10-25 Provider Failures Recovery Plan
**Author:** Cascade (GPT-4o)
**Date:** October 25, 2025 at 17:00 EDT
**Purpose:** Document investigation path and fixes for Anthropic model 404s, provider registry gaps, and Express cascading failures.
**SRP/DRY check:** Pass - Planning artifact only.

## Goals
- Validate Anthropic model identifiers against current Messages API expectations.
- Extend provider registry to support DeepSeek and OpenRouter models.
- Ensure Express middleware short-circuits gracefully after provider resolution errors.

## Task Breakdown
1. Audit existing provider registry and model catalog usage.
2. Confirm correct Anthropic model IDs via documentation/web search and adjust mapping if required.
3. Update registry/provider instantiation logic to reuse singleton instances and support all providers.
4. Harden error handling path to prevent cascading middleware failures.
5. Verify fixes via targeted unit/integration checks if available.
6. Update changelog and summarize work for the user.

## Open Questions
- Do we need to support additional providers (e.g., xAI via OpenRouter) beyond current scope?
- Should Anthropic requests fall back to legacy model IDs if the latest ones fail?

## Validation Plan
- Re-run failed request flows for Anthropic, DeepSeek, and OpenRouter models.
- Inspect logs to ensure 500 cascades are eliminated.
- Confirm provider registry returns cached instances for repeated calls.
