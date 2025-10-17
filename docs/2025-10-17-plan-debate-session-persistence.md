*
* Author: gpt-5-codex
* Date: October 17, 2025 at 18:50 UTC
* PURPOSE: Outline the debate session persistence + history enhancements requested today, including session hydration, drawer UI, and export alignment.
* SRP/DRY check: Pass - Planning document consolidates scope without duplicating prior plans.
*
# Debate Session Persistence & History Plan

## Goals
- Hydrate the debate page with persisted turn history when revisiting sessions or loading from history.
- Introduce a reusable drawer component for browsing and reopening prior debates with verdict context.
- Keep debate session state, exports, and resume logic consistent with the backend `turnHistory` contract.

## Tasks
1. Extend `useDebateSession` with turn-history awareness, duplicate protection, resume helpers, and jury metadata storage.
2. Add a TanStack Query fetch for `/api/debate/session/:id` to hydrate state on selection or initial load.
3. Build a `DebateHistoryDrawer` component that surfaces recent sessions (topic, duration, cost, jury summary) with selection handling.
4. Update `debate.tsx` to wire the new query, history drawer, hydration flow, and resume logic integration.
5. Align `useDebateExport` + `exportUtils` so exports source from `turnHistory` and include jury annotations.
6. Verify debate message rendering uses shared types and reflects persisted data accurately.

## Risks & Mitigations
- **Backend placeholders**: `/api/debate/sessions` currently returns `[]`; design the UI to handle empty data gracefully while still supporting future records.
- **Duplicate message rendering**: Use response-id deduplication and turn-number ordering when merging streamed and persisted turns.
- **Missing metadata**: Defensive formatting for undefined cost/duration/jury fields to avoid runtime errors.

## Validation
- Start a debate, ensure streaming turns populate history without duplicates, and exports include the latest transcript.
- Manually mock a session payload (via query inspection) to confirm hydration and drawer reopen flows.
- Confirm clipboard export contains jury annotations when provided.
