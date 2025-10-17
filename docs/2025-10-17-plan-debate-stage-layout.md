<!--
 * Author: gpt-5-codex
 * Date: 2025-10-17 18:37 UTC
 * PURPOSE: Planning document outlining tasks to restructure debate stage layout and related state.
 * SRP/DRY check: Pass - dedicated planning artifact without code duplication.
-->
# Debate Stage Layout & Session Enhancements Plan

## Objectives
- Introduce a dedicated DebateStageLayout and supporting UI components for timeline, live floor, and jury bench zones.
- Extend debate session state to track Robert's Rules phases and persist jury scoring metadata.
- Update controls to manage new phase transitions and enforce scoring completeness before advancing.

## Tasks
1. Audit existing debate page layout, session hook, and controls to understand current responsibilities.
2. Design new layout component structure under `client/src/components/debate/` including `DebateStageLayout`, `DebateStageTimeline`, `JuryScoreCard`, and supporting utilities.
3. Extend `useDebateSession` state machine: add phase tracking, selectors (`getCurrentPhase`, `isFloorOpen`), and persistence for jury annotations.
4. Implement `DebateStageTimeline` to visualize current phase, speaker order, timers, and gavel indicators.
5. Build `JuryScoreCard` with point adjustments, quick tags, and verdict notes syncing to session state.
6. Refactor `DebateControls` to include phase advancement, floor toggles, and validation for unresolved jury tasks.
7. Replace page-level grid with `DebateStageLayout`, wiring child components with updated session selectors and controls.
8. Update exports/session persistence logic if required to include jury annotations.
9. Run relevant lint/type checks and validate UI interactions locally.
