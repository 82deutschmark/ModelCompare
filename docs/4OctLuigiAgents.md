<!--
 * Author: gpt-5-codex
 * Date: 2025-11-06T04:09:55Z
 * PURPOSE: Contextualize Luigi agent notes after ARC workspace migration and provide metadata header.
 * SRP/DRY check: Pass - adds archival context without duplicating technical guidance.
-->

> **Note (2025-11-06):** The Luigi agent implementation described here has been replaced by the ARC agent workspace. Retain as a historical reference for prior workflows.

## Progress Update
- ✅ Phase 1 (Shared Types & Database schemas) completed.
- ✅ Phase 2 (Storage layer extensions) completed.
- ✅ Phase 3 (Executor & API routes) completed.
- ✅ Phase 4-6 (Client store, hooks, UI components, page integration) completed.
- ⚠️ Phase 7-8 (Verification, changelog polish, follow-up) - **BLOCKED ON DATABASE MIGRATION DECISION**

## AUDIT FINDINGS (2025-10-04)
**Auditor**: Cascade using Claude 4 Sonnet

### Implementation Status: ✅ CORRECT
All phases were completed correctly. The research-synthesis.tsx page:
- Uses REAL components (not imaginary)
- Properly structured form with 5 fields (NOT single prompt)
- Correct API integration with TanStack Query
- Follows SRP/DRY principles
- Uses shadcn/ui correctly

### Critical Issue: ⚠️ DATABASE SCHEMA MISMATCH
**Previous developer created parallel table structure without migrating existing data.**

**Orphaned Tables (will be DELETED by db:push):**
- `plans` - 27 records
- `plan_content` - 263 records  
- `llm_interactions` - 131 records
- **Total: 421 records at risk**

**New Tables (in current schema):**
- `luigi_runs` (replaces plans)
- `luigi_messages` (replaces llm_interactions)
- `luigi_artifacts` (replaces plan_content)

**See detailed audit**: `docs/4Oct-Luigi-Audit-Report.md`

### Required Actions Before db:push
1. Examine data in orphaned tables
2. Determine if data has user/business value
3. Choose strategy: Preserve (rename), Migrate (transform), or Accept Loss
4. Document decision in changelog

---

*
* Author: Codex using GPT-5
* Date: 2025-10-04T01:41:34Z
* PURPOSE: Step-by-step implementation guide for rebuilding research-synthesis into the Luigi agent workspace using real agents and database persistence.
* SRP/DRY check: Pass - each phase targets a single responsibility with no redundant work.
* shadcn/ui: Pass - documentation only, enforces reuse of existing shadcn/ui components.

# 4 Oct 2025 - Luigi Agents Workspace Implementation Checklist

Use the phases in order. Every step references the exact files to touch or create so a junior developer can follow without additional reasoning.

---

## Phase 1 — Shared Types and Database
1. **Add shared type definitions**
   - Create shared/luigi-types.ts with request/response interfaces for Luigi runs, messages, and artifacts.
   - Export enums/constants for run status, stage identifiers (mirror .agents/LUIGI.md), and artifact types.
2. **Extend Drizzle schema**
   - Update shared/schema.ts to include new tables: luigi_runs, luigi_messages, luigi_artifacts (JSONB columns for payloads, timestamps, foreign keys).
3. **Generate migration**
   - Create migration file under migrations/ that matches the new schema (insert SQL via Drizzle format).

---

## Phase 2 — Server Storage Layer
1. **Augment storage interface**
   - Edit server/storage.ts: extend IStorage and DbStorage with methods like createLuigiRun, updateLuigiRun, ppendLuigiMessage, saveLuigiArtifact, listLuigiRuns, getLuigiRun, getLuigiMessages.
   - Ensure implementations call Drizzle with real inserts/updates—no in-memory fallbacks.
2. **Add storage helpers**
   - If needed, create server/storage/luigi-helpers.ts for run-specific transactional utilities and import them where used.

---

## Phase 3 — Server Luigi Executor & Routes
1. **Executor module**
   - Create server/luigi/executor.ts: load agent definitions from .agents/luigi, coordinate stage progression, interact with storage helpers, and surface real status updates. No mocked responses—on failure, throw descriptive errors.
2. **Route definitions**
   - Add new router file server/routes/luigi.ts exposing endpoints:
     - POST /api/luigi/runs
     - GET /api/luigi/runs/:runId
     - GET /api/luigi/runs/:runId/messages
     - POST /api/luigi/runs/:runId/replies
     - POST /api/luigi/runs/:runId/pause (optional per approval)
     - POST /api/luigi/runs/:runId/resume (optional per approval)
   - Validate payloads with Zod schemas from shared/luigi-types.ts.
3. **Hook into main router**
   - Update server/routes.ts to mount the Luigi router under /api/luigi.
4. **Request context logging**
   - Ensure executor and routes log stage transitions and tool calls using equest-context utilities.

---

## Phase 4 — Client State and Data Access
1. **Zustand or hook store**
   - Create client/src/stores/useLuigiWorkspaceStore.ts (or equivalent hook) to track active run id, stage status map, message list, artifact metadata, and UI flags (running, paused, error).
2. **API hooks**
   - Add client/src/hooks/useLuigiApi.ts providing TanStack Query hooks:
     - useCreateLuigiRun
     - useLuigiRun(runId) (polling)
     - useLuigiMessages(runId)
     - useSendLuigiReply
     - usePauseLuigiRun
     - useResumeLuigiRun
   - All hooks must call the real endpoints via piRequest from client/src/lib/queryClient.ts.

---

## Phase 5 — Client UI Components
1. **Component directory**
   - Create client/src/components/luigi/ with:
     - LuigiRunForm.tsx — input form using eact-hook-form + zod validation, emits payload to useCreateLuigiRun.
     - LuigiStageTimeline.tsx — renders stage status based on the stage list constant.
     - LuigiConversationLog.tsx — scrollable message feed using shadcn Card, ScrollArea.
     - LuigiArtifactPanel.tsx — displays artifacts with tabs or accordions.
     - LuigiRunControls.tsx — buttons for pause/resume, rerun stage (if supported), cancel.
   - Each component should consume store state and API hooks; no mock data.
2. **Styling**
   - Use existing shadcn/ui primitives; no custom UI library.

---

## Phase 6 — Page Integration
1. **Replace research page**
   - Rewrite client/src/pages/research-synthesis.tsx to assemble the new workspace layout:
     - Include AppNavigation header.
     - Layout with flex/grid splitting mission form, timeline, conversation log, and artifacts.
     - Wire actions to store and hooks.
2. **Routing/Navigation**
   - Ensure navigation links (e.g., sidebar) still point to /research and display updated title/subtitle referencing Luigi workspace.

---

## Phase 7 — Verification and Hardening
1. **Manual run-through**
   - Start dev server (
pm run dev), walk through: create run → watch stage updates → send reply → review artifacts → check persistence via DB queries or storage logs.
2. **Integration tests**
   - Add tests under 	ests/ or server/__tests__/ for /api/luigi endpoints using real executor logic.
3. **Docs update**
   - Update README or relevant docs with instructions for the Luigi workspace (optional after confirmation).

---

## Phase 8 — Finishing Tasks
1. **Git hygiene**
   - git status to confirm changed files match the checklist.
   - Stage changes: git add <files>.
   - Commit message suggestion: Add Luigi workspace infrastructure (adjust as needed for scope).
2. **Follow-up features (post-MVP)**
   - SSE streaming support if desired.
   - Enhanced history view (filters, compare runs).
   - Additional executor safeguards or analytics.

---

This checklist intentionally avoids any mock or simulated data flows. Every step drives the real Luigi agents and database integrations.



