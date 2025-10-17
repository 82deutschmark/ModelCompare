<!--
File: README.md
Purpose: Primary developer/operator documentation for architecture, setup, and usage.
How it works: Summarizes stack, routes, APIs, environment, and workflows. Serves as onboarding doc.
Author: Cascade (AI assistant)
Date: 2025-08-17
-->

# AI Model Comparison Tool

A sophisticated web application for comparing responses from multiple AI models simultaneously. Built with React, TypeScript, and Express, supporting all major AI providers with real-time response comparison and analysis.

## Architecture Overview

### Core Technology Stack
- **Frontend**: React 18 + TypeScript + Vite for development/building
- **Backend**: Express.js + TypeScript with ES modules
- **Database**: PostgreSQL with Drizzle ORM (with in-memory fallback)
- **Styling**: Tailwind CSS + shadcn/ui component library
- **State Management**: Zustand store with TanStack Query for server state
- **Variable System**: Unified template engine with server-side resolution
- **Routing**: Wouter for lightweight client-side routing
- **Streaming**: Server-Sent Events (SSE) for real-time AI responses with browser extension compatibility (v0.4.5)

### State Management Architecture

**Variable Resolution System**
- **Isomorphic Engine**: Shared template resolution between frontend preview and server execution
- **Single Source of Truth**: Server performs authoritative variable substitution with audit logging
- **Type-Safe Registry**: Mode-specific variable schemas with validation and auto-generated UI
- **Migration Support**: Backward compatibility with alias mapping (e.g., `{RESPONSE}` → `{response}`)

**Unified API Design**
- **Single Endpoint**: `/api/generate` handles all modes (creative, battle, debate, compare)
- **Streaming Support**: Real-time SSE events for token-by-token updates
- **Legacy Compatibility**: Feature-flagged legacy routes during transition period

**Store Architecture**
- **Zustand Integration**: Optimized state management replacing useState patterns
- **Derived State**: Computed values via selectors prevent drift and enable streaming
- **Message-Centric**: UnifiedMessage format supports debates, tools, and streaming status

### Project Structure

```
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── lib/            # Utility libraries and configurations
│   │   ├── pages/          # Page components (routing)
│   │   └── types/          # TypeScript type definitions
├── server/                 # Backend Express API
│   ├── services/           # Business logic and external integrations
│   ├── routes.ts           # API route definitions
│   ├── storage.ts          # Data persistence interface
│   └── index.ts            # Server entry point
├── shared/                 # Shared types and schemas
└── attached_assets/        # Static assets and generated images
```
## Model Source of Truth

All AI model configurations, capabilities, pricing, and specifications are maintained in the modular provider system located in `server/providers/`. This serves as the single source of truth for:

### Latest Model Versions (Updated: August 10, 2025)
- **OpenAI**: GPT-5 (flagship model), GPT-4.1 series, o3/o4 reasoning models
- **Anthropic**: Claude Sonnet 4, Claude 3.7 Sonnet, Claude 3.5 series
- **Google**: Gemini 2.5 Pro/Flash, Gemini 2.0 Flash series  
- **xAI**: Grok 4 (reasoning), Grok 3 series variants
- **DeepSeek**: R1 Reasoner (CoT), V3 Chat

### Model Capabilities Tracked
- **Reasoning**: Full chain-of-thought support with visible reasoning logs
- **Multimodal**: Text and image input processing capabilities
- **Function Calling**: Tool use and API integration support
- **Streaming**: Real-time response generation support

### Provider-Specific Features
- **OpenAI**: **OpenAI models use Responses API (`/v1/responses`) exclusively** - Proactive migration completed October 2025 (ahead of mid-2026 Completions API deprecation). Full reasoning support with `reasoning.summary = "auto"` for GPT-5, o3/o4 series
- **Anthropic**: Structured reasoning with `<reasoning>` tags for Claude 3.7/4
- **Google**: Thinking budget configuration for Gemini 2.5 models
- **xAI**: Advanced reasoning capabilities in Grok 4
- **DeepSeek**: Complete reasoning transparency via `reasoning_content` field

#### 🔄 OpenAI Responses API Proactive Migration (October 2025)

> **PROACTIVE MIGRATION**: As of October 2025, ModelCompare exclusively uses OpenAI's modern **Responses API (`/v1/responses`)**. While OpenAI's legacy Chat Completions API **remains supported until mid-2026**, we've migrated early to ensure forward compatibility and unlock advanced reasoning capabilities.

**Migration Details:**
- **Endpoint**: All OpenAI calls use the Responses API (`/v1/responses`) exclusively; Chat Completions API is **NOT USED** in this codebase
- **Reasoning Support**: Requests include `reasoning.summary = "auto"` for GPT-5 and o-series models; UI displays full reasoning summaries
- **Output Token Caps**:
  - GPT‑5 series (flagship, mini, nano): `max_output_tokens = 128000`
  - All other OpenAI models default to `max_output_tokens = 16384`
  - Global minimum floor of **16,300** visible output tokens enforced at provider level (env overrides cannot go lower)
- **Timeouts**: Default request timeout is **10 minutes** (600,000 ms), configurable via `OPENAI_TIMEOUT_MS`
- **Retries**: Exponential backoff on HTTP 429/5xx and timeouts (up to 3 attempts for reliability)
- **Content Parsing**: Primary content from `response.output_text`; reasoning from `response.output_reasoning.summary` with safe fallbacks
- **Conversation Chaining**: Response IDs (`response.id`) captured for multi-turn debates and conversations
- **Diagnostics**: Optional raw JSON logging via `DEBUG_SAVE_RAW` environment variable for debugging

### API Integration Architecture

All AI providers are abstracted through a unified modular provider system that:

1. **Normalizes Request Format**: Converts internal prompt format to provider-specific API calls
2. **Handles Authentication**: Manages API keys securely through environment variables
3. **Implements Error Handling**: Provides graceful degradation when providers fail
4. **Tracks Performance**: Measures response times for comparison
5. **Supports Concurrency**: Makes parallel API calls for efficient comparison

### Provider Configuration

Each provider requires specific environment variables:
- `OPENAI_API_KEY` - OpenAI API access
- `ANTHROPIC_API_KEY` - Anthropic Claude access
- `GEMINI_API_KEY` - Google Gemini access
- `GROK_API_KEY` - xAI Grok access
- `DEEPSEEK_API_KEY` - DeepSeek access

#### OpenAI Responses Configuration (Environment)

- `OPENAI_MAX_OUTPUT_TOKENS` (optional)
  - Overrides default caps above. A provider-level floor of 16,300 is always enforced.
- `OPENAI_TIMEOUT_MS` (optional)
  - Overrides default 10-minute timeout.
- `DEBUG_SAVE_RAW` (optional)
  - When set, enables saving raw OpenAI Responses JSON for diagnostics.

## Data Architecture

### Database Schema (`shared/schema.ts`)

The application uses a flexible schema supporting both PostgreSQL and in-memory storage:

```typescript
// Core comparison result storage
export const comparisons = pgTable('comparisons', {
  id: text('id').primaryKey(),
  prompt: text('prompt').notNull(),
  selectedModels: text('selected_models').array().notNull(),
  responses: json('responses').$type<Record<string, ModelResponse>>().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
```

### Storage Interface

The `IStorage` interface in `server/storage.ts` provides:
- **CRUD Operations**: Create, read, update, delete comparisons
- **Type Safety**: Full TypeScript support with Drizzle ORM
- **Fallback Support**: Automatic fallback to in-memory storage
- **Session Management**: PostgreSQL-backed user sessions

## Core Features

### Comparison Modes

**Compare Mode** (`/`)
- Side-by-side model response comparison
- Multi-model selection with provider grouping
- Real-time response timing and cost tracking
- Export and raw prompt preview functionality

**Battle Chat Mode** (`/battle`)
- Interactive chat-style model comparison with unlimited model seats
- Turn-based conversation analysis with proper prompt memory persistence
- PersonX/Challenger prompt template system for dynamic rebuttals
- Challenger prompts automatically receive previous responses and original prompts

**Debate Mode** (`/debate`)
- Structured 10-round AI debates between models with **real-time streaming** (v0.4.4+)
- Topic selection with adversarial intensity levels (1-10)
- Same-model debate support for self-analysis scenarios
- Automated debate progression with manual turn-by-turn controls
- **Advanced Streaming Features**:
  - Server-Sent Events (SSE) for real-time reasoning and content display
  - `/api/debate/stream` endpoint with init + stream contract
  - Conversation chaining using OpenAI Responses API `response.id` tracking
  - Database session persistence with turn history
  - Model-specific configuration (reasoning effort, temperature, max tokens)
  - Live progress indicators and cost estimation during generation

**Creative Combat Mode** (`/creative`)
- Sequential creative editing workflow
- Multiple AI models enhance content iteratively
- Editorial pass tracking and version comparison
- Manual model selection for each enhancement round

**Vixra Mode** (`/vixra`)
- Generate satirical academic-style papers with template-driven sections
- **Auto Mode**: One-click generation of complete papers with automatic section progression
- Intelligent dependency resolution (abstract → introduction → methodology → results → discussion → conclusion)
- Real-time progress tracking with pause/resume functionality
- Manual section control still available alongside auto mode
- Uses the same model selection UI and `ResponseCard` display as Compare mode
- Loads templates from `client/public/docs/vixra-prompts.md`
- Calls existing endpoints (`GET /api/models`, `POST /api/models/respond`)

### Universal Features

**Export Functionality**
- Comprehensive markdown export across all modes
- One-click clipboard copy for easy sharing
- Safe filename generation for downloaded files
- Session metadata and timing information included

**Raw Prompt Preview**
- Transparency widgets showing exact prompts sent to models
- Toggle visibility with Eye icon controls
- Template variable substitution preview
- Debugging and prompt optimization support

### Browser Extension Compatibility (v0.4.5)

**Problem Solved:** Browser extensions (LastPass, Grammarly, etc.) were causing application crashes during streaming operations due to MutationObserver interference.

**Comprehensive Solution Applied:**
- **All Streaming Modes Protected**: Debate, Battle Chat, Vixra, and Luigi modes now include defensive programming against browser extension interference
- **Defensive Pattern**:
  - Null checks before all `scrollIntoView` operations
  - Try-catch blocks with debug logging (no error propagation)
  - Browser extension opt-out data attributes on all dynamic content containers
- **Extensions Supported**:
  - Grammarly: `data-gramm="false"`, `data-gramm_editor="false"`, `data-enable-grammarly="false"`
  - LastPass: `data-lpignore="true"`, `data-form-type="other"`
- **Impact**: All streaming and chat interfaces now gracefully handle rapid DOM updates without crashes, even with multiple browser extensions active

**Technical Details:** Browser extensions inject content scripts using `MutationObserver` to watch DOM changes. During rapid streaming updates, these observers can fail when trying to observe nodes being removed/updated, causing crashes. Our defensive pattern prevents these failures from affecting the user experience.

## Frontend Architecture

### Modular Component Architecture

The application follows a strict modular component approach to ensure consistency and reusability across all modes:

#### Core Reusable Components
- **`AppNavigation`** - Unified navigation header with theme toggle
- **`ModelButton`** - Enhanced model selection with provider colors, capabilities, and cost info
- **`MessageCard`** - Universal message display for all modes (responses, reasoning, costs)
- **`ExportButton`** - Standardized export functionality (markdown, clipboard)
- **`ThemeProvider`** - Global dark/light mode management

#### Component Hierarchy

```
App (Theme Provider + Router)
├── AppNavigation (consistent across all pages)
├── Home Page (Compare Mode)
│   ├── ModelButton[] (provider-grouped with quick actions)
│   ├── PromptInput (template system integration)
│   └── ResponseCard[] (individual model responses)
├── Battle Chat Page
│   ├── ModelButton[] (same selection UI)
│   └── MessageCard[] (turn-based conversation display)
├── Debate Page
│   ├── ModelButton[] (consistent model selection)
│   └── MessageCard[] (structured debate display)
├── Creative Combat Page
│   ├── ModelButton[] (reused provider-grouped layout)
│   └── MessageCard[] (creative pass evolution)
└── ThemeProvider (light/dark mode support)
```

#### Design Principles
1. **Consistency**: All pages use the same `ModelButton` layout and `MessageCard` display
2. **Reusability**: Components are designed to work across different modes
3. **Type Safety**: Shared TypeScript interfaces ensure compatibility
4. **No Duplication**: Custom UI is avoided in favor of existing components

### State Management Pattern

The application uses TanStack Query for all server state:
1. **Model Loading**: `useQuery` for fetching available models
2. **Comparison Execution**: `useMutation` for submitting prompts
3. **Cache Management**: Automatic invalidation and refetching
4. **Loading States**: Built-in loading and error state handling

### Form Handling

React Hook Form with Zod validation provides:
- **Type-safe Forms**: Schema-driven validation
- **Real-time Validation**: Immediate feedback
- **Performance**: Minimal re-renders
- **Accessibility**: ARIA compliance

## Backend Architecture

### API Design

RESTful endpoints with clear responsibilities:

```
# Core Comparison
GET  /api/models           # Fetch available AI models
POST /api/compare          # Submit prompt for comparison
GET  /api/comparisons/:id  # Retrieve specific comparison

# Debate Mode (with streaming)
POST /api/debate/session      # Create new debate session
GET  /api/debate/sessions     # List existing debate sessions
POST /api/debate/stream       # Initialize debate streaming (SSE)
GET  /api/debate/stream       # Stream debate responses (SSE)

# Model Responses
POST /api/models/respond      # Get single model response
```

### Request/Response Flow

1. **Model Selection**: Frontend fetches available models
2. **Prompt Submission**: User input validated and submitted
3. **Parallel Processing**: Backend calls multiple AI APIs simultaneously
4. **Response Aggregation**: Results collected and formatted
5. **Real-time Updates**: Frontend receives formatted responses

### Error Handling Strategy

Multi-layered error handling:
- **Provider Level**: Individual API failures don't affect others
- **Request Level**: Validation errors return 400 with details
- **Server Level**: Unexpected errors return 500 with safe messages
- **Client Level**: UI shows specific error states per model


## Development Workflow

### File Modification Guidelines

1. **Shared Types First**: Always update `shared/schema.ts` for data model changes
2. **Backend Implementation**: Implement storage and API routes
3. **Frontend Integration**: Update components and hooks
4. **Testing**: Verify end-to-end functionality

### Key Development Files

- `shared/schema.ts` - Central data model definitions
- `server/services/ai-providers.ts` - AI integration logic
- `client/src/pages/home.tsx` - Main application interface
- `client/src/components/` - Reusable UI components
- `server/routes.ts` - API endpoint definitions

### Code Style & Standards

- **TypeScript**: Strict type checking enabled
- **ES Modules**: Import/export syntax throughout
- **React Patterns**: Hooks-based functional components
- **Tailwind**: Utility-first CSS with design system
- **Error Boundaries**: Graceful error handling

## Performance Considerations

### Frontend Optimizations

- **Code Splitting**: Automatic route-based splitting with Vite
- **Query Caching**: TanStack Query reduces redundant API calls
- **Virtual DOM**: React optimizations for large response lists
- **Lazy Loading**: Components loaded on demand

### Backend Optimizations

- **Concurrent API Calls**: Parallel provider requests
- **Connection Pooling**: PostgreSQL connection management
- **Memory Management**: Efficient in-memory fallback storage
- **Request Validation**: Early rejection of invalid requests

### Scaling Considerations

- **Stateless Design**: Easy horizontal scaling
- **Database Separation**: Can extract to dedicated DB instance
- **CDN Ready**: Static assets can be served from CDN
- **API Rate Limiting**: Ready for rate limiting middleware

## Security & Best Practices

### API Key Management

- Environment variable storage only
- No keys in client-side code
- Separate keys per environment
- Secure transmission to providers

### Data Privacy

- No persistent storage of API responses by default
- User prompts stored only if explicitly saved
- No cross-user data access
- Secure session management

### Input Validation

- Client-side validation for UX
- Server-side validation for security
- Schema-driven validation with Zod
- Sanitization of user inputs

## Future Enhancements

### Planned Features

1. **Battle Mode**: Models critique each other's responses
2. **Response Analytics**: Sentiment analysis and metrics
3. **Export Functionality**: Save comparisons as PDF/JSON
4. **Custom Model Configs**: Temperature and parameter controls
5. **Prompt Templates**: Saved prompt collections
6. **Collaboration**: Share comparisons with others

### Technical Roadmap

- **Streaming Responses**: Real-time response streaming
- **Advanced Caching**: Redis integration for better performance
- **Monitoring**: Application performance monitoring
- **Testing Suite**: Comprehensive test coverage
- **Documentation**: API documentation with OpenAPI

## Environment Setup
ARE ALL IN THE .ENV FILE!!!

# Development  ???  Not sure wtf this is for???
NODE_ENV=development
```

### Development Commands

- `npm run dev` - Start development server (frontend + backend)
- `npm run build` - Build for production
- `npm run preview` - Preview production build

The application automatically handles missing API keys by excluding unavailable providers from the model selection interface.