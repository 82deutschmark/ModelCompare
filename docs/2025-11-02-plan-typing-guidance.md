<!--
Author: Cascade (GPT-4.1)
Date: 2025-11-02T20:03:00-05:00
PURPOSE: Outline objectives, context, and tasks for adding slow-typing guidance text to the ARC AGI prompt interface.
SRP/DRY check: Pass - Documentation file focused solely on planning this UI enhancement.
-->

# Plan: ARC Prompt Interface Typing Guidance

## Goal
Enhance the `/arc-agi` prompt textarea with a looping slow-typing guidance message to reinforce the parody dashboard vibe without altering backend logic.

## Context
- Change is limited to `PromptInterface.tsx` UI behavior.
- Animation should only appear when the prompt is empty.
- Must respect existing aesthetic (glow, motion) while remaining lightweight.

## Tasks
1. Inspect current prompt interface animation utilities and state handling.
2. Implement looping slow-typing overlay with cleanup to avoid timer leaks.
3. Document work (this plan + changelog) for traceability.

## Risk & Mitigation
- **Timer leaks**: clear timeouts when prompt receives input or component unmounts.
- **Visual clutter**: keep text subtle via opacity cycling consistent with neon theme.

## Definition of Done
- Empty prompt shows animated guidance typing "please enter or think your message here".
- Typing guidance disappears immediately once user types.
- Plan file created and changelog updated with new semantic version entry.
