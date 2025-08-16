# ModelCompare - Claude Memory

## Project Overview
Model comparison tool with OpenAI reasoning model support.

## Recent Changes
- OpenAI reasoning models configured with "high" effort level (changed from "medium") in `server/providers/openai.ts:180`
- Build command: `npm run build` - builds both frontend (Vite) and backend (esbuild)

## Key Files
- `server/providers/openai.ts` - OpenAI provider with reasoning model support
- Reasoning models: gpt-5-2025-08-07, o3-mini-2025-01-31, o4-mini-2025-04-16, o3-2025-04-16