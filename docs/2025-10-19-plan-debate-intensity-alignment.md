/**
 * Author: gpt-5-codex
 * Date: 2025-10-19 00:00 UTC
 * PURPOSE: Outline adjustments to debate prompt handling so streaming payloads
 *          reuse shared intensity guidance, avoid duplicate instructions, and
 *          forward correct variables to OpenAI.
 * SRP/DRY check: Pass - Focused on debate prompt alignment tasks only.
 */

# Plan: Debate Intensity Alignment

## Goals
- Share debate prompt parsing between client and server so both derive intensity guidance from a single source.
- Ensure server streaming payloads send coherent developer/system/user messages without redundant role/topic statements.
- Provide OpenAI with textual adversarial guidance instead of numeric levels only.

## Tasks
1. Extract reusable debate prompt parser utilities into `shared/` for intensity + base template data.
2. Update client prompt generators/services to consume the shared structures (intensity descriptors, base template replacements).
3. Refactor server debate route to build developer/system/user messages from shared data, including textual intensity guidance in prompt variables.
4. Verify provider prompt variable payload matches stored prompt expectations and update documentation/CHANGELOG accordingly.
