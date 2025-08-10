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

### August 10, 2025 - Modular Provider System & Reasoning Logs
- Refactored from monolithic ai-providers.ts to modular provider architecture
- Created separate provider files: openai.ts, anthropic.ts, google.ts, deepseek.ts, xai.ts
- Each provider includes model capabilities, pricing, limits, and reasoning support
- Implemented comprehensive reasoning log capture for supported models:
  * DeepSeek R1: Full chain-of-thought reasoning via reasoning_content field
  * Claude 3.7/4: Extended thinking logs via thinking API parameter
  * Gemini 2.5: Thinking budget configuration (abstracted logs)
  * OpenAI o1: Hidden reasoning tokens (not exposed via API)
  * xAI Grok: Standard responses (reasoning capabilities but not exposed)
- Enhanced Battle Mode chat interface to display reasoning logs with amber highlighting
- Added model capability badges showing which models support reasoning
- Included token usage tracking with separate reasoning token counts
- Chat interface now shows Chain of Thought sections for supported models

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