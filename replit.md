# AI Model Comparison Tool

## Overview

This is a full-stack web application that allows users to compare responses from multiple AI models simultaneously. Users can input a prompt and select multiple AI models (OpenAI, Anthropic, Google Gemini, DeepSeek, xAI Grok) to see how each model responds to the same prompt. The application provides a side-by-side comparison view with response timing and status tracking.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes

### August 9, 2025 - Comprehensive Documentation and Code Comments
- Created comprehensive README.md with full project architecture documentation
- Added detailed header comments to all major files with author attribution (Replit Agent)
- Updated default prompt to philosophical multi-question format as requested
- Completely redesigned UI with clean, modern layout removing previous terrible design
- Fixed all TypeScript errors and LSP diagnostics
- Prepared foundation for future "battle mode" feature where models critique each other
- All files now properly documented with purpose, functionality, and architecture details

### August 9, 2025 - Battle Mode Implementation
- Built complete Battle Mode feature with AI model debates
- Created structured workflow: initial prompt → Model 1 response → Model 2 pushback → 10-round conversation mode
- Added backend API endpoints (/api/battle/start and /api/battle/continue) for battle management
- Implemented debate conversation management with proper context passing between rounds
- Added navigation between Compare Mode and Battle Mode with clean UI
- Models now engage in structured debates with challenging responses and counter-arguments
- All API keys configured (OpenAI, Anthropic, Gemini, xAI, DeepSeek) for full functionality

### August 10, 2025 - Fixed Model Selection & Created Dedicated Debate Mode
- Fixed model selection bug in Battle Mode - now allows selecting same model multiple times for different positions
- Created new dedicated "Debate Mode" page (/debate) separate from Battle and Compare modes
- Debate Mode features streamlined 10-round automatic debates with visual progress tracking
- Updated navigation across all pages to include Compare Mode, Battle Mode, and Debate Mode
- Enhanced user experience with clear mode separation: Compare (side-by-side), Battle (manual responses), Debate (auto 10-rounds)
- Fixed terminology from "conversation" to "debate/rebuttal" for better clarity of purpose
- All modes now properly cross-navigate and maintain distinct functionality

### August 10, 2025 - Complete Modular Provider System & Latest Models
- Refactored from monolithic ai-providers.ts to modular provider architecture
- Created separate provider files: openai.ts, anthropic.ts, google.ts, deepseek.ts, xai.ts
- Updated all providers with latest model versions and correct configurations:
  * OpenAI: GPT-5 (flagship 2025-08-07), GPT-4.1 series, o3/o4 reasoning models with Responses API
  * xAI: Grok 4 (reasoning), Grok 3 series (standard, mini, fast variants)
  * Anthropic: Claude Sonnet 4, Claude 3.7 Sonnet with structured reasoning prompts
  * Gemini: 2.5 Pro/Flash with thinking budgets, 2.0 Flash Thinking experimental
  * DeepSeek: R1 Reasoner with full CoT, V3 Chat standard model
- Added GPT-5 as newest flagship model with 400k context, reasoning token support, $1.25/$10 pricing
- Implemented comprehensive reasoning log capture for supported models:
  * DeepSeek R1: Full chain-of-thought reasoning via reasoning_content field
  * Claude 3.7/4: Structured reasoning with <reasoning> tags in prompts
  * Gemini 2.5: Thinking budget configuration with extracted thinking logs
  * OpenAI o3/o4: Exposed reasoning logs via Responses API with effort/summary controls
  * xAI Grok 4: Reasoning capability marked (API limitations for log exposure)
- Enhanced Battle Mode chat interface to display reasoning logs with amber highlighting
- Added model capability badges showing which models support reasoning
- Fixed all TypeScript errors and added proper model configuration interfaces
- Chat interface now shows Chain of Thought sections for all supported reasoning models
- Enhanced Battle Mode UI with collapsible reasoning sections and comprehensive model information
- Added model source of truth documentation in README.md with provider-specific capabilities
- Documented GPT-5 as newest flagship OpenAI model with superior coding and reasoning performance

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript running on Vite for fast development and building
- **UI Components**: Comprehensive component library using Radix UI primitives with shadcn/ui styling
- **Styling**: Tailwind CSS with CSS variables for theming, supporting both light and dark modes
- **State Management**: TanStack Query (React Query) for server state management and caching
- **Routing**: Wouter for lightweight client-side routing
- **Forms**: React Hook Form with Zod validation for type-safe form handling

### Backend Architecture
- **Runtime**: Node.js with Express.js server framework
- **Language**: TypeScript with ES modules
- **API Design**: RESTful endpoints for model comparison operations
- **Development Setup**: Vite middleware integration for seamless full-stack development
- **Error Handling**: Centralized error handling middleware with proper HTTP status codes
- **Logging**: Custom request logging with response time tracking

### Data Storage Solutions
- **Database**: PostgreSQL configured with Drizzle ORM for type-safe database operations
- **Connection**: Neon Database serverless PostgreSQL for cloud hosting
- **Migrations**: Drizzle Kit for database schema migrations and management
- **Fallback Storage**: In-memory storage implementation for development/testing scenarios
- **Schema**: Well-defined database schema for storing comparison results with JSON columns for flexible data

### Authentication and Authorization
- **Session Management**: PostgreSQL-backed sessions using connect-pg-simple
- **Security**: Express session configuration with secure cookie handling
- **Access Control**: No explicit authentication system implemented (appears to be open access)

### AI Model Integration
- **Modular Provider System**: Cleanly separated provider architecture with individual files for each service
- **OpenAI**: Official OpenAI SDK for GPT models (GPT-5, GPT-4o, o1-preview, o1-mini) with hidden reasoning tokens
- **Anthropic**: Official Anthropic SDK for Claude models with extended thinking API support
  * Claude Sonnet 4: Summarized thinking output with 4000 token budget
  * Claude 3.7 Sonnet: Full thinking output visibility for transparency
  * Claude 3.5 Sonnet: Standard responses without thinking mode
- **Google**: Google GenAI SDK for Gemini models with configurable thinking budgets
  * Gemini 2.5 Pro: Always-enabled thinking with up to 4000 tokens
  * Gemini 2.5 Flash: Configurable thinking budget (0-24576 tokens)
  * Gemini 2.0 Flash Thinking: Optimized reasoning model
- **xAI**: OpenAI-compatible API client for Grok models (Grok 4, Grok 2, Grok Vision)
- **DeepSeek**: Support for reasoning and chat models with full CoT transparency
  * DeepSeek R1 Reasoner: Complete chain-of-thought reasoning via reasoning_content field
  * DeepSeek V3 Chat: Standard conversational model
- **Reasoning Capabilities**: Full support for chain-of-thought, extended thinking, and reasoning logs
- **Cost Tracking**: Detailed token usage including separate reasoning token counts and pricing
- **Concurrent Processing**: Parallel API calls to multiple models for efficient comparison
- **Error Handling**: Individual model error handling with graceful degradation

## External Dependencies

### Core Framework Dependencies
- **Vite**: Build tool and development server with React plugin and runtime error overlay
- **React**: Core React library with TypeScript support
- **Express**: Node.js web framework for API server
- **TypeScript**: Type safety across the entire application stack

### Database and ORM
- **Drizzle ORM**: Type-safe database toolkit with PostgreSQL dialect
- **@neondatabase/serverless**: Neon Database serverless driver for PostgreSQL
- **connect-pg-simple**: PostgreSQL session store for Express sessions

### AI Provider SDKs
- **@anthropic-ai/sdk**: Official Anthropic SDK for Claude models
- **@google/genai**: Google Generative AI SDK for Gemini models
- **openai**: OpenAI SDK (used for both OpenAI and xAI Grok models)

### UI and Styling
- **@radix-ui/***: Comprehensive set of unstyled, accessible UI primitives
- **tailwindcss**: Utility-first CSS framework with PostCSS integration
- **class-variance-authority**: Utility for creating type-safe CSS class variants
- **clsx**: Utility for conditionally joining CSS classes

### State Management and Data Fetching
- **@tanstack/react-query**: Server state management with caching and synchronization
- **react-hook-form**: Forms library with minimal re-renders
- **@hookform/resolvers**: Validation resolvers for React Hook Form

### Development and Build Tools
- **tsx**: TypeScript execution for Node.js development
- **esbuild**: Fast bundler for production server builds
- **@replit/vite-plugin-cartographer**: Replit-specific development tooling
- **@replit/vite-plugin-runtime-error-modal**: Development error overlay

### Utility Libraries
- **wouter**: Lightweight client-side routing
- **date-fns**: Date manipulation utilities
- **zod**: TypeScript-first schema validation
- **nanoid**: Unique ID generation
- **cmdk**: Command palette component