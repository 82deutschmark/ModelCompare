# Debate Page Loop Regression Plan

## Goal
Identify and resolve the new regression causing the debate page to re-render endlessly after the recent hydration fix.

## Context
- Commit `c3276fe` added guards around debate session hydration but introduced a dependency loop in the debate page effect.
- React now reports a maximum update depth error and the debate view becomes unresponsive.
- The effect rehydrates on every local state change, so we must stop redundant hydration triggers while preserving freshness checks.

## Tasks
1. Inspect the debate hydration effect dependencies and confirm which values are causing repeated executions.
2. Introduce a stable snapshot guard (e.g., last hydrated signature) so identical payloads are ignored.
3. Trim the dependency array to only the values that should legitimately trigger hydration.
4. Validate the fix by running `npm run check` and manually reasoning through hydration flows (new session, resume session, in-flight stream).

## Verification
- Debate page no longer crashes or loops when session details refetch.
- Streaming updates continue hydrating when the server turn history advances.
- TypeScript check passes without new warnings.
