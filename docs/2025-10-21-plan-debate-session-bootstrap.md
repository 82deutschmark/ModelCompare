# Debate Session Bootstrap Regression Plan
* Author: gpt-5-codex
* Date: 2025-10-21 04:30 UTC
* PURPOSE: Document the investigation and remediation steps for the debate session bootstrap regression where persisted history prevents new debates from starting cleanly.
* SRP/DRY check: Pass - Focused planning note for this regression without duplicating other plan docs.

## Context
Recent persistence work stores debate sessions and hydrates them on selection. However, starting a new session leaves the previous transcript in memory, triggering guards that block hydration and hide the new stream. Users report that “new sessions never begin,” aligning with stale local state overriding the fresh server session.

## Goals
- Ensure creating a new debate session always clears in-memory debate state while preserving the stored history list.
- Keep history drawer data intact when switching sessions or resetting the debate.
- Verify streaming still records turns and refreshes persisted metadata.

## Tasks
1. Add a dedicated `prepareForNewSession` helper inside `useDebateSession` that resets active debate state but keeps the stored session index intact.
2. Call the new helper before creating a session and when selecting history items so local transcripts reset without losing the drawer contents.
3. Update the changelog and rerun targeted checks to confirm type safety.

## Validation
- Start a fresh debate after finishing another and confirm the transcript resets and the stream begins.
- Reopen a saved session from history; ensure the drawer count remains and hydration still works.
- Run `npm run check` to cover shared TypeScript surfaces.
