<!--
Author: Cascade using GPT-4.1
Date: 2025-11-04 22:02 UTC-05:00
PURPOSE: Outline approach to port debate reasoning controls into Vixra mode while keeping single-model UX lightweight.
SRP/DRY check: Pass - Focused plan document for one feature addition.
-->

# Vixra Reasoning Controls Integration Plan

## Goal
Add the reasoning configuration controls (effort, summary, verbosity, reasoning toggle, temperature, max tokens) currently available in Debate mode to the Vixra page so users can tune model behavior before generating sections.

## Current State Assessment
- Vixra uses `useVixraPaper` for author/category/model state; no reasoning config stored.
- `PaperSetupCard` shows basic inputs and optional title, but no advanced model controls.
- Generation calls `/api/models/respond` with `{ modelId, prompt }`, so no reasoning parameters reach the backend.
- Server route `/api/models/respond` proxies to `callModel(prompt, modelId)` which discards extra options.

## Implementation Tasks
1. **State Layer**
   - Extend `useVixraPaper` to hold a `ModelConfiguration` (reusing debate defaults) and expose update actions.
   - Persist settings during session; default to reasoning enabled for reasoning-capable models.
2. **UI Integration**
   - Reuse `ModelConfigurationPanel` inside `PaperSetupCard` advanced section, adapting labels for single-model workflow.
   - Ensure controls disable while generating and respect selected model capabilities (temperature support, reasoning flag).
3. **Transport Updates**
   - Update `/api/models/respond` route to accept optional reasoning/text config, passing through `CallOptions` to providers.
   - Adjust `callModel` helper and dependent services to support the optional options argument without breaking existing callers.
4. **Client Requests**
   - Include configuration payload in Vixra mutation requests so server receives the selected reasoning effort, summary, verbosity, temperature, and max tokens.
5. **Validation & UX**
   - Guard reasoning controls for non-reasoning models (disable toggle, hide effort selectors when unsupported).
   - Confirm exports still behave (config only affects generation, not markdown assembly).

## Risks / Mitigations
- **Provider Compatibility**: Some models ignore reasoning options. Mitigate by mirroring Debate normalization logic server-side.
- **Route Regression**: Other modes rely on `/api/models/respond`; ensure schema change is backward compatible (options optional).
- **UX Clutter**: Keep advanced panel collapsible and reuse existing styling to avoid overwhelming users.

## Definition of Done
- Vixra advanced panel exposes reasoning controls matching Debate semantics.
- Generated sections respect selected effort/summary/verbosity (verified via manual test with reasoning model).
- All `/api/models/respond` consumers continue to function.
- Plan and changelog updated.
