/**
 * Author: ChatGPT-4.1
 * Date: 2025-10-25T17:52:00Z
 * PURPOSE: Integration roadmap for launching an OpenAI Agents SDK business plan workspace
 *          that composes multi-agent flows, frontend UX, and server orchestration in
 *          ModelCompare without duplicating Luigi legacy code.
 * SRP/DRY check: Pass – focuses solely on planning the business plan agent workspace
 *                integration using existing modular patterns.
 */

# Business Plan Workspace – Agents SDK Integration Plan

## 1. Objectives
- Deliver a hobby-scale "Business Plan" workspace that guides users from idea to actionable plan using OpenAI Agents SDK agents.
- Reuse Luigi domain insights where valuable, but author fresh agent logic under `agents-sdk/` to meet SRP/DRY mandates.
- Maintain production-ready quality (tool validation, tracing, error handling) while keeping implementation lightweight for a solo dev.

## 2. Target Experience
1. **Workspace Entry (UI)**
   - New route `/workspace/business-plan` exposed via navigation.
   - Form captures vision, market, constraints, desired deliverables, and optional research links.
   - Run state view shows agent reasoning, outputs, artifacts, and allows user replies for clarifications.
2. **Agent Orchestration (Server)**
   - Starter agent normalizes user brief, seeds mission context, and triggers staged handoffs.
   - Stage leads cover: Market Research, Product Definition, Financial Snapshot, Go-to-Market, Risk & Mitigation.
   - Each stage agent can hand off to specialist agents (e.g., assumptions validator) or call tools (filesystem, web search if enabled later).
3. **Outputs**
   - Final Markdown package with sections: Executive Summary, Market, Product, Financials, GTM, Risks, Next Steps.
   - Optional structured JSON for exporting key metrics.

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
- `shared/context.ts`: mission metadata, researcher notes, prior artifacts.
- `shared/schemas/business-plan.ts`: Zod schemas for section outputs, ensuring structured responses.
- `shared/tools`: reuseable `read_files`, `summarize_directory`, `calc_metrics`, and future web search adapters.

### 3.2 Server integration
- Extend `server/luigi/openai-sdk-runner.ts` to support a new "business plan" mission template: map run type to orchestrator instructions and handoffs.
- Add storage helpers for business-plan runs (can reuse Luigi tables with new `runType = 'business-plan'` flag or create dedicated tables if separation desired).
- Introduce `BusinessPlanRunner` wrapper mirroring `LuigiExecutor` but configured for Agents SDK only (no REST fallback).
- Register new REST endpoints under `server/routes/business-plan.routes.ts` exposing:
  - `POST /api/business-plan/runs` create + start run
  - `GET /api/business-plan/runs/:id` poll status
  - `POST /api/business-plan/runs/:id/reply` feed user clarifications
  - `POST /api/business-plan/runs/:id/cancel`

### 3.3 Frontend integration
- Add Zustand store `useBusinessPlanStore` mirroring Luigi run state but scoped to new endpoints.
- Create components under `client/src/components/business-plan/` for run form, progress timeline, and section outputs, leaning on shadcn/ui building blocks for consistent UI.
- Hook TanStack Query for run polling and mutation handling, reuse toast/alert primitives for errors.

### 3.4 Sessions, handoffs, and guardrails
- Use Agents SDK sessions instead of manual history tracking; `Runner.run` handles loops and tool invocation.
- Configure `maxTurns` per stage (default 4) with guardrail checks before expensive handoffs to prevent runaway loops.
- Guardrails examples:
  - Input validation: ensure market size numbers parse and fall within expected ranges.
  - Output validation: enforce presence of required markdown headings via regex + schema checks.
  - Human-in-loop: optional approval step before final financial projections using `pause()` + resume semantics.

### 3.5 Tooling and tracing
- Enable tracing via OpenAI dashboard by propagating `traceId` from API responses into logs.
- Provide developer toggle (`TRACE_BP_RUNS=true`) to log detailed agent events locally.
- Add smoke test script `tests/business-plan/orchestrator-smoke.test.ts` to verify orchestrator returns structured output without external APIs (mock tool responses only where unavoidable).

## 4. Implementation Phases
### Phase A – Foundations (1–2 days)
1. Confirm Node runtime (>=22) + install `@openai/agents` & `@openai/agents-realtime` if voice support considered.
2. Scaffold `agents-sdk/business-plan` directories with header comments.
3. Implement shared context, schemas, and base tools (read files, summarize notes, metrics helper).
4. Build orchestrator skeleton + stage lead placeholders returning TODO outputs but respecting schema types.
5. Wire `BusinessPlanRunner` on server, add endpoints, integrate storage reuse.
6. Create docs + smoke test harness verifying orchestrator handshake.

### Phase B – Stage authoring (2–4 days)
1. Flesh out each stage lead and tasks with rewritten instructions derived from Luigi knowledge base.
2. Implement tool usage (`read_files`, `summarize`, computed KPIs) and guardrail checks per stage.
3. Add structured JSON output aggregator for cross-stage data (e.g., assumptions, financial metrics).
4. Expand smoke tests + targeted unit tests for schema validation errors.

### Phase C – Frontend workspace (2 days)
1. Build business plan workspace page: form, run view, section cards, user reply modal.
2. Leverage existing components (`ResponseCard`, `Timeline`) where possible; extract shared UI into `client/src/components/agents-sdk/` if duplication emerges.
3. Implement polling via TanStack Query, integrate toasts, and allow export of final markdown/JSON.

### Phase D – Polish (1 day)
1. Connect tracing toggles, add logging, and document runbook in `docs/`.
2. Run `npm run check`, `npm run test` for regression coverage.
3. Update `CHANGELOG.md` and announce feature in release notes.

## 5. Open Questions & Decisions
1. **External research tools** – Should we integrate web search (requires MCP/web tool) in Phase B or defer?
2. **Storage strategy** – Reuse Luigi tables with `runType` flag vs. new tables? Impact on migrations minimal but needs confirmation.
3. **Realtime voice** – Is voice plan authoring valuable for hobby scope? Default to text-only unless requested.
4. **Pricing awareness** – Agents SDK charges per call; need simple cost summary in UI (reuse existing cost card?).

## 6. Next Steps
1. Approve this integration plan and settle open questions (tools, storage reuse, voice support).
2. Begin Phase A foundation tasks and ensure `.env` contains required Agents SDK keys.
3. Schedule milestone check after Phase B to verify stage outputs meet hobby user expectations.
