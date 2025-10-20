<!--
 * Author: gpt-5-codex
 * Date: 2025-10-20 18:46 UTC
 * PURPOSE: Capture objectives and tasks for implementing debate session listings across storage, API, and UI layers.
 * SRP/DRY check: Pass - planning confined to this document without duplicating execution details elsewhere.
-->

# Plan: Debate Session Listing Improvements

## Goal
Expose persisted debate sessions through storage, API, and frontend normalization so the history drawer can display saved debates.

## Tasks
- Review current storage contract and identify where to add a session listing method for both database and memory implementations.
- Update debate sessions API route to leverage the new storage method and return the enriched session metadata required by the client.
- Confirm the frontend normalization logic matches the backend payload structure; adjust mapping if fields differ.
- Run through the debate flow manually to ensure saved sessions populate the history drawer without regressions.
- Update changelog with a summary of the work and version bump.

## Considerations
- Preserve SRP by keeping storage method responsibilities confined to retrieval without formatting.
- Maintain type safety by reusing shared schema types where possible.
- Ensure ordering by updated timestamp with created fallback for deterministic history lists.
- Validate that memoized client logic handles optional jury summaries gracefully.
