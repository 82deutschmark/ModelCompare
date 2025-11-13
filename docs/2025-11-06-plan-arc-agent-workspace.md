<!--
Author: gpt-5-codex
Date: 2025-11-06T03:49:34Z
PURPOSE: Outline tasks to convert the research synthesis page into an ARC agent workspace leveraging new agent modules.
SRP/DRY check: Pass - planning document segregating scope without duplicating implementation details.
-->
# Plan: ARC Agent Workspace Transition

## Goals
- Replace the outdated Research Synthesis Luigi workspace with an ARC-focused agent workspace experience.
- Integrate the newest agent orchestration modules (OpenAI Agents SDK bridge) to execute ARC puzzle tasks in-app.
- Refresh routing, navigation, and shared mode metadata to reflect the new workspace identity.

## Tasks
1. **Server Agent Runtime**
   - Introduce ARC agent types, storage hooks, and executor built on the OpenAI Agents SDK pipeline to solve ARC puzzles.
   - Expose REST endpoints for creating runs, polling status/messages/artifacts, and posting user feedback consistent with Luigi contract semantics.
2. **Shared Types & Schema Updates**
   - Add shared ARC workspace type definitions (runs, puzzles, transcripts) and update schema/constants as needed.
   - Ensure enums referencing the old research-synthesis mode are renamed to the ARC workspace identifier.
3. **Client State & Hooks**
   - Create Zustand store and React Query hooks dedicated to ARC runs, mirroring Luigi ergonomics while handling ARC-specific payloads.
   - Implement adapters that call the new REST endpoints and manage polling intervals and optimistic updates.
4. **Agent Workspace Page**
   - Rename the page to `agent-workspace.tsx` (or equivalent) and rebuild layout to showcase ARC mission setup, puzzle feed, agent reasoning transcript, and artifact viewer.
   - Utilize latest shadcn/ui primitives and agent components for a cohesive workspace experience.
5. **Navigation & Documentation**
   - Update routes, navigation entries, and API mode metadata to reference the new ARC workspace path and description.
   - Document the new workspace behaviour in CHANGELOG and verify all references to research-synthesis are updated.

## Risks / Considerations
- Ensure backward compatibility for stored runs or provide migration/cleanup steps if Luigi data structures differ.
- Validate that OpenAI Agents SDK integration respects environment configuration and timeouts similar to Luigi executor.
- Coordinate UI polling intervals to avoid excessive load on new endpoints.

## Verification
- Run `npm run build` (or targeted lint/type checks) after implementation.
- Manually test ARC agent workflow end-to-end in local dev to confirm run creation, updates, and artifact rendering.
