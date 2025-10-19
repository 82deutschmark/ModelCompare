/*
 * Author: gpt-5-codex
 * Date: 2025-10-19 01:18 UTC
 * PURPOSE: Provide case-insensitive placeholder replacement for debate templates while preserving unmatched tokens.
 * SRP/DRY check: Pass - Dedicated utility for placeholder substitution; avoids duplication across hooks/services.
 */

const PLACEHOLDER_PATTERN = /{([a-z0-9_]+)}/gi;

export function replaceTemplatePlaceholders(template: string, variables: Record<string, string>): string {
  if (!template) {
    return '';
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
