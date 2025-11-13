/**
 * Author: ChatGPT-4.1
 * Date: 2025-10-25T17:33:00Z
 * PURPOSE: Definitive execution plan for building a greenfield OpenAI Agents SDK
 *          pipeline that references Luigi copy only for narrative content while
 *          implementing brand-new agents and tooling under agents-sdk/.
 * SRP/DRY check: Pass – concentrates exclusively on outlining the greenfield
 *                implementation strategy without duplicating prior migration docs.
 */

# Agents SDK Greenfield Implementation Plan (2025-10-25)

## 1. Project Goals
- Build a **new** pipeline of OpenAI Agents SDK agents under `agents-sdk/`.
- Treat existing `.agents/luigi` files as **content references only** for English instructions and domain insights.
- Deliver production-ready agents with fresh code, tooling, and schemas—no legacy migrations, no reuse of old TypeScript.
- Maintain hobby-friendly scope: prioritize clarity, reuse, and minimal ceremony while adhering to SRP/DRY principles.

## 2. Target Architecture
```
agents-sdk/
  shared/
    tools/            # SDK tool helpers (filesystem, thinker, logging, etc.)
    schemas/          # Reusable Zod schemas (status summaries, task outputs)
    context.ts        # Shared context interfaces/types
  orchestrator/
    master-orchestrator.ts
  stages/
    analysis/
      analysis-stage-lead.ts
      tasks/
        start-time-agent.ts
        setup-agent.ts
        ...
    strategy/
      ...
    (future stage folders)

```

### Key Design Points
1. **Context Isolation**: Shared context types defined once in `shared/context.ts`.
2. **Tool Wrappers**: `shared/tools/index.ts` exports typed helpers (`readRepositoryFilesTool`, `createHandoff`, `createThinkerDelegate`).
3. **Schema Library**: `shared/schemas` houses reusable Zod objects for stage outputs.
4. **Stage Modules**: Each stage folder contains a stage lead plus child tasks with cohesive responsibilities.
5. **Testing Harness**: `tests/smoke` includes lightweight scripts (e.g., orchestrator dry run) to validate agent wiring.

## 3. Implementation Phases
### Phase Alpha – Foundation
1. **Scaffold Directory Structure** (agents-sdk shared/orchestrator/stages/tests).
2. **Shared Context & Tooling**
   - Implement `readRepositoryFilesTool` (safe fs access, Zod parameters, truncation logic).
   - Implement `createHandoff` helper typing, plus thinker delegate stub (pending design decision).
   - Export `analysisSchemas` for reuse.
3. **Analysis Stage**
   - Author new stage lead (`analysis-stage-lead.ts`) with structured output schema.
   - Create child task agents (`start-time`, `setup`, `redline-gate`, `premise-attack`, `identify-purpose`, `plan-type`).
   - Ensure instructions are rewritten using Luigi copy as reference, not direct duplication.
4. **Master Orchestrator**
   - Build orchestrator referencing stage leads via handoffs; include new instructions for the greenfield flow.
5. **Tooling Updates**
   - Update `tsconfig.json` and lint configs to include `agents-sdk/`.
   - Add smoke test harness for orchestrator + analysis stage.

### Phase Beta – Stage Expansion
1. Introduce remaining stage folders (Strategy, Context, Risk, Plan Foundation, Governance, Documentation, Team, Expert Quality, WBS/Schedule, Reporting).
2. For each stage:
   - Define stage-level output schema.
   - Implement stage lead and prioritized child tasks.
   - Add stage-specific tests or mock runs.
3. Maintain docs describing stage responsibilities and dependencies.

### Phase Gamma – Operationalization
1. Finalize thinker tooling decision (external vs. reauthored) and integrate.
2. Run comprehensive type checks (`npm run check`) and targeted smoke tests.
3. Update `CHANGELOG.md` with milestone summary.
4. Document runbook for invoking the new Agents SDK pipeline.

## 4. Deliverables
- New source files in `agents-sdk/` aligned with above structure.
- 
-

## 5. Outstanding Questions
1. **Thinker Delegates**: Should we create new thinker-style agents or integrate existing provider endpoints? Decision needed before Phase Gamma.
2. **Artifact Handling**: Confirm how generated documents/markdown should be stored or returned (structured output vs. external storage reference).
3. **Runner Integration**: Determine when/how to hook the new agents into `server/luigi/openai-sdk-runner.ts` or whether a separate runner will be authored.

## 6. Next Immediate Actions
1. Create the `agents-sdk/` folder hierarchy with placeholder index files (headers included).
2. Implement shared tool wrappers and context definitions.
3. Draft the master orchestrator and Analysis stage agents using the new utilities.
4. Update project tooling (tsconfig, lint) to compile the new directory.
