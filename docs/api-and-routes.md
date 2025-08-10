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

---

## Frontend Routes (Wouter)
Source: `client/src/App.tsx`

- `/` → `client/src/pages/home.tsx` (Compare Mode)
- `/battle` → `client/src/pages/battle-chat.tsx` (Battle Mode, chat-room style)
- `/debate` → `client/src/pages/debate.tsx` (Dedicated manual 10-round debate UI)
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
