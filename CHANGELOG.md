# Changelog
<!--
 * Author: GPT-5 Codex
 * Date: 2025-10-18 00:50 UTC
 * PURPOSE: Maintain a human-readable history of notable changes for releases and audits.
 * SRP/DRY check: Pass - changelog content is centralized in one file with no duplication across docs.
-->

## [Version 0.4.12] - 2025-10-18

### Changed
- **Debate Prompt Integration:** Updated `server/routes/debate.routes.ts` and `server/providers/openai.ts` to send debate turns
  through the stored OpenAI prompt `pmpt_6856e018a02c8196aa1ccd7eac56ee020cbd4441b7c750b1`, forwarding topic, position, and
  intensity variables as strings while preserving cross-provider streaming fallbacks.
- **Provider Prompt Options:** Extended `server/providers/base.ts` prompt typings so both streaming and non-streaming calls can
  share the stored prompt reference contract across providers.

## [Version 0.4.11] - 2025-10-17

### Changed
- **Debate Jury Workflow:** Updated `client/src/pages/debate.tsx` and `client/src/components/debate/DebateControls.tsx` so debate continuations and phase controls no longer block on jury review, while keeping the reminder copy non-blocking.
- **Messaging Tone:** Softened jury-related alerts in `DebateControls` to frame annotations as optional follow-ups instead of hard requirements.

## [Version 0.4.10] - 2025-10-18

### Added
- **Debate Handshake Regression Test:** Added `tests/server/debate-handshake.test.ts` to boot the debate router with mocked
  providers, assert the POST→GET handshake, parse SSE chunks, and verify debate turn persistence through the shared storage
  layer.

### Changed
- **Legacy Debate Endpoint Hardening:** Updated `server/routes/debate.routes.ts` so direct `POST /api/debate/stream` calls return
  `410 Gone` with upgrade guidance, ensuring no caller silently reverts to the retired single-request flow.
- **Debate QA Defaults:** Preselected GPT-5 Mini (affirmative), GPT-5 Nano (negative), and the preset Topic 13 inside `useDebateSetup` so the debate
  page boots with the streaming regression fixture without extra clicks.
- **OpenAI Temperature Guardrails:** Updated `server/providers/openai.ts` to omit the `temperature` parameter for GPT-5 Responses API models while
  preserving the knob for providers that still honour it.

### Documentation
- **Streaming Validation Plan:** Captured regression goals and verification steps in
  `docs/2025-10-18-plan-debate-streaming-validation.md` for future release audits.

## [Version 0.4.9] - 2025-10-17

### Added
- **Streaming Infrastructure Modules:** Introduced `server/streaming/session-registry.ts`, `sse-manager.ts`, and `stream-harness.ts` to manage POST→GET handshakes, enrich SSE payloads with task/model metadata, and buffer reasoning/text/json deltas for final persistence.
- **Streaming Plan Artifact:** Documented the end-to-end retrofit in `docs/2025-10-17-plan-streaming-modal-alignment.md`, detailing responsibilities, SSR/DRY checks, and TODO coverage.

### Changed
- **Debate Streaming Contract:** Refactored `server/routes/debate.routes.ts` to validate payloads during `/stream/init`, verify task/model/session triads on the SSE GET route, and run OpenAI streams through the shared harness while persisting token usage, structured output, and reasoning summaries.
- **OpenAI Streaming Normalization:** Updated `server/providers/openai.ts` to route every `response.*` event through `handleResponsesStreamEvent`, accumulate structured outputs, emit status updates, and supply enriched completion metadata back to the harness.
- **Client Handshake & SSE Consumption:** Rebuilt `client/src/hooks/useAdvancedStreaming.ts` to POST the analysis payload, open an `EventSource`, aggregate reasoning/text/json buffers, expose session metadata, and surface status phases plus rich error handling to `useDebateStreaming`.
- **Storage Turn History:** Extended `server/storage.ts` debate updates to capture cost breakdowns, token usage, structured output blobs, and turn summaries while keeping in-memory totals consistent with persisted numeric strings.

### Fixed
- **Changelog Alignment:** Bumped the documented release to capture the streaming retrofit and ensure downstream audit trails remain accurate.

### Removed
- **Legacy Debate Streaming Contract:** Deleted `client/src/hooks/useDebateStream.ts` and the fallback `POST /api/debate/stream` route so the two-phase init + SSE handshake is the only supported debate streaming path.

## [Version 0.4.8] - 2025-10-17

### Fixed
- **Debate Session State Recovery:** Consolidated `useDebateSession` after conflicted merges, restored streaming bootstrap in `client/src/pages/debate.tsx`, and ensured turn history, resume context, and exports stay aligned with live streams.
- **Jury Annotation Review Enforcement:** Reinstated review gating so jury tasks remain pending until explicitly cleared, preventing debate continuations with unresolved annotations.

### Documentation
- Logged the build recovery steps in `docs/2025-10-17-plan-build-recovery.md` and outlined changelog alignment follow-up in `docs/2025-10-17-plan-changelog-alignment.md` for auditability.

## [Version 0.4.7] - 2025-10-17

### Added
- **Claude Haiku 4.5 Availability:** Registered Anthropic's Claude Haiku 4.5 across the model catalog with pricing, context window, and reasoning capability metadata.

### Changed
- **Anthropic Token Limits:** Updated `server/providers/anthropic.ts` to enforce model-specific token ceilings while respecting user overrides within documented bounds.

### Fixed
- **Debate Jury Flow Corrections:** Repaired review toggles so jurors must explicitly clear pending flags, blocked continuations while the floor is closed, and surfaced clearer gating cues in controls.
- **Export Metadata Integrity:** Propagated resolved topic text and jury annotations into markdown exports and clipboard copies for accurate transcripts.

## [Version 0.4.6] - 2025-10-17

### Fixed
- **Debate Streaming Stability:** Refactored `client/src/hooks/useAdvancedStreaming.ts` to buffer SSE reasoning/content in refs, throttle UI updates via animation frames, and harden error cleanup so React no longer drops streamed chunks during long debates.
- **SSE Heartbeats:** Added guarded writes and 15-second `stream.keepalive` heartbeats in `server/routes/debate.routes.ts` to keep reverse proxies from closing idle debate streams while preserving session persistence.

## [Version 0.4.5] - 2025-10-17

### Fixed
- **🚨 CRITICAL: Comprehensive Browser Extension Compatibility:** Fixed application crashes caused by browser extension interference (LastPass, Grammarly, etc.) across ALL streaming and chat interfaces
  - **Root Cause:** Browser extensions inject content scripts using MutationObserver to watch DOM changes. During rapid streaming updates, these observers fail when trying to observe nodes being removed/updated, causing crashes with: `"Failed to execute 'observe' on 'MutationObserver': parameter 1 is not of type 'Node'"`
  - **Comprehensive Solution:** Applied defensive programming pattern across all streaming/chat interfaces:
    - **Debate Mode** (`StreamingDisplay.tsx`, `debate.tsx`) - Streaming display + auto-scroll protection
    - **Battle Chat Mode** (`battle-chat.tsx`) - Message container + auto-scroll protection
    - **Vixra Mode** (`SectionResultsStream.tsx`) - Section generation + auto-scroll protection
    - **Luigi Mode** (`LuigiConversationLog.tsx`) - Conversation log + auto-scroll protection
  - **Defensive Pattern Applied:**
    1. Null checks before all `scrollIntoView` calls
    2. Try-catch blocks with debug logging (no error propagation)
    3. Browser extension data attributes on all dynamic content containers:
       - Grammarly: `data-gramm="false"`, `data-gramm_editor="false"`, `data-enable-grammarly="false"`
       - LastPass: `data-lpignore="true"`, `data-form-type="other"`
  - **Impact:** All streaming and chat interfaces now gracefully handle browser extension interference without crashes. Pattern is consistent and reusable for future streaming components.
  - **Commits:** 202ca41 (initial), 2c67972 (LastPass support), b67b83c (comprehensive coverage)

## [Version 0.4.4] - 2025-10-17

### Fixed
- **Debate Streaming Contract Alignment:** Added `/api/debate/stream/init` plus SSE GET handler, consolidated streaming logic, and temporarily retained the legacy POST endpoint for compatibility (subsequently removed in v0.4.9).

## [Version 0.4.3] - 2025-10-16

### Fixed
- **OpenAI Responses API Compliance:** Defaulted GPT-5 reasoning requests to detailed summaries with high verbosity, kept o-series models within supported parameters, and aligned debate streaming defaults with the richer configuration surface.
- **Streaming Lifecycle Overhaul:** Adopted the SDK's `responses.stream` helper, handled reasoning summary deltas, and finalized streams via `finalResponse()` so callbacks receive complete content, reasoning, and token usage.
- **Output Extraction Reliability:** Normalized non-streaming and streaming completions to read from `output_text`, `output_parsed`, or `output[]`, preventing empty transcripts when models emit structured results.

## [Version 0.4.2] - 2025-10-16

### Documentation
- Added a maintainer guide for running the OpenAI health check locally with private credentials and sharing sanitized results. (See `docs/2025-10-16-openai-credential-testing-guide.md`).
- Captured the credential-handling plan so contributors know why tests remain manual when API keys cannot be shared in chat.

## [Version 0.4.1] - 2025-10-15

### Fixed
- **🚨 CRITICAL: Debate Streaming Content Persistence:** Fixed fundamental bug where streamed debate content and reasoning were never saved to database
  - **Root Cause:** `updateDebateSession` was called with empty strings instead of accumulated streaming content
  - **Solution:** Updated `StreamingCallOptions` interface and OpenAIProvider to pass final content and reasoning to `onComplete` callback
  - **Impact:** Debate transcripts now properly populate with both reasoning and content from all turns
- **🚨 CRITICAL: Missing Route Import:** Fixed deployment failure from undefined `creativeRoutes` reference
  - **Root Cause:** `routes.ts` referenced `creativeRoutes` but never imported it
  - **Solution:** Added missing import statement for creative routes module
  - **Impact:** Server now starts successfully without ReferenceError during route registration

## [Version 0.4.0] - 2025-10-15

### Refactored
- **Complete Debate Mode Architecture Overhaul:** Major refactoring for improved maintainability and modularity
  - **Custom Hooks Architecture:** Extracted state management into `useDebateState`, `useDebatePrompts`, and `useDebateExport` hooks
 - **Service Layer Implementation:** Created `DebateService` class for centralized business logic (prompt generation, rebuttal building, cost calculation)
 - **Modular Component System:** Split monolithic debate.tsx into focused components:
    - `DebateTopicSelector` - Topic selection UI
    - `ModelSelector` - Model selection and configuration
    - `AdversarialLevelSelector` - Intensity selection
    - `DebateControls` - Progress display and action buttons
    - `DebateMessageList` - Message rendering with continue functionality
    - `DebateSetupPanel` - Composed setup interface
  - **Single Responsibility Principle:** Each component/hook has one clear purpose
  - **DRY Compliance:** Eliminated code duplication through reusable components
  - **Type Safety:** Full TypeScript support with proper interfaces
  - **Clean Architecture:** Separation of concerns between UI, business logic, and state management

### Improved
- **Senior Developer Feedback Implementation:** Addressed all architectural concerns for production readiness
  - **Granular State Management:** Split monolithic `useDebateState` into focused hooks:
    - `useDebateSetup` - Topic selection, model configuration, UI state
    - `useDebateSession` - Messages, rounds, response tracking, session management
    - `useDebateStreaming` - Streaming state integration with `useAdvancedStreaming`
  - **Race Condition Fix:** Moved streaming logic into mutation `onSuccess` callback, eliminating timing issues
  - **Missing Features Completed:** Implemented `loadDebateSessionsMutation` and complete session management
  - **Service Layer Refactoring:** `DebateService` now focuses on pure business logic, not React state mirroring
  - **Prop-Drilling Elimination:** Direct hook access pattern eliminates unnecessary prop passing

### Technical Details
- **File Structure:** Organized code into logical directories (`hooks/`, `services/`, `components/debate/`)
- **Maintainability:** Reduced main component complexity while preserving all functionality
- **Performance:** Better selective re-rendering with granular state management
- **Testing Ready:** Modular design enables easier unit testing of individual components
- **Future Extensions:** Architecture supports easy addition of new debate features

### Fixed
- **🚨 CRITICAL: Debate Streaming Race Conditions:** Fixed fundamental bugs where streamed responses never appeared in session logs
  - **Root Cause:** Checking `responseId` immediately after `startStream` resolves, but `responseId` only becomes available when streaming completes
  - **Solution:** Implemented proper `useEffect` hooks to handle streaming completion and message recording
  - **Impact:** Opening statements and all subsequent turns now properly recorded in debate transcript
- **🚨 CRITICAL: Session Loading Bug:** `loadDebateSessionsMutation` was defined but never invoked
  - **Solution:** Added `useEffect` to automatically load sessions on component mount
  - **Impact:** Session history now properly loads and `existingDebateSessions` state is populated

## [Unreleased]

### Added
- **Advanced Debate UI with Real-Time Streaming:** Comprehensive enhancement of the debate interface with advanced model configuration and live streaming capabilities
  - **ModelConfigurationPanel Component:** Advanced model settings with reasoning controls (effort, summary, verbosity), temperature, max tokens, and structured output options
  - **StreamingDisplay Component:** Real-time rendering of AI reasoning and content as they stream in, with progress indicators and error handling
  - **StreamingControls Component:** Comprehensive playback controls (start, pause, resume, cancel, restart) with visual feedback and status indicators
  - **useAdvancedStreaming Hook:** Proper Server-Sent Events (SSE) implementation using EventSource instead of manual fetch parsing
  - **Enhanced Debate Session Management:** Database integration for creating, saving, and resuming debate sessions with proper conversation chaining
  - **Model-Specific Configuration:** Each model can have independent settings optimized for debate performance

### Technical Details
- **Proper SSE Implementation:** Replaced manual fetch-based streaming with EventSource for reliable real-time updates
- **Database Session Persistence:** Debates are now saved to database with turn history and response ID tracking for conversation chaining

### Fixed
- **Debate Session Bootstrap Failure:** Extended the legacy `ensureTablesExist` fallback in `server/db.ts` to create the `debate_sessions` table so fresh PostgreSQL deployments no longer return 500 errors when creating debate sessions.
- **Advanced Reasoning Controls:** Full implementation of OpenAI Responses API reasoning configuration (effort, summary, verbosity)
- **Real-Time UI Updates:** Live progress bars, cost estimation, and streaming content display during debates
- **Conversation Chaining:** Proper handling of model conversation history with database-stored response IDs

### Notes
- **DRY Violations Identified:** Current debate.tsx implementation contains significant code duplication and SRP violations that should be addressed in future refactoring
- **Session Management:** Complete database integration for debate persistence and conversation chaining across sessions

### Fixed
- **Google OAuth Callback Configuration:** Documented fix ensuring production (`https://compare.gptpluspro.com/`) and staging (`https://modelcompare-staging.up.railway.app/`) deployments use environment-specific Google OAuth redirect URIs instead of the localhost default.

## [Version 0.3.0] - 2025-10-14

### Added
- **Streaming Debate Mode with Reasoning Support:** Complete implementation of real-time streaming for debate mode
  - `/api/debate/stream` endpoint with Server-Sent Events (SSE) for real-time streaming
  - OpenAI Responses API integration with `callModelStreaming` method supporting conversation chaining
  - `useDebateStream` React hook for managing streaming state and real-time UI updates
  - Updated `Debate.tsx` with response ID tracking for conversation chaining and streaming UI components
  - Database schema for `debate_sessions` table with turn history and response ID persistence
  - Storage layer methods for debate session management in both PostgreSQL and in-memory backends

### Technical Details
- **Conversation Chaining:** Each model maintains separate conversation chains using `previous_response_id`
- **Real-time UI:** Users see reasoning and content streaming in real-time during debate turns
- **Error Handling:** Comprehensive retry logic and graceful error handling for streaming failures
- **Type Safety:** Full TypeScript support with proper interfaces for streaming callbacks and options

### Notes
- Routes file (`server/routes.ts`) has syntax issues that need refactoring in a future update
- Implementation follows the architectural plan in `docs/14102025-debate-streaming-reasoning-implementation.md`

## [Version 0.2.1] - 2025-10-04

### Added
- Client-side Billing page at `/billing` with Wouter route; displays credit packages via `PricingTable` and account info
- Visible auth actions: Sign in with Google (`/api/auth/google`) and Sign out (`/api/auth/logout`)
- Clarification: Purchasing credits requires Google OAuth session; device ID users can use the app but must sign in to buy credits

### Notes
- Billing APIs remain under `/api/stripe/*`; `/billing` is a client page consuming them
- Stripe webhook body must be raw for signature verification; flagged for follow-up reliability check

## [Version 0.2.0] - 2025-10-04 06:13 AM

### Added
- **Luigi Agent Workspace Infrastructure:** Complete Phase 1-2 implementation per docs/4OctLuigiAgents.md
  - Database schema for luigi_runs, luigi_messages, luigi_artifacts tables
  - Storage layer with DbStorage (PostgreSQL) and MemStorage (in-memory) implementations
  - Luigi pipeline operations: createLuigiRun, updateLuigiRun, appendLuigiMessage, saveLuigiArtifact
  - REST API endpoints at /api/luigi/* for runs, messages, artifacts, and user interactions

### Fixed
- **🚨 CRITICAL: Storage Layer TypeScript Errors:** Fixed multiple fundamental errors in server/storage.ts
  - **Interface Violation:** Removed method implementations from IStorage interface (lines 81-291) - interfaces can only declare signatures
  - **Missing DbStorage Class:** Created complete DbStorage class for PostgreSQL operations (was referenced but never implemented)
  - **Incomplete MemStorage:** Added Luigi method implementations and Map initialization in constructor
  - **Type Mismatch Errors:** Added type assertions for Drizzle ORM inserts (7 methods) - Zod-inferred types vs. Drizzle native types incompatibility
  - Build now succeeds with 0 TypeScript errors
  
- **🔐 Authentication Endpoint 400 Error:** Fixed /api/auth/user returning 400 Bad Request
  - Endpoint required x-device-id header via ensureDeviceUser middleware
  - useAuth.ts fetch call didn't include device ID header
  - Fixed by adding manual device ID check in endpoint handler
  - Added x-device-id header to useAuth.ts fetch call
  - Both OAuth and device-based authentication now work seamlessly

- **💥 React Error #185 - Multiple Rendering Bugs:** Fixed objects being rendered as React children
  - **StatusCard timestamp:** Line 269 tried to render `Updated` object instead of formatted string
  - **LuigiStageSnapshot type:** Invalid type syntax using type as array index
  - **LuigiRunControls cost:** Incomplete cost display showing just "Cost:" with no value
  - All fixed with proper string formatting and correct type references

### Technical Notes
- **Storage Type Safety:** Using `as any` assertions on Drizzle inserts is safe because:
  - Zod validation occurs at API boundaries
  - Runtime values match database schema exactly
  - Drizzle validates column types at runtime
  - Function signatures remain type-safe
- **Device Auth Priority:** OAuth users take precedence, device users serve as fallback
- **Luigi Pipeline:** Ready for Phase 3-8 implementation (executor, frontend UI)

## [Version 0.1.1] - 2025-09-28

### Added
- **Smart Default Model Selection:** Compare page now pre-populates with 3 popular models (GPT-5 Nano, Claude Sonnet 4, GPT-4.1 Nano) to eliminate empty state and improve onboarding experience
- **Centralized Format Utilities:** Added `formatUtils.ts` for consistent cost and token formatting across all components

### Fixed
- **UI Spacing Restoration:** Restored proper UI spacing and sizing that was overly reduced, improving accessibility and usability
- **Cost Calculation Standardization:** Fixed getTotals selector logic to avoid double-counting and handle missing data properly, with centralized formatting utilities
- **AppNavigation Simplification:** Streamlined navigation component by reducing complexity from 192 lines to 53 lines while maintaining functionality

### Changed
- **Compact UI Design:** Implemented space-efficient design with ~40% reduction in vertical space usage and ~30% reduction in horizontal padding across:
  - EnhancedPromptArea: Reduced padding, smaller inputs, compact cards
  - ModelPill: 25-30% smaller padding, compact avatars and icons
  - FloatingModelPicker: Narrower popover, condensed filters, efficient layout
- **Enhanced Model Selection UX:** Dynamic "Add Models" button text changes to "Add More" when models are selected
- **Improved Onboarding Flow:** Users can immediately start typing without empty state barriers

## [Version 0.1.0] - 2025-09-28

### Fixed
- **🎨 COMPLETE COMPARE PAGE LAYOUT REDESIGN:** Comprehensive UI/UX overhaul addressing all major layout issues:
  - **Responsive Grid System:** Upgraded from rigid `xl:grid-cols-3` to adaptive `md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4` layout
  - **Viewport Management:** Implemented full-height layout with proper scrolling regions and container constraints
  - **ModelButton Enhancement:** Increased card size (`min-h-[120px]`) to eliminate text truncation, show full model names and complete pricing information
  - **Navigation Optimization:** Streamlined header height from `h-16` to `h-14` with compact logo, breadcrumbs, and theme toggle
  - **ModelSelectionPanel Redesign:** Enhanced provider grouping with visual separators, model counts, and improved action buttons
  - **PromptInput Modernization:** Larger textarea (`min-h-64`), character counter in header, and enhanced template selection UI
  - **Responsive Breakpoints:** Mobile-first design with proper container constraints and adaptive component sizing
  - **shadcn/ui Maximization:** Leveraged existing design system for consistent spacing, colors, and typography throughout

### Fixed
- **🔒 COMPLETE ZDR/GDPR COMPLIANCE IMPLEMENTATION:** Full privacy compliance with zero PII storage:
  - **Database Schema Migration:** Removed email, firstName, lastName, profileImageUrl columns (11→7 columns in users table)
  - **Stripe ID Hashing:** All Stripe identifiers (customer ID, subscription ID) hashed before storage using SHA-256
  - **Device ID Privacy:** Device IDs hashed with salt before database storage
  - **Google OAuth Redesign:** Uses Google ID as device identifier without storing any profile data
  - **Storage Layer Cleanup:** Removed getUserByEmail and all email-based user lookups
  - **Frontend Privacy:** Updated all user displays to device-based identification, removed PII components
  - **TypeScript Compliance:** Fixed null safety issues and updated all type signatures for privacy-compliant architecture
  - **Authentication Type Safety:** Enhanced Passport.js serialization/deserialization with proper Express.User interface compliance and null safety checks

### Added

- **🔍 Comprehensive E2E Health Check System:** Complete health monitoring with detailed system metrics, database connectivity checks, and provider status validation
- **📊 Model Provider Migration (xAI → OpenRouter):** Migrated Grok models from direct xAI integration to OpenRouter for improved reliability and performance
- **🏠 Dynamic Home Page System:** Complete redesign with user-focused landing experience and modular component architecture
- **👤 Device-Based Anonymous User System:** Full implementation of privacy-first user management using device fingerprinting instead of traditional authentication
- **🔐 Real Google OAuth + Stripe Integration:** Production-ready authentication and billing system replacing placeholder implementations
- **🎨 Dynamic Favicon Generation:** Client-side favicon generation system for personalized user experience
- **🛠️ Agent System Enhancements:** Expanded agent definitions and improved payment component integration
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

## 2025-10-04 02:01 - Luigi Workspace groundwork (partial)
- Added shared Luigi type definitions (shared/luigi-types.ts).
- Extended shared schema and created migration stub (luigi_runs, luigi_messages, luigi_artifacts).
- Expanded storage layer interfaces and in-memory/DB implementations for Luigi runs, messages, artifacts.
- TODO: Regenerate Drizzle meta snapshots and complete executor/API/UI phases.
- 2025-10-04 02:07 Added Luigi executor service, REST agent client, and /api/luigi routes (frontend work pending).
- 2025-10-04 10:29 Completed Luigi workspace client integration (Zustand store, API hooks, page + components).
