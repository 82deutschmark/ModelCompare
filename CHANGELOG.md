# Changelog

<!--
File: CHANGELOG.md
Purpose: Human-readable history of notable changes.
How the project uses it: Source for release notes and audit of major updates.
Author: Cascade (AI assistant)
Date: 2025-08-17
-->

All notable changes to this project will be documented in this file.

## [Unreleased]

### Fixed
- **TypeScript Null Safety & PII Removal Phase 1:** Complete resolution of TypeScript compilation errors and initial privacy compliance fixes:
  - **UserMenu.tsx:** Fixed null safety issues for email, credits, and profileImageUrl fields; replaced PII display with device-based user identification (`User XXXX` format)
  - **Stripe Integration:** Removed email dependency from payment intent creation in routes.ts and stripe.ts
  - **ModelSelector.tsx:** Fixed pricing null checks using optional chaining operators
  - **Stripe Types:** Removed invalid default export from type-only module
  - **User Display:** Updated getUserDisplayName and getUserInitials to use device ID instead of personal information
  - **Avatar System:** Replaced profile images with generic avatars, no longer storing or displaying profile pictures

### Added
- **shadcn/ui Component Modernization:** Systematic modernization of UI components using shadcn/ui design system for consistent, professional appearance:
  - **ModelButton.tsx:** Complete rewrite using Card, Badge, Tooltip, Avatar with proper provider theming and rich model information tooltips
  - **ResponseCard.tsx:** Enhanced with Alert, Skeleton, Separator, Collapsible components for better loading states, error handling, and content organization
  - **AppNavigation.tsx:** Modernized with NavigationMenu, Breadcrumb, Switch, Sheet components featuring categorized navigation (Core/Advanced/Experimental) and responsive mobile menu
  - **ExportButton.tsx:** Improved with DropdownMenu, Badge components and added JSON export functionality with better organization
  - **Home Page:** Fully modernized with centralized model configuration and consistent shadcn/ui component usage
  - **Battle Chat Page:** Partially modernized with Separator and Alert components for better content structure
- **Centralized Model Configuration:** Implemented shared/models.ts with 28 AI models across 5 providers, ModelLookup utility class, and updated API endpoints for consistency

### Fixed
- **Deployment Template Validation Error:** Fixed template validation failure during deployment by ensuring the `client/public/docs` directory containing template markdown files is copied to the Docker production container. This resolves the "Templates directory not found" error that was blocking successful deployments.

### Added
- **OpenAI Prompt ID/Version Support Plan:** Created comprehensive implementation plan in `docs/openai-prompt-id-version-plan.md` for integrating OpenAI's Prompt Templates feature using the Responses API. The plan covers:
  - Prompt ID/version execution with variable substitution
  - Backend extensions to support both text and prompt template modes
  - Frontend UI for prompt template selection and management
  - Backward compatibility with existing text-based prompts
  - Three-phase implementation strategy (Backend Core → Frontend Integration → Advanced Features)
  - Security considerations and performance impact analysis
  - Estimated 7-10 day development timeline
- **OpenAI Responses API Migration:**
  - Switched all OpenAI calls to `/v1/responses` exclusively; removed Chat Completions
  - Reasoning summaries enabled (`reasoning.summary: "auto"`) and surfaced in UI
  - Output token caps: GPT‑5 (flagship/mini/nano) `max_output_tokens = 128000`; other OpenAI models default to `16384`
  - Provider-level minimum output floor enforced at **16,300** visible tokens (env overrides cannot go lower)
  - Timeouts: default **10 minutes** (600,000 ms), configurable via `OPENAI_TIMEOUT_MS`
  - Retries: exponential backoff on HTTP 429/5xx and timeouts (up to 3 attempts)
  - Diagnostics: capture `response.id` for chaining; optional raw JSON logging via `DEBUG_SAVE_RAW`
  - Environment variables: `OPENAI_MAX_OUTPUT_TOKENS`, `OPENAI_TIMEOUT_MS`, `DEBUG_SAVE_RAW`
- **State Management & Variable System Standardization (MAJOR ARCHITECTURAL UPDATE):**
  - **Unified Variable Engine:** Implemented isomorphic variable resolution supporting server-side authoritative templates with frontend preview capabilities
  - **Single Source of Truth:** Backend now performs final template resolution with comprehensive logging and audit trails
  - **Unified API Contract:** New `/api/generate` endpoint with mode field supporting all creative modes (creative, battle, debate, compare)
  - **SSE Streaming Support:** Real-time token streaming across all modes with proper message status tracking
  - **Zustand Store Integration:** Replaced useState with optimized store using memoized selectors for large state management
  - **Variable Registry System:** Type-safe variable schemas per mode with server-side validation and auto-generated UI helpers
  - **Enhanced UnifiedMessage:** Added role, seatId, status, finishReason, streaming fields for debates, tools, and partial tokens
  - **ISO String Dates:** Eliminated Date objects in React state to prevent serialization issues
  - **Derived State Management:** currentResponse now derived via selectors from messages array preventing drift
  - **Missing Variable Policy:** Clear error handling with escaping support for literal braces in templates
  - **Legacy Route Compatibility:** Feature flags for gradual migration from existing endpoints
  - **Variable Inspector:** Development tool showing available variables, resolved values, and template validation
  - **Research Synthesis Mode:** Advanced multi-model collaborative research mode demonstrating sophisticated variable system capabilities with 11+ typed variables, multi-round synthesis, and dynamic role assignment

- **Export Functionality:** Added comprehensive markdown export and clipboard copy features across all pages (home/compare, battle-chat, debate, creative-combat) with consistent UI controls and safe filename generation

- **Vixra Mode (Satirical Papers):**
  - New page at `client/src/pages/vixra.tsx` accessible via route `/vixra`
  - **Auto Mode:** One-click automatic paper generation with intelligent section progression
  - Real-time progress tracking with pause/resume functionality
  - Automatic dependency resolution (abstract → introduction → methodology → results → discussion → conclusion → citations → acknowledgments)
  - Manual section control still available alongside auto mode
  - Uses existing model selection UI and `ResponseCard` display
  - Loads templates from `client/public/docs/vixra-prompts.md`
  - Calls existing endpoints (`GET /api/models`, `POST /api/models/respond`)

- **Prompt Parser Helper:**
  - Added `parsePromptsFromMarkdownFile(path: string)` in `client/src/lib/promptParser.ts`
  - Enables loading prompt templates from arbitrary markdown files (e.g., `/docs/vixra-prompts.md`)
  - Keeps existing `parsePromptsFromMarkdown()` (compare-prompts) unchanged

### Changed
- Documentation updates:
  - `docs/api-and-routes.md`: Added `/vixra` and `/creative` to frontend routes, documented Vixra client API usage
  - `README.md`: Documented Vixra Mode in Comparison Modes section
  - `README.md`: Documented OpenAI Responses migration, token caps (GPT‑5 128000), 16,300 minimum floor, 10-minute timeouts, retries, and env vars (`OPENAI_MAX_OUTPUT_TOKENS`, `OPENAI_TIMEOUT_MS`, `DEBUG_SAVE_RAW`)
  - `docs/openai-responses-migration-plan.md`: Finalized and aligned with implementation (Responses-only, reasoning summaries, token caps, timeouts, retries, diagnostics)
- **Prompt Input Limit:** Increased frontend prompt input capacity from 4,000 to 32,000 characters in `client/src/pages/home.tsx` and updated counters in `client/src/pages/battle-chat.tsx`. Backend body parser remains default (sufficient for this size)
- **Raw Prompt Preview:** Implemented prompt transparency widgets on all pages allowing users to view the exact prompts sent to AI models via toggle buttons with Eye icon
- **Enhanced User Experience:** Users can now select the same model for both sides in debates, providing more flexibility for testing scenarios

### Fixed
- **Railway Deployment CSS:** Resolved an issue where CSS styles were missing in the production deployment on Railway. The root cause was that `tailwind.config.ts`, `postcss.config.js`, and `components.json` were not being copied into the Docker build context. The `Dockerfile` has been updated to include these files, ensuring Tailwind CSS is processed correctly during the build
- **Prompt Variable Substitution:** Fixed template variable replacement in debate.tsx ensuring dynamic values (topics, intensity levels, roles) are properly substituted in debate prompts
- **Missing Prompt Files:** Copied battle-prompts.md and creative-combat-prompts.md to client/public/docs/ directory to ensure all pages can load their respective prompt templates
- **Battle Page Prompt Parser:** Fixed prompt template pairing issues in battle-prompts.md where "Battle Rap" and "HLE Questions" prompts were missing proper PersonX/Challenger naming conventions, preventing the parser from correctly saving previous prompts in memory and passing them to challenger responses

### Changed
- **Debate Model Selection:** Removed restriction preventing users from selecting the same model for both debate sides, allowing for self-debate scenarios
- **UI Consistency:** Standardized export button placement and styling across all comparison modes
- **Code Organization:** Enhanced component structure with clear authorship attribution and improved code documentation
- **Creative Combat Refactor:** Completely refactored creative-combat.tsx to use modular components instead of custom UI, reducing code from ~830 lines to ~460 lines while improving consistency and maintainability

### Refactored
- **Creative Combat Architecture:** Replaced 700+ lines of custom UI with established modular components:
  - **Model Selection:** Now uses `ModelButton` components with provider-grouped layout from home.tsx instead of basic `ModelSelector`
  - **Message Display:** Replaced custom response cards with `MessageCard` component for consistent display across all modes
  - **Export Functionality:** Removed custom export logic in favor of `ExportButton` component
  - **Prompt Parser:** Integrated `parseCreativePromptsFromMarkdown()` function following established patterns
  - **Variable System:** Standardized `{response}` and `{originalPrompt}` placeholder handling
  - **UI Components:** Consistent use of shadcn/ui `Card`, `Badge`, `Button` components matching other pages
- **Prompt File Structure:** Updated creative-combat-prompts.md to follow standard `## Category` / `### Original Prompt` / `### Enhancement Prompt` format for parser compatibility

*Author: Claude 4 Sonnet Thinking BYOK*
