/*
 * Author: gpt-5-codex
 * Date: 2025-10-19 00:00 UTC
 * PURPOSE: Provide case-insensitive placeholder replacement helpers that can be
 *          shared across client and server modules for debate prompt assembly.
 * SRP/DRY check: Pass - Focused utility for template substitution only.
 */

const PLACEHOLDER_PATTERN = /{([a-z0-9_]+)}/gi;

export function replaceTemplatePlaceholders(template: string, variables: Record<string, string>): string {
  if (!template) {
    return "";
  }

  if (!variables || Object.keys(variables).length === 0) {
    return template;
  }

  const normalized = new Map<string, string>();
  for (const [key, value] of Object.entries(variables)) {
    normalized.set(key.toLowerCase(), value);
  }

  return template.replace(PLACEHOLDER_PATTERN, (match, rawKey) => {
    const resolved = normalized.get(String(rawKey).toLowerCase());
    return resolved !== undefined ? resolved : match;
  });
}
