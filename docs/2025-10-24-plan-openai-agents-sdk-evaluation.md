# OpenAI Agents SDK Evaluation Plan
**Author:** Cascade (ChatGPT-4.1)
**Date:** 2025-10-24T22:47:00Z
**Purpose:** Establish a concrete plan and task list for assessing how the existing Luigi agent workspace aligns with the OpenAI Agents SDK and what changes are required for integration.

---

## High-Level Goals
1. Catalogue current Luigi agent definitions, tooling, and orchestration flow.
2. Compare Codebuff agent architecture with OpenAI Agents SDK features (agents, tools, handoffs, guardrails, tracing, parallelization).
3. Produce a migration approach that preserves SRP/DRY while leveraging the SDK for execution.

## Working TODO List
- [x] Inventory Luigi orchestrator and stage lead agent definitions, including tool expectations and spawnable dependencies.
- [x] Document current execution pipeline (storage, executor, external REST runner) and identify replacement points for the SDK.
- [x] Map critical SDK features (handoffs, guardrails, tracing, structured outputs) to current Luigi requirements and note gaps.
- [x] Outline phased implementation plan (minimal viable integration → full feature parity).
- [ ] Update CHANGELOG and supporting docs once analysis is complete.

## Initial Context Collected
- `.agents/luigi/*.ts` files declare stage leads using the Codebuff `AgentDefinition` interface with static prompts and tool lists.
- `luigi_master_orchestrator.ts` relies on `spawn_agents`/`think_deeply` tools and expects a cascading set of stage leads.
- `server/luigi/executor.ts` forwards work to an external agent runner via REST (`callAgentByRest`), which is not implemented in-repo.
- Storage layer persists run metadata, messages, and artifacts but assumes downstream agent execution returns structured responses.
- Previous architecture docs flag the missing execution engine, indicating the current setup is non-functional without the external service.

## Luigi Agent Inventory

- **Master orchestrator** is defined locally and delegates to eleven stage-lead agents plus two thinker utilities via `spawnableAgents`, relying on `spawn_agents`, `read_files`, `think_deeply`, and `end_turn` tooling.@.agents/luigi_master_orchestrator.ts#1-48
- **Stage leads** (e.g., Analysis, Context) share a consistent structure: `AgentDefinition` objects targeting `openai/gpt-5-mini`, enabling Codebuff-specific tools (`spawn_agents`, `read_files`, `think_deeply`, `end_turn`) and cascading into task-level agents declared under `.agents/luigi`.@.agents/luigi/analysis_stage_lead.ts#1-27@.agents/luigi/context_stage_lead.ts#1-28
- **Task agents** (e.g., `luigi-datacollection`) depend on Codebuff runtime semantics, lack explicit output schemas, and primarily emit textual briefings while invoking limited tool sets.@.agents/luigi/datacollection-agent.ts#1-24
- **Tool catalog** is hard-coded via `ToolName` unions and parameter typings under `.agents/types/tools.ts`, which have no direct equivalent in the OpenAI Agents SDK and will need adapter shims.@.agents/types/tools.ts#1-205

## Execution Pipeline Audit

1. **Run lifecycle**: `LuigiExecutor` constructs run rows, initializes stage snapshots, and persists metadata through `storage` before dispatching to an external orchestrator service via `callAgentByRest`.
2. **External dependency**: All agent execution is assumed to occur in an out-of-repo runner exposed at `/agents/run`, returning messages, artifacts, cost, and stage snapshots. The service contract is codified in `AgentRunResponse` but lacks a concrete implementation locally.@server/services/agent-runner.ts#1-82
3. **Response handling**: `handleAgentResponse` normalizes stage status, appends messages/artifacts, and respects `await_user` pauses, expecting roles such as `orchestrator`, `stage-lead`, and `tool` that align with the Codebuff agent stack rather than the OpenAI Agents SDK outputs.@server/luigi/executor.ts#125-216
4. **API surface**: Express routes expose CRUD operations for runs, messages, artifacts, and control flow using the executor, meaning any new SDK integration must preserve these REST signatures for UI compatibility.@server/routes/luigi.ts#29-124
5. **Configuration**: Environment wiring assumes `AGENT_RUNNER_BASE_URL` and `AGENT_RUNNER_API_KEY`, which will need repurposing or migration to SDK-specific configuration (e.g., OpenAI API keys, tool registries).@server/config.ts#212-218

**Replacement opportunities**:
- Swap `callAgentByRest` with an in-process SDK runner to remove the external dependency.
- Translate returned `AgentRunResponse` structures to the existing storage expectations, potentially via an adapter that maps SDK traces to Luigi concepts.

## SDK Feature Alignment

| Requirement | Current Implementation | OpenAI Agents SDK Capability | Gap/Action |
|-------------|------------------------|------------------------------|------------|
| Multi-agent orchestration | Master orchestrator + stage leads using Codebuff `spawn_agents` | SDK supports `Agent` objects with handoffs and nested runs | Need to model stage leads as SDK agents & encode dependencies; replace `spawn_agents` with SDK `handoffs` or explicit `run` calls |
| Tooling | Custom Codebuff tools (file ops, web search, thinker) | SDK `tool()` definitions with typed schemas | Rebuild tool wrappers in Node backend; map only required subset (file/web/tool) and enforce SRP |
| Handoffs | Implicit via `spawn_agents`, lacks structured metadata | SDK has first-class `handoffs` with `handoffDescription` and `Agent.create` | Define stage chains using SDK handoffs for clarity and enforce sheperded transitions |
| Guardrails | None beyond prompt instructions | SDK configurable guardrails (input/output) | Introduce validation for mission briefs, enforce artifact schema once stage outputs land |
| Tracing | Storage logs messages/artifacts manually | SDK emits run events and streaming hooks | Capture SDK trace events, persist to storage for UI parity |
| Structured outputs | Stage leads respond with free text | SDK supports zod-based schemas | Define schemas per stage where deterministic artifacts are required, reducing post-processing |
| Parallelization | Limited; `spawn_agents` likely sequential in Codebuff runtime | SDK can parallelize tool calls and agent runs | Evaluate safe parallel steps (e.g., context/location tasks) once dependency graph clarified |
| Human-in-the-loop | `/replies` endpoint allows user injection | SDK supports pausing via guardrails or manual checks | Implement `await_user` by suspending SDK runner state and resuming on reply |

## Implementation Progress (2025-10-24)

- **In-process orchestrator bridge**: Added `server/luigi/openai-sdk-runner.ts` that wraps the OpenAI Agents SDK, assembles mission and stage context, and emits `AgentRunResponse` payloads compatible with the existing storage pipeline.@server/luigi/openai-sdk-runner.ts#1-261
- **Executor wiring**: Extended `LuigiExecutor` to support `agentMode` selection, delegating to the SDK bridge whenever configuration specifies `sdk` mode, while preserving the current REST fallback.@server/luigi/executor.ts#70-265
- **Configuration + routing**: Surfaced new environment-driven settings (`LUIGI_AGENT_MODE`, `LUIGI_SDK_MODEL`, `LUIGI_SDK_MAX_TURNS`) and forwarded them through the Express router so runtime toggles require no code changes.@server/config.ts#61-236@server/routes/luigi.ts#29-45
- **Dependency management**: Installed `@openai/agents` and refreshed the lockfile to ensure type support for the new runner.

### Remaining Gaps
1. **Tool adapters** – Need concrete SDK `tool()` wrappers for `read_files`, `think_deeply`, and Luigi-specific spawn behaviour so orchestration can branch beyond single-agent summaries.
2. **Stage-lead modeling** – Stage leads still rely on Codebuff definitions; we must translate them into SDK `Agent` instances with handoff metadata.
3. **Tracing + guardrails** – Current bridge returns a single Markdown artifact; integrate SDK tracing events and guardrail responses so the UI benefits from richer diagnostics.
4. **Structured outputs** – Define zod schemas for critical artifacts (e.g., stage readiness summaries) to replace the current freeform Markdown-only payloads.

## Phased Integration Plan

1. **Foundation (MVP)**
   - Stand up an in-process SDK runner that mirrors `callAgentByRest` contract, using the orchestrator as a primary `Agent` with newly defined handoffs for stage leads.
   - Implement minimal tool adapters (`read_files`, `spawn_agents` as SDK agent calls, `end_turn`) and ensure outputs replicate existing message structure for storage writes.
2. **Stage parity**
   - Incrementally migrate each stage lead to SDK definitions, layering structured outputs (zod schemas) to capture artifacts where feasible.
   - Map stage progress to SDK turn metadata, ensuring `LuigiExecutor` continues to publish snapshots and `await_user` states to the UI.
3. **Advanced capabilities**
   - Introduce guardrails and tracing, persisting SDK trace IDs for debugging.
   - Explore parallel execution for independent tasks (e.g., documentation prep vs. governance) with careful dependency annotations.
4. **Decommission legacy glue**
   - Retire Codebuff-specific tool typings and update `.agents` directory to either historical reference or SDK-native modules.
   - Update environment configuration to emphasize OpenAI credentials and any local MCP tool servers.

## Risks & Prerequisites
- Recreating tool behaviors requires parity with Codebuff runtime (file search/edit, research). Missing features could stall certain stages.
- Storage schema may need adjustments to capture SDK structured outputs and trace identifiers.
- UI expectations for role names (`stage-lead`, `tool`) must be preserved or mapped; otherwise transcripts could mislabel entities.
- Testing harness is absent; validate integration via targeted SDK run scripts before wiring to Express routes.

## Key Questions
1. Which Luigi responsibilities can translate directly into OpenAI Agents SDK constructs (agents, tools, handoffs)?
2. What bespoke tools (e.g., file reads, spawn logic) must be reimplemented using SDK tool definitions?
3. How will the new agent loop interface with existing persistence (`storage`) and stage progression (`LUIGI_STAGES`)?
4. Can we gradually replace the external runner while maintaining current API contracts (`LuigiExecutor` / REST routes)?

## Next Steps
1. Deep-dive each stage lead definition to understand spawn chains and data expectations.
2. Draft compatibility matrix aligning Codebuff concepts with SDK terminology and capabilities.
3. Propose a migration timeline with risk mitigation and required refactors.
