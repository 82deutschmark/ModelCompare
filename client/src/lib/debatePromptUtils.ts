/**
 * Debate prompt utilities for shared token replacement and formatting logic
 *
 * Author: GPT-5 Codex
 * Date: 2025-10-19 02:25 UTC
 * PURPOSE: Provide reusable helpers that apply lowercase debate template tokens and format opponent quotes consistently across the client.
 * SRP/DRY check: Pass - Centralizes prompt token handling without duplicating business logic in hooks or services.
 */

export type DebateTemplateReplacements = Record<string, string>;

export function applyTemplateReplacements(template: string, replacements: DebateTemplateReplacements): string {
  return Object.entries(replacements).reduce<string>((acc, [key, value]) => {
    return acc.replaceAll(`{${key}}`, value);
  }, template);
}

export function formatOpponentQuote(opponentMessage: string | null | undefined): string {
  const trimmed = opponentMessage?.trim();
  if (!trimmed) {
    return '';
  }
  return `Opponent's latest statement:\n"""\n${trimmed}\n"""\n\n`;
}
