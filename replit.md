# AI Model Comparison Tool

## Overview

This is a full-stack web application that allows users to compare responses from multiple AI models simultaneously. Users can input a prompt and select multiple AI models (OpenAI, Anthropic, Google Gemini, DeepSeek, xAI Grok) to see how each model responds to the same prompt. The application provides a side-by-side comparison view with response timing and status tracking.

## User Preferences

Preferred communication style: Simple, everyday language.

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
- **Multi-Provider Support**: Integrated with multiple AI providers through their respective SDKs
- **OpenAI**: Official OpenAI SDK for GPT models (GPT-4o, GPT-4 Turbo, GPT-3.5 Turbo)
- **Anthropic**: Official Anthropic SDK for Claude models (Claude Sonnet 4, Claude 3 Sonnet, Claude 3 Haiku)
- **Google**: Google GenAI SDK for Gemini models (Gemini 2.5 Pro, Gemini 2.5 Flash, Gemini Pro)
- **xAI**: OpenAI-compatible API client for Grok models (Grok 2, Grok Beta)
- **DeepSeek**: Support for DeepSeek Chat and Coder models
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