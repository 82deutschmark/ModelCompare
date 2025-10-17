<!--
 * Author: GPT-5 Codex
 * Date: 2025-10-17 19:45 UTC
 * PURPOSE: Capture recovery plan after sloppy merge to restore working build by auditing debate streaming state, refactoring corrupted hooks, and validating frontend compilation.
 * SRP/DRY check: Pass - Single document describing plan; no existing duplicate for this build recovery plan.
-->

# Build Recovery Plan — Debate Streaming Merge Fix

## Situation
- `npm run build` fails on `client/src/pages/debate.tsx` due to malformed effect introduced during merge.
- Supporting hook `client/src/hooks/useDebateSession.ts` shows duplicated imports and conflicting implementations, indicating further breakage.
- Need to ensure debate streaming flow, jury state, and resumable sessions behave consistently after cleanup.

## Objectives
1. Restore TypeScript compilation for debate mode files.
2. Verify `useDebateSession` exposes a single, coherent API without duplicated logic.
3. Reconfirm debate streaming UI wires messages, turn history, and jury metadata without regressions.
4. Deliver deployable build and record key decisions.

## Tasks
1. Audit `debate.tsx` streaming initialization effect and repair the message bootstrap logic while preserving SRP (page coordinates subcomponents only).
2. Refactor `useDebateSession.ts`:
   - Remove duplicated imports/definitions, consolidate state hooks, and ensure helper functions (e.g., `addMessage`, `hydrateFromSession`) remain idempotent.
   - Validate jury annotation helpers reset correctly on message updates.
3. Cross-check other debate hooks/services for similar merge artifacts; adjust as required to keep responsibilities isolated.
4. Run `npm run build` to confirm frontend compiles; follow with smoke `npm run test` if time permits.
5. Summarize fixes and highlight follow-up opportunities in final response.

## Risks & Mitigations
- **Hidden Merge Damage**: Additional files may contain subtle duplicates. Mitigate via targeted scans once primary fixes compile.
- **State Regression**: Adjustments to `addMessage`/`setMessages` could alter UI behavior. Mitigate with careful adherence to prior API expectations and review of dependent components.
- **Time Overrun**: File length is large; keep refactor scoped to removing duplication and reinstating clear responsibilities.

## Definition of Done
- `npm run build` succeeds without warnings beyond known Browserslist notice.
- Debate hooks export stable signatures consumed by existing components.
- Final summary delivered with architectural rationale and suggested next steps.
