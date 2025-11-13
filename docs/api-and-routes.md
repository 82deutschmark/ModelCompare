<!--
File: docs/api-and-routes.md
Purpose: Single-source reference of backend API endpoints and frontend routes, including request/response shapes and notes.
How it works: Derived from the current Express routes in `server/routes.ts`, provider registry in `server/providers/`, shared types in `shared/schema.ts`, and React pages/routes in `client/src/`.
How the project uses it: As a developer and deployment reference for integrating the frontend, validating payloads, planning DB changes, and preparing Railway deployment.
Author: Cascade  GPT-5 (high reasoning)
Date: 2025-08-10
-->

# ModelCompare: API Endpoints and Frontend Routes

This document inventories the backend REST API and frontend routes in the current codebase.

- Backend: Express + TypeScript (ESM)
- Frontend: React 18 + TypeScript + Vite + Wouter
- Shared types: `shared/schema.ts`
- Port: 5000 default

Note: Providers require respective API keys in `.env`. Models are not auto-filtered based on missing keys; calling a provider without its key will fail at runtime.

---

## Backend API (Express)
Source: `server/routes.ts`, provider registry `server/providers/index.ts`, base types `server/providers/base.ts`, storage `server/storage.ts`

### GET /api/models
- Purpose: List all configured models across providers.
- Response: `ModelConfig[]`
  - Fields (from `ModelConfig`):
    - `id: string`
    - `name: string`
    - `provider: string`
    - `model: string`
    - `capabilities: { reasoning: boolean; multimodal: boolean; functionCalling: boolean; streaming: boolean }`
    - `pricing: { inputPerMillion: number; outputPerMillion: number; reasoningPerMillion?: number }`
    - `limits: { maxTokens: number; contextWindow: number }`
- Notes: Returns all models without checking keys; requests to providers lacking keys will error when used.

### POST /api/compare
- Purpose: Call multiple models in parallel with a single prompt.
- Request body (validated):
  - `prompt: string (1..4000)`
  - `modelIds: string[] (min 1)`
- Response: `{ id: string; responses: Record<string, ModelResponse | ErrorShape> }`
  - On success per model: `ModelResponse` with:
    - `content: string`
    - `reasoning?: string`
    - `responseTime: number`
    - `tokenUsage?: { input: number; output: number; reasoning?: number }`
    - `cost?: { input: number; output: number; reasoning?: number; total: number }`
    - `modelConfig?: ModelConfig`
    - `status: 'success'` (added by route)
  - On error per model: `ErrorShape` with:
    - `content: ''`
    - `status: 'error'`
    - `responseTime: 0`
    - `error: string`
- Errors:
  - 400 on Zod validation errors
  - 500 on unhandled failures

### GET /api/comparisons
- Purpose: List past comparison records (in-memory storage by default).
- Response: `Comparison[]` from `shared/schema.ts`
  - `id: string`
  - `prompt: string`
  - `selectedModels: string[]`
  - `responses: Record<string, { content: string; status: 'success'|'error'|'loading'; responseTime: number; error?: string }>`
  - `createdAt?: Date`

### GET /api/comparisons/:id
- Purpose: Retrieve a single comparison by ID.
- Response: `Comparison` or 404 `{ error: 'Comparison not found' }`

### POST /api/models/respond
- Purpose: Get a single model’s response to a prompt.
- Request body: `{ modelId: string; prompt: string }`
- Response: `ModelResponse` (no `status` field added here)
  - `content, reasoning?, responseTime, tokenUsage?, cost?, modelConfig?`
- Errors: 400 for missing fields; 500 on provider error

### POST /api/battle/start
- Purpose: Start a 2-model battle with an initial prompt and an optional challenger template.
- Request body:
  - `prompt: string`
  - `model1Id: string`
  - `model2Id: string`
  - `challengerPrompt?: string` (template with `{response}` and `{originalPrompt}`)
- Response: `{ model1Response: ModelResponse & { status: 'success' }, model2Response: ModelResponse & { status: 'success' } }`
  - Default challenger template used if not provided.
- Errors: 400 missing fields; 500 on failure

### POST /api/battle/continue
- Purpose: Continue an ongoing battle with the next model’s response.
- Request body:
  - `battleHistory: Array<{ modelId, modelName, content, ... }>` (shape depends on caller; used to build context)
  - `nextModelId: string`
  - `challengerPrompt?: string` (with `{response}`/`{originalPrompt}` placeholders)
  - `originalPrompt?: string`
- Response: `{ response: ModelResponse & { status: 'success' }, modelId: string }`
- Errors: 400 for missing history or modelId; 500 on failure

### GET /api/dashboard/config
- Purpose: Retrieve dashboard configuration settings and preferences.
- Response: Dashboard configuration object
  - `chessBoardCount: number` (number of chess boards to display)
  - `arcPuzzleCount: number` (number of ARC-AGI puzzles to display)
  - `refreshInterval: number` (milliseconds between updates)
  - `themes: string[]` (available color themes)
  - `defaultMode: 'chess' | 'arc'` (default dashboard mode)
  - `enableAnimations: boolean` (whether animations are enabled)
  - `enableFloatingNumbers: boolean` (whether floating numbers effect is enabled)
- Errors: 500 on failure

### GET /api/dashboard/metrics
- Purpose: Retrieve real-time dashboard metrics for visualization.
- Response: Dashboard metrics object
  - `accuracy: number` (system accuracy percentage)
  - `nodesEvaluated: number` (total nodes evaluated)
  - `searchDepth: string` (search depth description)
  - `evalSpeed: string` (evaluation speed)
  - `cpuUsage: number` (CPU usage percentage)
  - `memory: string` (memory usage)
  - `quantumCores: string` (quantum cores status)
  - `temperature: string` (system temperature)
  - `quantumCoeffs: object` (quantum coefficients)
  - `liveCounters: object` (live counter values)
  - `systemStatus: object` (system status indicators)
- Errors: 500 on failure

### POST /api/dashboard/config
- Purpose: Update dashboard configuration settings.
- Request body:
  - `mode?: 'chess' | 'arc'` (dashboard mode)
  - `enableAnimations?: boolean` (animation setting)
  - `refreshInterval?: number` (update interval in milliseconds)
- Response: Updated configuration object (same shape as GET)
- Errors: 500 on failure

### POST /api/generate
- Purpose: Unified generation endpoint for all modes (single source of truth).
- Request body (`shared/api-types.ts` → `GenerateRequest`):
  - `mode`: `'creative' | 'battle' | 'debate' | 'compare' | 'arc-agent' | 'plan-assessment' | 'vixra'`
  - `template: string`
  - `variables: Record<string,string>` (validated via `shared/variable-registry.ts` per mode)
  - `messages: UnifiedMessageIn[]` (reserved for future/context)
  - `seats: { id: string; model: ModelConfig; label?: string }[]` (first seat used non‑streaming)
  - `options?: { temperature?: number; maxTokens?: number; stream?: boolean }`
- Responses:
  - Non‑streaming: `GenerateResponse` with `message`, `tokenUsage`, `cost`, `resolvedPrompt`, `variableMapping`, `warnings`
  - Streaming (SSE): Events per `SSEEvents` in `shared/api-types.ts`
    - `messageStart { messageId, seatId, createdAt, resolvedPrompt }`
    - `delta { messageId, text, reasoning?, tokens? }`
    - `messageEnd { messageId, finishReason, tokenUsage, cost, resolvedPrompt, modelConfig }`
    - `error { messageId?, code, message }`
- Notes:
  - Modes are allow‑listed in `server/routes.ts`.
  - Server provides safe defaults for `tokenUsage` and `cost` when absent.
  - Variable resolution performed server‑side via `VariableEngine` with mapping/warnings.

### Template API Endpoints (Server-Side Template Processing)

### GET /api/templates
- Purpose: List all available template modes and their categories.
- Response: `{ modes: Array<{ mode: string; categories: Array<{ id: string; name: string; templateCount: number }> }> }`
- Notes: Uses compiled template cache, no client-side markdown parsing.

### GET /api/templates/:mode
- Purpose: Get all structured templates for a specific mode.
- Response: `{ mode: string; categories: Array<{ id: string; name: string; templates: StructuredTemplate[] }>; templateCount: number }`
- Error: 404 if mode not found with available modes list

### GET /api/templates/:mode/:category
- Purpose: Get all templates in a specific category within a mode.
- Response: `{ mode: string; category: { id: string; name: string; templates: StructuredTemplate[] } }`
- Error: 404 if category not found in mode

### GET /api/templates/:mode/:category/:template
- Purpose: Get a specific structured template by ID.
- Response: `StructuredTemplate` with full template structure, variables, and metadata
- Error: 404 if template not found

### POST /api/generate-structured
- Purpose: Server-side template processing with structured message arrays.
- Request body:
  - `templateId: string` (format: "category:template")
  - `variables: Record<string,string>`
  - `modelId: string`
  - `options?: { maxTokens?: number; temperature?: number; context?: string; systemInstruction?: string }`
- Response:
  - `content: string`
  - `reasoning?: string`
  - `responseTime: number`
  - `tokenUsage?: TokenUsage`
  - `cost?: Cost`
  - `modelConfig?: ModelConfig`
  - `audit: PromptAudit` (full audit trail)
  - `messageStructure: Array<{ role: string; contentLength: number }>` (message structure summary)
- Notes:
  - Templates fetched server-side by ID
  - Variables validated against template schema
  - Full audit trail logged to database
  - Message array converted to single prompt for current provider compatibility

### Audit API Endpoints

### GET /api/audits
- Purpose: Retrieve prompt audit records for research analysis.
- Query params: `templateId?: string` (filter by template)
- Response: `{ audits: Array<AuditSummary> }` with audit metadata and statistics

### GET /api/audits/:id
- Purpose: Get detailed audit record including full message structure.
- Response: Complete `PromptAudit` record or 404 error

---

## Data Shapes Summary
- `ModelConfig`: see GET /api/models fields above.
- `ModelResponse` (server/providers/base.ts):
  - `content: string`
  - `reasoning?: string`
  - `responseTime: number`
  - `tokenUsage?: { input: number; output: number; reasoning?: number }`
  - `cost?: { input: number; output: number; reasoning?: number; total: number }`
- `Comparison` (shared/schema.ts):
  - `id, prompt, selectedModels, responses, createdAt`
- `StructuredTemplate` (shared/api-types.ts):
  - `id: string`
  - `name: string`
  - `mode: ModeType`
  - `category: string`
  - `structure: { systemInstructions?: string; userTemplate: string; contextTemplate?: string; responseGuidelines?: string }`
  - `variables: VariableDefinition[]`
  - `metadata: TemplateMetadata`
- `ModelMessage` (shared/api-types.ts):
  - `role: 'system' | 'user' | 'assistant' | 'context'`
  - `content: string`
  - `metadata?: { templateId?: string; variables?: Record<string, string> }`
- `PromptAudit` (shared/api-types.ts):
  - `templateId: string`
  - `variables: Record<string, string>`
  - `resolvedSections: { systemInstructions?: string; userContent: string; contextContent?: string }`
  - `timestamp: string`
  - `messageStructure: ModelMessage[]`

---

## Frontend Routes (Wouter)
Source: `client/src/App.tsx`

- `/` → `client/src/pages/home.tsx` (Compare Mode)
- `/battle` → `client/src/pages/battle-chat.tsx` (Battle Mode, chat-room style)
- `/debate` → `client/src/pages/debate.tsx` (Dedicated manual 10-round debate UI)
- `/plan-assessment` → `client/src/pages/plan-assessment.tsx` (Planned; assesses an LLM-authored plan)
- `/vixra` → `client/src/pages/vixra.tsx` (Satirical paper generation using markdown templates)
- `/dashboard` → `client/src/pages/dashboard.tsx` (Chess AI and ARC-AGI puzzle visualization dashboard)
- Fallback → `client/src/pages/not-found.tsx`

Related pages present but not routed by default: `client/src/pages/battle.tsx`, `client/src/pages/battle-new.tsx`.

---

## Client-Side API Usage
Source: `client/src/lib/queryClient.ts`

- `apiRequest(method, url, data?)`: fetch wrapper adding JSON headers, body, credentials, and error throwing for non-OK responses.
- React Query defaults:
  - `queryFn` uses `fetch` with `credentials: 'include'`
  - `refetchOnWindowFocus: false`, `staleTime: Infinity`, `retry: false`

Pages using endpoints:
- `home.tsx`:
  - GET `/api/models`
  - POST `/api/compare`
- `battle-chat.tsx`:
  - GET `/api/models`
  - POST `/api/models/respond`
- `debate.tsx`:
  - GET `/api/models`
  - POST `/api/models/respond`
  - POST `/api/battle/continue`
- `vixra.tsx`:
  - GET `/api/models`
  - POST `/api/models/respond`
- `dashboard.tsx`:
  - GET `/api/dashboard/config`
  - GET `/api/dashboard/metrics`
  - POST `/api/dashboard/config`
- `battle.tsx` (not routed by default):
  - GET `/api/models`
  - POST `/api/battle/start`
  - POST `/api/battle/continue`

---

## Environment and Operational Notes
- Required keys in `.env` per provider: `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`, `GROK_API_KEY`, `DEEPSEEK_API_KEY`. At least one must be set to use that provider.
- Optional: `DATABASE_URL` for Drizzle migrations/CLI only. Runtime storage uses in-memory `MemStorage` (`server/storage.ts`).
- `NODE_ENV`, `PORT` (default 5000). Production serves built client from `dist/public`.
- No runtime filtering of models by missing keys; calls without keys fail at provider call time.

---

## Known Gaps / Future Enhancements
- Persist comparisons to Postgres (replace in-memory storage), wire up Drizzle runtime.
- Add model filtering based on available provider keys.
- Add streaming support where providers support it.
- Add rate limiting and more granular error codes.
