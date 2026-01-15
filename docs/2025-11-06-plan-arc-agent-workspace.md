<!--
 * Author: gpt-5-codex
 * Date: 2025-11-06T03:58:00Z
 * PURPOSE: Outline plan for transforming research synthesis page into ARC agent workspace leveraging Luigi agent stack.
 * SRP/DRY check: Pass - planning document only, no code duplication.
-->
# Plan: ARC Agent Workspace Transition

## Goal
Reposition the former research synthesis surface into a production-ready ARC agent workspace that orchestrates ARC puzzle solving via the new OpenAI Agents-powered Luigi stack.

## Tasks
1. **Rename Page & Navigation**
   - Replace `/research-synthesis` route and navigation copy with `/arc-agent` labeled "ARC Agent Workspace".
   - Update page component filename to reflect new purpose.

2. **Redesign Workspace Form**
   - Introduce ARC-centric inputs (task ID, training pairs JSON, evaluation grid, workspace goals, notes).
   - Validate JSON structure client-side to keep submissions clean.
   - Map cleaned payload into Luigi create-run request.

3. **Adapt Store & Hooks**
   - Update workspace store types/defaults for new fields.
   - Ensure run submission and state transitions remain intact using existing Luigi hooks.

4. **Server Contract Updates**
   - Update shared Luigi types and server validation schema to accept ARC payload.
   - Expand executor prompt builder to include structured ARC puzzle context for orchestrator.
   - Adjust stage catalogue to ARC solving phases for accurate timeline rendering.

5. **UI Copy & Telemetry**
   - Refresh hero copy, status cards, and reply placeholders to reference ARC agent operations.
   - Keep timeline, conversation, and artifact panels but ensure messaging matches ARC nomenclature.

6. **Documentation & Changelog**
   - Record changes in CHANGELOG with semantic version bump.
   - Summarize workspace purpose shift in docs if needed.
