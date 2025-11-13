/*
 * Author: GPT-4.1
 * Date: 2025-11-09 00:00 UTC
 * PURPOSE: Plan to prevent post-cancel mutations in Luigi runs by short-circuiting response handling and propagating abort signals to async runners.
 * SRP/DRY check: Pass — document-only file; focuses on one change set.
 */

# Goal
Prevent cancelled Luigi runs from being mutated by in‑flight async responses and ensure upstream calls are aborted.

# Plan
- Add cancellation guard in `server/luigi/executor.ts:handleAgentResponse` to return early when run status is `cancelled`.
- Propagate abort signals to the REST agent runner and track controllers per run to allow `cancelRun` to abort in‑flight HTTP.
- Keep SDK path unchanged for now (stateless single call), rely on cancel guard for safety.
- Update CHANGELOG and commit.

# Notes
- This is a surgical backend fix; no UI changes required.
- Future enhancement: add SDK request cancellation if client supports it.

