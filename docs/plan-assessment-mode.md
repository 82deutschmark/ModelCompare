<!--
Title: Plan Assessment Mode – Architecture & Implementation Plan
Author: GPT-5 (medium reasoning)
Date: 2025-08-17

What this file is: A technical plan to add a new mode and page that lets one LLM assess the plan produced by another LLM, supporting iterative software/system architecture planning.
How it works: Defines a new mode "plan-assessment" built on the unified variable system and /api/generate endpoint. Specifies variable schema, prompts, UI, and backend hooks.
How the project uses it: As the source of truth for implementing the Plan Assessment page, variable registry, prompt templates, and minimal backend adjustments.
-->

# Plan Assessment Mode (Iterative Architecture Planning)

A dedicated mode and page that enables one LLM (Assessor) to evaluate, score, and recommend revisions to a plan produced by another LLM (Author). Supports iterative loops: Assess → Revise → Re‑Assess.

## Objectives

- Provide a focused workflow for evaluating AI-generated plans (software/system/architecture).
- Standardize assessment variables (criteria, severity, context) using the unified variable system.
- Reuse `/api/generate` and shared UI components (`MessageCard`, `ModelButton`, `ExportButton`).
- Enable transparent prompt templating with `VariableEngine` and optional streaming later.

## User Scenarios

- Assess a plan pasted as Markdown.
- Assess a prior response from Compare/Battle/Debate (select message to import as plan).
- Iterate revisions: apply Assessor feedback, re-run assessment, track rounds and scores.

## Mode Key and Routing

- Mode key: `plan-assessment`
- Frontend route: `/plan-assessment`
- Page file: `client/src/pages/plan-assessment.tsx`
- Prompt templates: `client/public/docs/plan-assessment-prompts.md`

## Variable Registry (server + shared)

Add a new registry entry in `shared/variable-registry.ts`:

- `planMarkdown` (string, required): The authored plan under review (Markdown/plaintext).
- `assessmentCriteria` (enum, required): `['architecture','requirements','risk','delivery','security','operations','overall']`
- `contextSummary` (string, optional): Business/technical context to consider.
- `constraints` (string, optional): Key constraints (time, budget, compliance, tech stack).
- `iterationRound` (number, default '1'): Assessment pass count.
- `assessorRole` (enum, required): `['chief-architect','principal-eng','sre-lead','security-architect','product-ops']`
- `tone` (enum, required): `['concise','direct','balanced','thorough']`
- `scoringScale` (enum, required): `['1-5','1-10']`
- `actionability` (enum, required): `['must-fix','should-fix','nice-to-have','mixed']`
- `projectScale` (enum, required): `['hobby','indie','startup','enterprise']` – Right-size recommendations based on intended project scale; avoid over‑engineering for small projects.
- `ownerModelName` (string, optional): Name of the model that authored the plan (for context only).

Validation: enforce enums and numeric type; warn on missing optional context.

## Prompt Template Spec

Create `client/public/docs/plan-assessment-prompts.md` with sections:

- `## System – Assessor Persona` – Defines the evaluator’s perspective based on `assessorRole`.
- `## Evaluate Plan` – Primary instruction using variables:
  - `{planMarkdown}`
  - `{assessmentCriteria}`
  - `{contextSummary|}` and `{constraints|}` (defaults empty)
  - `{scoringScale}`, `{tone}`, `{actionability}`, `{iterationRound}`, `{projectScale}`
- `## Output Format` – Require a structured textual report (no code snippets) with:
  - Findings (bullets), Scores per criterion, Risk table (High/Med/Low), Must/Should/Nice actions, Summary verdict, Next-steps checklist.

Note: Maintain the project rule “Do not use code snippets” in template language. Emphasize pragmatic guidance for `projectScale` = hobby/indie (simplicity, low ops, pragmatic security). Include enterprise controls only when `projectScale` = enterprise.

## Backend Integration

- Update `/api/generate` mode allow-list in `server/routes.ts` to include `'plan-assessment'`.
- Reuse `VariableEngine` final resolution on server.
- No new provider interfaces required—seat(s) determine assessor model.
- Consider adding `aliases` only if migrating old placeholders; not required initially.

## Frontend Page Design (`client/src/pages/plan-assessment.tsx`)

- Reuse components:
  - Model selection: `ModelButton` with single-seat minimum (one assessor).
  - Plan input: large textarea/markdown editor for `{planMarkdown}`.
  - Controls for enums and options (criteria, role, tone, scale, iteration).
  - Preview of resolved prompt with VariableInspector: `shared/variable-inspector.ts`.
  - Results display: `MessageCard` for assessor output (content + reasoning when present).
  - Export: `ExportButton` for Markdown export of assessment.
- State:
  - Local form state for variables; derive current response from messages (selector pattern).
  - Submit via `/api/generate` non-streaming initially; SSE optional later.

## Data Flow

1. User selects assessor model and fills variables.
2. Template is previewed with `VariableEngine.renderPreview` (client) and fully resolved on server.
3. Submit `GenerateRequest` with `mode: 'plan-assessment'`, `template`, `variables`, `seats`.
4. Display `GenerateResponse.message` in `MessageCard` and update totals if available.
5. On iteration, increment `{iterationRound}` and re-submit with updated `{planMarkdown}` or constraints.

## Iteration Loop Pattern

- Round N: Assess plan → Produce findings, scores, actions.
- User applies revisions (outside or inline paste) → Round N+1 with updated `{planMarkdown}`.
- Maintain a simple history list on the page for each round’s score/verdict.

## Acceptance Criteria

- New route `/plan-assessment` renders and allows selecting an assessor model.
- Submitting a non-empty `{planMarkdown}` returns a structured assessment (no code snippets).
- Variable validation errors are shown before submit; server provides safe messages.
- Export writes a Markdown report containing round number, scores, and actions.

## Implementation Tasks

- Add `plan-assessment` to `VARIABLE_REGISTRIES` in `shared/variable-registry.ts`.
- Permit `'plan-assessment'` in `server/routes.ts` allow-list for `/api/generate`.
- Create `client/public/docs/plan-assessment-prompts.md` with the specified sections.
- Implement `client/src/pages/plan-assessment.tsx` using existing components.
- Wire to `/api/generate` (non-streaming first). Add SSE later if needed.
- Optional: “Import from previous message” utility to pull a prior response as `{planMarkdown}`.
- Docs: add short entries to `README.md` and `CHANGELOG.md` after feature is merged.

## Telemetry & Observability (Optional)

- Log variable mapping and warn on missing optional context.
- Track assessment duration and seat model used.
- Redact secrets in logs (none expected in this mode by default).

## Risks & Mitigations

- Prompt length: Large plans may exceed context windows → guide users to summarize; use shorter assessor outputs.
- Overly generic feedback: Provide clear output format in prompts and role-specific personas.
- User confusion with other modes: Clear navigation label “Plan Assessment (LLM reviews LLM plan)”.

## Timeline (Incremental)

- Day 1: Registry + backend allow-list + prompts file.
- Day 2: Page skeleton + model selection + form controls + non-streaming call.
- Day 3: VariableInspector + export + iteration history.

## Open Questions

- Do we need multi-seat comparisons (two assessors) side‑by‑side? Default to one; extend later.
- Should we persist iteration history beyond the page session? Current storage is in‑memory.

---

This plan adheres to the unified variable system, minimizes backend surface area, and reuses existing components to deliver a focused LLM‑assesses‑LLM planning workflow.
