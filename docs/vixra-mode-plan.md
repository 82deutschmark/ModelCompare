<!--
File: docs/vixra-mode-plan.md
Purpose: Planning document for adding a new "Vixra" mode to generate long-form satirical research papers suitable for arXiv/viXra submissions.
How it works: Defines goals, UX, variables, staged generation pipeline, model selection logic, prompt strategy, API/UI changes, and export/assembly. Serves as the single source of truth for implementation tasks across client and server.
How the project uses it: Guides updates to `shared/variable-registry.ts`, `server/routes.ts` (`/api/generate` allow-list), provider usage, and a new client page `client/src/pages/vixra.tsx` with staged orchestration. Also informs README/CHANGELOG updates.
Author: Cascade (Windsurf)
Date: 2025-08-17
-->

# Vixra Mode — Feature Plan

## Goals
- __Satirical long-form paper generation__: Produce very long, coherent, tongue-in-cheek research papers on esoteric metaphysical topics intersecting ML/AI/AGI/GenAI/Hyperdimensional Computing.
- __Maximize token budgets__: Prefer models with the largest `limits.maxTokens` and `limits.contextWindow`; UI lists models from smallest to largest to highlight growth.
- __Staged multi-model workflow__: Chain models: metadata + long intro → table of contents → section 1 → section 2 → …; pass `{context}` + `{response#}` between stages.
- __Optional image/diagram generation__: If the chosen model supports images/SVG, include figures/diagrams (e.g., Claude SVG blocks, GPT image tool where available) and reference them in text.
- __Export to PDF__: Reuse existing export components to save `.md`; optionally route to a PDF service later. For now, instruct users to convert MD → PDF (consistent with viXra advice).  We want users to be able to extract the entire chain of responses, format them correctly, add the generated images/diagrams, and then convert to PDF. And save the final PDF.
- __Submission helper__: Collect inputs mapping to viXra-style form fields; assemble a final PDF-ready markdown with front matter.

## User Inputs (Variables)
Collected via the Vixra page and validated via `shared/variable-registry.ts`:
- `ResearcherName` (string, required)
- `Collaborators` (string, optional; comma-separated)
- `Email` (string, optional; not published unless included in content)
- `ScienceCategory` (enum; see list below)
- `Title` (string, required)
- `Authors` (string, required; ordered as submission wants)
- `Abstract` (string, optional; can be auto-generated in Stage 0 if left blank)
- `NumPages` (number, optional; hint only)
- `Comment` (string, optional; technical notes/license)
- `OtherInstructions` (string, optional)
- `PromptMode` (enum: `"custom" | "template"`)
- `CustomPrompt` (string, required if `PromptMode=custom`)
- `TemplateKey` (string, required if `PromptMode=template`; user-provided list of silly templates will live in `client/public/docs/vixra-prompts.md`)
- `TargetSections` (number, default 6; number of body sections excluding intro)
- `IncludeImages` (boolean, default true)

Science Category options (subset of viXra list; full list can be added verbatim):
- Physics - High Energy Particle Physics; Quantum Gravity and String Theory; Relativity and Cosmology; Astrophysics; Quantum Physics; Nuclear and Atomic Physics; Condensed Matter; Thermodynamics and Energy; Classical Physics; Geophysics; Climate Research; Mathematical Physics; History and Philosophy of Physics
- Mathematics - Set Theory and Logic; Number Theory; Combinatorics and Graph Theory; Algebra; Geometry; Topology; Functions and Analysis; Statistics; General Mathematics
- Computational Science - DSP; Data Structures and Algorithms; Artificial Intelligence
- Biology - Biochemistry; Physics of Biology; Mind Science; Quantitative Biology
- Chemistry; Humanities (Archaeology; Linguistics; Economics and Finance; Social Science; Religion and Spiritualism); General Science and Philosophy; Education and Didactics

## Model Selection & Ordering
- __Listing__: UI lists available models sorted ascending by `limits.maxTokens`, then by `limits.contextWindow`. This satisfies “smallest to largest” display.
- __Selection__: User can pick a single primary model or a pipeline of multiple models (recommended). Warn if any selected provider has no API key (best-effort UX only).
- __Token strategy__: Default `options.maxTokens` per stage set to 90% of the selected model’s `limits.maxTokens`, capped to provider limits, with gentle warning if near cap.

## Staged Generation Pipeline
Staging orchestrated client-side via calls to `/api/generate` with `mode: 'vixra'`. The server is authoritative for prompt resolution.

**Auto Mode Support**: Added automatic section progression that eliminates manual stage management. When enabled:
- Automatically detects next eligible section based on dependencies
- Provides real-time progress tracking with pause/resume functionality  
- Respects dependency chain: abstract → introduction → methodology → results → discussion → conclusion → citations → acknowledgments
- Users can switch between auto and manual control at any time

Stages (each stage appends to an aggregated manuscript state):
1. __Stage 0—Metadata & Long Introduction__
   - Inputs: User variables; optional `CustomPrompt` or resolved template.
   - Output: Title (confirm/normalize), author line, abstract (generate if missing), and a very long, coherent introduction.
   - Constraint: Respond only with intro + front matter; no TOC or sections yet.
2. __Stage 1—Table of Contents__
   - Inputs: `{context}` = Stage 0 content; `{response0}`.
   - Output: Detailed TOC with N body sections and subsections, including placeholder figure captions if `IncludeImages`.
3. __Stage 2..(N+1)—Body Sections__
   - For each section i in 1..N:
     - Inputs: `{context}` = full manuscript so far; `{response1}`..`{response(i)}`.
     - Output: Section i with deep technical satire, citations-styled references, and foreshadowing later sections for coherence.
     - If `IncludeImages` and model can: emit inline SVG blocks or image prompts + alt text.
4. __Stage N+2—Conclusion & References__
   - Output: Grand conclusions, future work, and a references section (fabricated but stylistically consistent) plus acknowledgements (collaborators).
5. __Stage N+3—Abstract (if user left blank)__
   - Summarize the manuscript; keep it consistent with conclusions.

At each stage, pass `{context}` and numbered `{response#}` placeholders to maintain continuity.

## Prompt Strategy (High-Level)
- __System framing__: “You are an eccentric but rigorous researcher writing an elaborate satirical paper for viXra/arXiv.”
- __Safety rails__: Each stage’s prompt forbids doing other stages’ work prematurely; reiterate constraints.
- __Variables__: Inject `ResearcherName`, `Collaborators`, `ScienceCategory`, `Title`, `Authors`, `NumPages`, `IncludeImages` flags, etc.
- __Templates__: Store silly templates in `client/public/docs/vixra-prompts.md` with headings compatible with existing parsers (Category/Prompt blocks). Users can choose template or custom text.

## Image/Diagram Handling (Optional)
- __Capability detection__: Use `ModelConfig.capabilities` to gate image/SVG instructions.
- __Claude__: Encourage inline SVG figures fenced in code blocks labeled as SVG; collect and sanitize.
- __OpenAI/GPT-5 (if available)__: If image tool is accessible via provider, request diagram descriptions; store links or data URIs only if supported by provider. Otherwise, keep as captions and TODOs.
- __Figure references__: Insert “Figure X: …” anchored in text.

## Assembly & Export
- __Manuscript format__: Assemble a single markdown document with front matter:
  - Title, Authors (comma-separated), Abstract, Keywords (optional), TOC, Sections, Conclusion, References, Acknowledgements.
- __Export options__: Reuse existing export components to save `.md`; optionally route to a PDF service later. For now, instruct users to convert MD → PDF (consistent with viXra advice).
- __ViXra form mapping__: Display a summary panel mapping:
  - Title → Title of Paper
  - Authors → Author(s)
  - Abstract → Abstract
  - NumPages → Number of pages (hint)
  - Comment → Comment
  - OtherInstructions → Other instructions
  - PDF: advise to upload or link, per viXra guidance

## API & Server Changes
- __Allow-list new mode__: Add `'vixra'` to `/api/generate` mode validation in `server/routes.ts`.
- __Variable schema__: Register `vixra` in `shared/variable-registry.ts` with the variables above, defaults, and help text.
- __Prompt resolution__: Add prompt templates for stages in server-side template registry (or reuse existing templating infra). Ensure `{context}` and `{response#}` expansion via `VariableEngine`.
- __Model ordering__: No server change required; client sorts from GET `/api/models` using `limits`.

## Client/UI Changes
- __New route__: `/vixra` page `client/src/pages/vixra.tsx`.
- __Form__: Fields listed in Variables section with validation; template picker or custom prompt.
- __Model selection__: Multi-select with visible ordering (smallest → largest). Display max tokens/context per model row.
- __Orchestration__: Run stages sequentially; show progress chips (Intro → TOC → Sec 1..N → Conclusion → Abstract).
- __Auto Mode__: Toggle switch enabling one-click complete paper generation with real-time progress tracking
- __Manual Control__: Traditional section-by-section generation with dependency validation
- __Preview__: Collapsible preview of assembled manuscript after each stage. "Show Raw Prompt" toggle for transparency.
- __Export__: Reuse `ExportButton` to save the final manuscript.

## Edge Cases & Policies
- Missing API key → warn before run; allow user to proceed (calls may fail per provider).
- Token overflows → truncate gracefully with a warning badge and suggestion to reduce N or pick larger models.
- Early content leakage (e.g., writing TOC during Intro) → instruct model again; optionally re-run the stage.
- Determinism: Set temperature default low (e.g., 0.2) for coherence; user adjustable.

## Milestones
1. __Docs & scaffolding__ (this doc; add empty `client/public/docs/vixra-prompts.md`).
2. __Server__: allow-list mode, variable schema, stage templates.
3. __Client__: new page, form, orchestration, export.
4. __Optional__: image handling enhancements.
5. __Docs__: README, CHANGELOG updates; usage guide.

## Acceptance Criteria
- New `/vixra` page can collect required inputs and run at least Intro → TOC → 2 sections → Conclusion.
- Uses `/api/generate` with `mode: 'vixra'` and resolves variables server-side.
- Models are listed smallest → largest by `limits.maxTokens` then `limits.contextWindow`.
- Final exportable markdown contains all elements and maps to viXra form fields.
- No provider-specific features are required to function; image generation is best-effort.
