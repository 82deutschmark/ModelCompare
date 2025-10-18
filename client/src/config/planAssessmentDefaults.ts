/**
 * Author: gpt-5-codex
 * Date: 2025-10-18 21:06 UTC
 * PURPOSE: Centralizes the default plan assessment model trio so multiple
 *          pages/components can share the same seed selection without
 *          duplicating literal model identifiers.
 * SRP/DRY check: Pass - Single responsibility (export default IDs),
 *                avoids hard-coding values across pages.
 */

export const PLAN_ASSESSMENT_DEFAULT_MODEL_IDS = [
  "gpt-5-mini-2025-08-07",
  "gpt-5-nano-2025-08-07",
  "claude-haiku-4-5-20251015",
] as const;

export type PlanAssessmentDefaultModelId =
  (typeof PLAN_ASSESSMENT_DEFAULT_MODEL_IDS)[number];
