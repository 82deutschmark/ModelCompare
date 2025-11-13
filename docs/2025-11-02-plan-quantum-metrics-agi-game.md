<!--
Author: Cascade (ChatGPT)
Date: 2025-11-02 18:35
PURPOSE: Outline the architecture and implementation plan to transform QuantumMetrics dashboard into an interactive AGI countdown mini-game, detailing state management, animation strategy, and integration touchpoints.
SRP/DRY check: Pass — new document centralizes planning without duplicating existing docs and focuses solely on implementation strategy.
-->

# Quantum Metrics AGI Countdown Game Plan

## Objective
Convert the existing `QuantumMetrics` dashboard card into an interactive mini-game where destabilizing metrics accelerate an "AGI ETA" countdown. Players must click flashing metrics to stabilize them before the countdown hits zero. Upon reaching zero, the interface should signal AGI emergence and the Singularity.

## Current Component Assessment
- **Location:** `client/src/components/dashboard/QuantumMetrics.tsx`
- **Structure:** Monolithic component handling metric state, randomized fluctuations, and static countdowns.
- **Dependencies:** React state/effects, `framer-motion`, `ArcAgiCard` wrapper.
- **Gaps for Game Play:**
  - No unified configuration for metrics (hard-coded inline JSX).
  - Countdown is tied to fixed future dates instead of interactive timers.
  - No click interactions or urgency feedback loops.

## Game Loop Concept
1. **Initialization:**
   - Countdown starts with configurable duration (e.g., 180 seconds).
   - Metrics update visually as before, but values are decoupled from gameplay urgency.
2. **Destabilization Cycle:**
   - At scheduled intervals, randomly choose metrics to enter a "flashing" state.
   - Flashing metrics contribute acceleration to countdown decay.
3. **Player Interaction:**
   - Clicking a flashing metric "stabilizes" it (animation stops, metric removed from acceleration pool).
   - Stabilizing grants a small countdown recovery and/or reduced acceleration factor.
4. **Escalation:**
   - As countdown shortens, flashing cadence increases and countdown text animates (pulse + color shift to red).
5. **End States:**
   - **Success Loop:** Player maintains countdown above zero (implicit win state, optional messaging).
   - **Failure:** Countdown reaches zero → freeze telemetry, display singularity overlay (e.g., modal/badge) and stop intervals.

## State Management Plan
| Concern | Approach |
| --- | --- |
| Metric definitions | Extract to configuration array (label, key, color, format). Enables iteration + consistent click handling. |
| Game state | `useReducer` or multiple `useState` hooks grouped logically: countdown, flashing set, destabilization timer, game status. |
| Timers | Separate effects: one for metric value jitter, one for destabilization scheduling, one for countdown tick. Clean up on unmount or game end. |
| Acceleration math | Base decay rate (e.g., 1 second per real second). Add multiplier per flashing metric; cap to prevent negative countdown. |
| Recovery mechanic | On stabilization, add small buffer (e.g., +3 seconds) and maybe play particle animation. |

## Animation & Interaction Strategy
- **Flashing Metrics:**
  - Use `motion.div` or CSS utility classes toggled by `isFlashing`.
  - Combine color shift, glow, and subtle scale to cue urgency.
- **Countdown Behavior:**
  - When acceleration > base, animate countdown text with pulsing red glow.
  - Below threshold (e.g., < 30s) intensify animation and background gradient.
- **Singularity Event:**
  - Overlay or inline banner using existing shadcn/ui primitives (e.g., `Alert`, `Dialog`) to avoid custom modal.

## Integration Touchpoints
- Retain `ArcAgiCard` wrapper for stylistic consistency.
- Preserve existing whimsical countdown cards (P vs NP etc.) but decouple AGI ETA card from fixed date.
- Ensure component remains self-contained to avoid cross-component coupling.

## Implementation Steps
1. **Refactor Metric Definitions:** Move labels/colors/formatters into data structure for iteration and shared behavior.
2. **Introduce Game State Hooks:** Implement countdown, flashing queue, and game status management with cleanup safeguards.
3. **Add Interaction Handlers:** Register click events per metric, update state, and provide feedback animations.
4. **Enhance Visual Feedback:** Apply conditionally animated classes for flashing metrics and AGI countdown urgency.
5. **Finalize Endgame UX:** Stop timers, show Singularity message, and optionally allow reset (future enhancement).
6. **Validation:** Manual play-test, ensure no memory leaks, and confirm accessibility (focus/aria where feasible).

## Open Questions / Follow-Ups
- Should stabilization provide audible feedback? (Out of scope for this iteration.)
- Do we expose a reset button for replay? (Worth adding if time permits.)
- Balance tuning (countdown length, acceleration multipliers) will require manual UX iteration.
