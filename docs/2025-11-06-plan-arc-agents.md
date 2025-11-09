<!--
 Author: gpt-5-codex
 Date: 2025-11-06T19:18:00Z
 PURPOSE: Planning document outlining the steps to repair the ARC agents integration and ensure the feature is production-ready.
 SRP/DRY check: Pass - planning only, references existing modules without duplicating requirements.
-->

# ARC Agents Integration Stabilization Plan

## Objectives
- Verify current ARC executor and router integrate with a real OpenAI Agents SDK client.
- Replace any stubbed logic with production-ready implementations using `@openai/agents`.
- Ensure storage synchronization and client contracts remain consistent.
- Provide automated coverage and documentation updates to prevent regressions.

## Tasks
1. **Audit Dependencies & SDK Usage**
   - Inspect `@openai/agents` packages in `node_modules` to confirm proper exports and instantiate pattern.
   - Identify mismatches between existing `runArcAgentWithSdk` helper and actual SDK requirements.

2. **Implement Real SDK Runner**
   - Introduce a concrete OpenAI Agents client wrapper that authenticates with `OPENAI_API_KEY`.
   - Support streaming or iterative turns respecting `maxTurns` while mapping responses into our `AgentRunResponse` contract.
   - Handle JSON parsing, stage normalization, and artifact creation robustly.

3. **Wire Executor to Storage & Router**
   - Ensure `ArcExecutor` persists run status, messages, and artifacts with accurate typing.
   - Add missing translation for message roles, stage states, and artifact typing.
   - Guarantee cancellation and user reply flows resume agent execution correctly.

4. **Configuration & Validation**
   - Extend `server/config.ts` with ARC-specific configuration (model, max turns, API key presence).
   - Add runtime validation and descriptive errors when configuration is incomplete.

5. **Testing & Documentation**
   - Write unit/integration tests (Vitest) covering `runArcAgentWithSdk` behavior using mocked SDK clients.
   - Document API contract updates in `docs/` and update `CHANGELOG.md` with new version entry.

## Risks & Mitigations
- **SDK API drift:** Mitigate by centralizing wrapper and referencing official types.
- **Parsing failures:** Implement defensive parsing with Zod and structured error handling.
- **Cost tracking gaps:** Ensure responses include cost fields or fall back to heuristics.

## Definition of Done
- ARC routes successfully drive OpenAI Agents SDK end-to-end in development.
- All automated tests pass (`npm run check`, targeted Vitest suite if applicable).
- Changelog updated with semantic version bump and summary of agent integration fix.
