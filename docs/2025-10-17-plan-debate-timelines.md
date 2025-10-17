* Author: GPT-5 Codex
* Date: 2025-10-17 18:45 UTC
* PURPOSE: Outline approach for preserving structured streaming chunks, persisting them across debate turns, and surfacing them in new timeline/log UI elements.
* SRP/DRY check: Pass - Planning document centralizes current task scope without duplicating existing plans.

## Objectives
- Capture timestamped reasoning and content chunks during debate streaming for later analysis.
- Persist structured chunk arrays per debate turn so post-stream review features can replay them.
- Introduce UI for exploring reasoning timelines and detailed per-turn logs inside debate mode.

## Tasks
1. Extend `useAdvancedStreaming` to accumulate chunk arrays with timestamps, expose reusable chunk types, and continue deriving concatenated strings for backward compatibility.
2. Update `useDebateStreaming` to surface new chunk arrays and reset helpers, ensuring consumers can replay streams after completion.
3. Enhance `useDebateSession` to accept structured chunk payloads via `addMessage` and retain them per message for retrospective playback.
4. Build `ReasoningTimeline` component rendering synchronized reasoning/content timelines with scrubber controls and inflection point highlighting derived from chunk intensity metrics.
5. Wrap `MessageCard` for debate mode (or enhance directly) to add a "View Log" drawer showing the timeline, reasoning playback, and token/cost delta insights referencing opponent statements.
6. Integrate new components into debate UI, wiring stored chunk data into the drawer and ensuring exported data remains consistent.

## Notes
- Compute intensity heuristics using delta length over elapsed time to detect spikes.
- Maintain SRP by keeping analytics helpers in a dedicated utility function where necessary.
- Reuse existing UI primitives (Drawer, Slider, Timeline styles) to stay consistent with design system.
