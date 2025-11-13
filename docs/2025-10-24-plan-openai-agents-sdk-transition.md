/**
 * Author: ChatGPT-4.1
 * Date: 2025-10-24T23:30:00Z
 * PURPOSE: Junior-friendly playbook for rewriting the Luigi Codebuff agents
 *          under .agents/luigi to the OpenAI Agents SDK (JS/TS) patterns.
 * SRP/DRY check: Pass – instructions focus solely on Luigi agent migration
 *                and reuse shared templates for repeated steps.
 */

# Luigi → OpenAI Agents SDK Migration Playbook (Junior Edition)

## Why this guide exists
- We replaced the backend executor with the OpenAI Agents SDK (@server/luigi/openai-sdk-runner.ts#1-261), but every Luigi agent in `.agents/luigi` still uses the old Codebuff `AgentDefinition` shape.
- This document explains, step-by-step, how a junior developer should edit each file to comply with the SDK described in the official docs (see [Agents guide](https://openai.github.io/openai-agents-js/guides/agents) and [Handoffs API](https://openai.github.io/openai-agents-js/openai/agents/classes/handoff/)).
- Follow the checklist in order; each section calls out the exact files to modify.

## Prerequisites
1. Install dependencies (`npm install`) so `@openai/agents`, `@openai/agents-core`, and `zod` are available.
2. Read the OpenAI Agents SDK basics (constructor properties, `tool()` helper) to understand the terminology.
3. Keep this repo rule in mind: every file needs the standard header block before any imports.

## Migration overview
| Phase | Scope | Files | Goal |
| --- | --- | --- | --- |
| A | Orchestrator + Stage Leads | `.agents/luigi_master_orchestrator.ts`, `.agents/luigi/*_stage_lead.ts` | Convert leaders into `Agent` instances with explicit handoffs. |
| B | Task Agents | Remaining `.agents/luigi/*.ts` | Convert each task into SDK agents with structured outputs. |
| C | Shared tooling reference | `.agents/types/*.ts` | Deprecate legacy unions once all agents stop importing them (final cleanup).

## Shared template for SDK agents
Use this pattern to replace the legacy `AgentDefinition` export in every file:

```ts
/** header block (author/date/purpose/SRP) */
import { Agent, tool, handoff } from '@openai/agents';
import { z } from 'zod';

export default new Agent({
  name: 'Analysis & Gating Stage Lead',
  instructions: `You coordinate ...`,
  model: 'openai/gpt-5-mini',
  tools: [/* tool() definitions or handoff(...) entries */],
  handoffs: [handoff({
    name: 'luigi_starttime',
    agent: startTimeAgent,
    description: 'Kick off the pipeline with environment checks.',
  })],
});
```

### Key changes vs. legacy files
- Remove `AgentDefinition` import and `const definition = { ... }` object.
- Replace `toolNames` array with concrete `tool()` calls (for local utilities) or `handoff()` entries (for agent delegation). The `tool()` helper expects a Zod schema for parameters per [Agents guide](https://openai.github.io/openai-agents-js/guides/agents).
- Replace `spawnableAgents` with `handoffs` (agents-as-tools pattern) as documented in [Handoff API](https://openai.github.io/openai-agents-js/openai/agents/classes/handoff/).
- If the agent returns structured data (e.g., Markdown summary), set `outputType` with a Zod schema.
- Default-export the `Agent` instance (`export default new Agent({...})`).

## Phase A – Orchestrator & Stage Leads
### 1. Master orchestrator (`.agents/luigi_master_orchestrator.ts`)
1. Update header metadata to today’s edit.
2. Replace the legacy definition with:
   - `import { Agent, handoff } from '@openai/agents';`
   - `tools` array containing the thinker utilities via handoff wrappers (e.g., `handoff({ name: 'thinker', agent: thinkerAgent })`).
   - `handoffs` array listing each stage lead in pipeline order. Provide `description` strings referencing dependencies (use `.agents/LUIGI.md` for the dependency chain).
3. Inject mission context into instructions and use `dynamicInstructions` if you need to thread runtime data (see Agents guide – Dynamic instructions section).

### 2. Stage lead agents (11 files)
Files:
- `.agents/luigi/analysis_stage_lead.ts`
- `.agents/luigi/strategy_stage_lead.ts`
- `.agents/luigi/context_stage_lead.ts`
- `.agents/luigi/risk_assumptions_stage_lead.ts`
- `.agents/luigi/plan_foundation_stage_lead.ts`
- `.agents/luigi/governance_stage_lead.ts`
- `.agents/luigi/documentation_stage_lead.ts`
- `.agents/luigi/team_stage_lead.ts`
- `.agents/luigi/expert_quality_stage_lead.ts`
- `.agents/luigi/wbs_schedule_stage_lead.ts`
- `.agents/luigi/reporting_stage_lead.ts`

For each file:
1. Swap `AgentDefinition` import for `import { Agent, handoff } from '@openai/agents';`.
2. Wrap every item in the old `spawnableAgents` list as a `handoff({ name, agent, description })` entry.
   - Example: `handoff({ name: 'luigi_starttime', agent: startTimeAgent, description: 'Initialize mission context' })`.
3. Replace `toolNames` with explicit tools:
   - `read_files` ⇒ implement via SDK `tool()` that maps to our backend file-read endpoint (create once in `server/luigi/tools.ts` and import here).
   - `think_deeply` ⇒ map to thinker agent handoff or custom tool that queries OpenAI reasoning models.
   - `end_turn` ⇒ no longer needed; the SDK calls stop when the agent emits final output.
4. Provide an `outputType` schema for the status brief each stage lead returns (e.g., stage summary, risks, next steps).
5. Add `handoffDescription` (human-readable string) for the agent itself so when called as a tool the runner can display guidance.

## Phase B – Task Agents
There are 52 task agent files under `.agents/luigi/`. They fall into consistent buckets. Apply the corresponding template to each file listed.

### B1. Context-gathering tasks
Files: `luigi-starttime.ts`, `luigi-setup.ts`, `luigi-redlinegate.ts`, `luigi-premiseattack.ts`, `luigi-identifypurpose.ts`, `luigi-plantype.ts`, `luigi-currencystrategy-agent.ts`, `luigi-physicallocations-agent.ts`.

Steps:
1. Import `{ Agent }` and `z`.
2. Build a Zod schema describing the structured summary the agent must produce (e.g., `const StartTimeSummary = z.object({ prerequisites: z.array(z.string()), blockers: z.array(z.string()) });`).
3. Define helper tools (if needed) using `tool()`; inject them into `tools` property.
4. Default-export `new Agent({ name, instructions, model: 'openai/gpt-5-mini', outputType: StartTimeSummary, tools })`.

### B2. Lever ideation & strategy tasks
Files: `luigi-potentiallevers.ts`, `luigi-deduplicatelevers.ts`, `luigi-enrichlevers.ts`, `luigi-focusonvitalfewlevers.ts`, `luigi-strategicdecisionsmarkdown.ts`, `luigi-candidatescenarios-agent.ts`, `luigi-selectscenario-agent.ts`, `luigi-scenariosmarkdown-agent.ts`.

Steps:
1. Each agent should expose structured outputs (arrays of levers, scores, markdown). Define Zod schema per task.
2. If the task currently spawns downstream work, convert to `handoff` entries pointing at the next agent.
3. Document scoring guidance in `instructions` and surface required fields in `outputType`.

### B3. Assumptions & risk chain
Files: `luigi-makeassumptions-agent.ts`, `luigi-distillassumptions-agent.ts`, `luigi-reviewassumptions-agent.ts`, `luigi-identifyrisks-agent.ts`, `luigi-riskmatrixtask-agent.ts`, `luigi-riskmitigationplantask-agent.ts`, `luigi-premortem-agent.ts`.

Steps:
1. Normalize outputs using Zod schema fields for severity, likelihood, mitigation.
2. Add guardrails if needed (e.g., ensure risk severity is one of `['low','medium','high']`).
3. Replace any plain-text returns with structured JSON + markdown artifact (store markdown in the backend).

### B4. Governance & documentation workflow
Files: all `governancephase*.ts`, `consolidategovernance-agent.ts`, `documentation_stage_lead` subordinates (`draftdocumentstocreate`, `filterdocumentstofind`, etc.).

Steps:
1. Add `tool()` wrappers for filesystem/document retrieval operations.
2. Output schema should include `documentsToCreate`, `documentsToFind`, `owners`, etc.
3. If the agent used `spawn_agents`, introduce `handoffs` to the subordinate agents.

### B5. WBS & scheduling tasks
Files: `createwbslevel1-agent.ts`, `createwbslevel2-agent.ts`, `createwbslevel3-agent.ts`, `identifytaskdependencies-agent.ts`, `estimatetaskdurations-agent.ts`, `wbs-populate-agent.ts`, `project-schedule-populator-agent.ts`, `project-schedule-agent.ts`, `export-gantt-*` agents.

Steps:
1. Provide `outputType` with typed arrays for tasks, durations, dependencies.
2. For export agents, attach tools that emit artifacts (e.g., `tool()` that writes CSV/Gantt file path to storage).
3. Wrap follow-on exports (CSV/Mermaid) as handoffs so the orchestrator can decide which deliverables to generate.

### B6. Team & expert validation tasks
Files: `findteammembers-agent.ts`, `enrichteammemberswithcontracttype-agent.ts`, `enrichteammemberswithbackgroundstory-agent.ts`, `enrichteammemberswithenvironmentinfo-agent.ts`, `team-markdown-document-builder-agent.ts`, `review-team-agent.ts`, `expertfinder-agent.ts`, `expertcriticism-agent.ts`, `expertorchestrator-agent.ts`.

Steps:
1. Use shared schemas for people records (define once, import across files).
2. Convert evaluation steps into structured outputs (`strengths`, `gaps`, `required_experts`).
3. Wherever expert agents call others, use `handoff()` with explicit `inputFilter` (per Handoff docs) to trim context.

### B7. Final reporting tasks
Files: `createpitch-agent.ts`, `convertpitchtomarkdown-agent.ts`, `executivesummary-agent.ts`, `review-plan-agent.ts`, `report-generator-agent.ts`, `final-report-assembler-agent.ts`.

Steps:
1. For Markdown deliverables, keep using text output but attach `artifacts` via backend when storing results.
2. Add guardrails ensuring key sections are present (set `outputType` to Zod schema with `introduction`, `risks`, `nextSteps`).

## Phase C – Cleanup after agent rewrites
1. Once every agent exports an `Agent` instance, delete unused types from `.agents/types/agent-definition.ts` and `.agents/types/tools.ts` (after confirming no other code depends on them).
2. Update `.agents/index.ts` (if present) to export the new Agent objects instead of definitions.
3. Remove `spawn_agents` references from any prompts; replace with “trigger the relevant handoff tool”.

## Quality checklist for each migrated file
1. Header comment present and updated.
2. Only imports from `@openai/agents` (or `@openai/agents-core`), shared schemas, and utilities.
3. `export default new Agent({ ... })` with:
   - `name`
   - `instructions`
   - `model`
   - `tools` (if any)
   - `handoffs` (if agent delegates work)
   - `outputType` (if structured data required)
4. No leftover `toolNames`, `spawnableAgents`, or `includeMessageHistory` properties.
5. Types compile under `npm run check`.

## Suggested workflow
1. Work stage-by-stage (Phase A first). After each stage lead, run `npm run check` to catch typing issues early.
2. Commit after each cluster to keep history reviewable.
3. Once all agents are migrated, coordinate with backend to wire new tool shims and ensure the SDK runner hands off correctly.

---
Need help? Re-read the [Agents guide](https://openai.github.io/openai-agents-js/guides/agents) for constructor options and the [Handoff class reference](https://openai.github.io/openai-agents-js/openai/agents/classes/handoff/) when modeling stage-to-task transitions.

## Implementation work plan

### Phase 0 – Planning & Scaffolding (current step)
- ✅ Document migration scope, prerequisites, and file clusters in this guide.@docs/2025-10-24-plan-openai-agents-sdk-transition.md#12-152
- ✅ Align on phased delivery approach (Phases 1–3 below).
- Deliverable: Approved plan with traceable subtasks in TODO list.

### Phase 1 – Core orchestration bridge
1. Add shared SDK tool wrappers (`read_files`, `think_deeply`, `handoff` helpers) in `server/luigi/tools.ts` and export typed adapters.
2. Convert `luigi_master_orchestrator.ts` to an `Agent` instance that references the new tool wrappers and handoffs for stage leads.
3. Migrate Analysis & Gating stage lead plus its six child task agents (`starttime`, `setup`, `redlinegate`, `premiseattack`, `identifypurpose`, `plantype`) to SDK fashion with Zod `outputType`s and tool imports.
4. Verify SDK runner integration by running `npm run check` and targeted smoke tests for Analysis stage sequences.
5. Update changelog once Phase 1 ships.

### Phase 2 – Stage lead parity
1. Iterate through remaining ten stage leads, one cluster at a time (Strategy, Context, Risk, Plan Foundation, Governance, Documentation, Team, Expert Quality, WBS/Schedule, Reporting).
2. For each cluster:
   - Define domain-specific Zod schemas and reuse shared ones where possible.
   - Map prior `spawnableAgents` entries to `handoff()` definitions.
   - Wire any required task agents (converted in Phase 3) behind feature flags to avoid runtime gaps.
3. After each cluster, run `npm run check` and commit results; keep changelog entries per cluster.
4. Deliverable: All stage leads run on SDK definitions while legacy task agents remain untouched.

### Phase 3 – Task agent migration & cleanup
1. Migrate task agents in themed batches matching Section B buckets (Context, Levers, Risks, Governance, WBS, Team, Reporting). Ensure each batch:
   - Implements typed `outputType`s and guardrails.
   - Reuses shared tool wrappers.
   - Emits artifacts in formats expected by storage/UI.
2. After every batch, execute `npm run check` and targeted validations (e.g., regenerate WBS sample output).
3. Once all batches complete:
   - Remove unused Codebuff `AgentDefinition` types and legacy helper utilities.
   - Update docs and changelog with final migration status.
   - Run end-to-end Luigi scenario to confirm parity.
4. Deliverable: Entire `.agents/luigi` tree exports SDK `Agent`s with structured outputs; legacy scaffolding retired.
