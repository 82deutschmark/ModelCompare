/**
 * Author: Claude Code using Sonnet 4.5
 * Date: 2025-11-04
 * PURPOSE: Centralized emoji palette definitions for ARC grid and space visualizations.
 *          Separated from ARC.tsx to avoid HMR/Fast Refresh issues with non-component exports.
 * SRP/DRY check: Pass - Single responsibility for emoji palette management.
 */

// ARC-aligned space emoji palettes (each list is exactly length-10: indices 0..9)
// 0 is the explicit "empty/black" cell to avoid null handling.
export const SPACE_EMOJIS = {
  // Legacy default (backward compatibility with previous single-map implementation)
  legacy_default: ['⬛', '✅', '👽', '👤', '🪐', '🌍', '🛸', '☄️', '♥️', '⚠️'],
  // Birds - For the hardest tasks (filled to length-10)
  birds: ['🐦', '🦃', '🦆', '🦉', '🐤', '🦅', '🦜', '🦢', '🐓', '🦩'],
} as const;
