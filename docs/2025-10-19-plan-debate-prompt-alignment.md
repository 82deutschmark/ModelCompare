<!--
 * Author: GPT-5 Codex
 * Date: 2025-10-19 02:15 UTC
 * PURPOSE: Outline corrective actions to realign debate prompt generation with the updated lowercase token contract.
 * SRP/DRY check: Pass - Planning document scoped solely to debate prompt remediation steps.
-->

# Plan: Debate Prompt Token Alignment

## Objective
Restore functional debate prompt generation by syncing client-side template substitution with the recently lowercased variable contract documented in `client/public/docs/debate-prompts.md`.

## Tasks
1. Review `useDebatePrompts` and `DebateService` to catalog all uppercase placeholder substitutions and fallback templates that still reference `{RESPONSE}`/`{ORIGINAL_PROMPT}`.
2. Update prompt construction logic to use `{role}`, `{position}`, `{topic}`, and `{intensity}` consistently, ensuring memoized values propagate without direct service access.
3. Refactor rebuttal prompt assembly so opponent quotes are embedded explicitly (since `{response}` is deprecated) while maintaining debate context integrity.
4. Refresh associated comments/documentation (including changelog entry) to note the token realignment and ensure future maintainability.

## Validation Strategy
- Rely on unit or integration tests already covering debate flows if available; otherwise, perform targeted local verification of prompt outputs within the React components/services.
- Confirm no runtime code paths retain uppercase tokens or legacy placeholders by searching the codebase post-change.
