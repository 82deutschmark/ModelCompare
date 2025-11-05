<!--
Author: Cascade (GPT-4.1)
Date: 2025-11-04 19:06 UTC-05:00
PURPOSE: Capture the implementation plan for integrating the DoDo cyber-ornithic dashboard module into the ARC page layout with SRP-aligned tasks.
SRP/DRY check: Pass - dedicated planning artifact separate from code changes to avoid duplication.
-->

# DoDo Module Integration Plan

## Goal
Embed a cyber-ornithic DoDo research panel alongside existing ARC dashboard cards, delivering animated pseudo-scientific telemetry that complements the Primary Descriptor.

## Tasks
1. Design a reusable `DoDo` dashboard card in `client/src/components/dashboard/DoDo.tsx` using SRP-friendly state management and animation similar to `QuantumMetrics`.
2. Replace the placeholder markdown table with structured data rendering (modules, derived relations, legend) and add ambient destabilization visuals.
3. Update `ARC.tsx` layout so the new DoDo card appears left of the Primary Descriptor on wide screens while remaining responsive.
4. Refresh documentation: changelog entry and testing notes once UI verified.

## Considerations
- Reuse animation patterns (Framer Motion, reducer) from `QuantumMetrics` to stay DRY.
- Ensure typography matches neon cyberpunk theme and card components (`ArcAgiCard`).
- Provide accessibility-friendly layout and maintain hobby-level performance (avoid heavy computations).

## Validation
- Manual visual QA in development build (no automated tests affected).
- Confirm linting/typecheck unaffected via `npm run check` if time permits (optional).
- Verify changelog and commit trail reflect the enhancement.
