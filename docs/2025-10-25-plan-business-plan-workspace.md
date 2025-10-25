/**
 * Author: ChatGPT-4.1
 * Date: 2025-10-25T17:52:00Z
 * PURPOSE: Integration roadmap for launching an OpenAI Agents SDK business plan workspace
 *          that composes multi-agent flows, frontend UX, and server orchestration in
 *          ModelCompare without duplicating Luigi legacy code.
 * SRP/DRY check: Pass – focuses solely on planning the business plan agent workspace
 *                integration using existing modular patterns.
 */

# Business Plan Workspace – Agents SDK One-Person Blueprint

## 1. Goals (Solo Hobby Scope)
- Build a "Business Plan" workspace for personal use that quickly turns a project idea into a structured plan using OpenAI Agents SDK agents.
- Pull inspiration from Luigi prompts when helpful, but write clean, focused agents under `agents-sdk/` to stay DRY.
- Keep the build fast and pragmatic: minimal ceremony, no migrations, just enough structure for dependable runs.

## 2. Desired Workflow
1. **Kickoff UI**
   - Single-page route `/workspace/business-plan` with a short form for idea summary, target audience, constraints, revenue thoughts, and optional notes/links.
   - After submission, show a compact run view with live markdown output, short reasoning snippets, and inline edit buttons for clarifications.
2. **Agent Flow**
   - Primary orchestrator agent reads the form, builds a mission brief, then hands off to focused stage leads (Market, Product, Financials, Go-to-Market, Risks).
   - Stage leads can call a small tool set (`read_files`, `summarize_text`, basic calculators) and hand off to micro agents when deeper dives are needed.
3. **Results**
   - Final markdown doc with headings: Executive Summary, Market, Offering, Financial Snapshot, Launch Approach, Risks & Mitigations, Next Steps.
   - Bonus JSON payload with key bullet lists for quick copy/paste into other docs.

## 3. Architectural Fit
### 3.1 Directory layout (Agents SDK)
```
agents-sdk/
  business-plan/
    orchestrator/
      business-plan-orchestrator.ts
    stages/
      market/
        market-stage-lead.ts
        tasks/
          opportunity-scan.ts
          competitor-scan.ts
      product/
      financials/
      go-to-market/
      risk/
    shared/
      schemas/
        business-plan.ts
      tools/
        index.ts
        summarize-files.tool.ts
      context.ts
```
- `shared/context.ts`: stores the mission brief, latest user clarifications, and reusable scratchpad data.
- `shared/schemas/business-plan.ts`: Zod schemas for each output section so agents stay on format.
- `shared/tools`: bundle `read_files`, `summarize_text`, simple KPI calculator, and leave space for optional web search later.

### 3.2 Server wiring
- Reuse the existing Luigi SDK runner logic: add a simple branch that loads the business-plan orchestrator from `agents-sdk/business-plan`.
- Store runs in the same tables with a `runType: 'business-plan'` flag to avoid migrations.
- Expose a minimal API surface:
  - `POST /api/business-plan/runs` → create & start run (returns runId + first output chunk).
  - `GET /api/business-plan/runs/:id` → fetch latest output + status.
  - `POST /api/business-plan/runs/:id/reply` → send clarifications, immediately triggers another SDK run.
  - Skip cancel endpoint for now; manual cleanup is fine for a hobby project.

### 3.3 Frontend bits
- Lightweight Zustand store `useBusinessPlanStore` with fields: currentRunId, status, markdown, sectionsJSON, agentNotes.
- Components:
  - `BusinessPlanForm` (shadcn `Card`, simple form). Submit action kicks off run.
  - `BusinessPlanRunView` showing markdown preview + small reasoning panel.
  - `ClarificationModal` for post-run tweaks.
- Use TanStack Query for a polling hook (`useBusinessPlanRunQuery(runId)` every 3–5s).
- Toast errors via existing notification helper.

### 3.4 Sessions & guardrails
- Agents SDK sessions automatically manage history—no custom persistence required.
- Set `maxTurns` to 3 per stage to keep loops cheap.
- Guardrails to implement now:
  - Validate numeric inputs before using them in summaries.
  - Enforce markdown headings via schema checks to avoid empty sections.
- Skip human approval pauses; unnecessary for solo runs.

### 3.5 Tooling sanity
- Keep logging simple: record runId, stage name, and reported cost.
- Optionally capture the `traceId` when debugging; otherwise skip.
- Add one Vitest smoke test that instantiates the orchestrator with stubbed tools and checks schema compliance.

## 4. Build Checklist
1. Ensure Node ≥22. Install `@openai/agents` and `zod@3`.
2. Scaffold `agents-sdk/business-plan` files per layout above; add prompt instructions.
3. Implement shared schemas and tools (`read_files`, `summarize_text`, `calc_unit_economics`).
4. Write orchestrator + stage leads returning `{ markdown, jsonSummary }`.
5. Wire orchestrator into `openai-sdk-runner.ts`; expose API routes (`create`, `status`, `reply`).
6. Build UI page + Zustand store; hook polling to the endpoints.
7. Add a Vitest smoke test to ensure schema compliance.
8. Run end-to-end once, adjust prompts until output feels right.

## 5. Notes & Nice-to-Haves
- Web search tools are optional; add later if needed.
- Voice mode is unnecessary; stick to text responses.
- Log token usage from SDK for personal cost awareness.
- Update `CHANGELOG.md` when satisfied.
