# AI Model Comparison Tool

A sophisticated web application for comparing responses from multiple AI models simultaneously. Built with React, TypeScript, and Express, supporting all major AI providers with real-time response comparison and analysis.

## Architecture Overview

### Core Technology Stack
- **Frontend**: React 18 + TypeScript + Vite for development/building
- **Backend**: Express.js + TypeScript with ES modules
- **Database**: PostgreSQL with Drizzle ORM (with in-memory fallback)
- **Styling**: Tailwind CSS + shadcn/ui component library
- **State Management**: TanStack Query for server state management
- **Routing**: Wouter for lightweight client-side routing

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

## AI Provider Integration

### Supported Providers & Models

**OpenAI** - Source of Truth: server/providers/openai.ts
- GPT-5 (2025-08-07) - Flagship model for coding, reasoning, and agentic tasks
  * 400k context window, 128k max output, reasoning token support
  * $1.25 input / $10.00 output per 1M tokens
- GPT-4.1 series (Nano, Mini, Standard) - Latest GPT-4 improvements  
- o3/o4 series - Advanced reasoning models with Responses API support
- GPT-4o Mini - Cost-optimized multimodal model

**Anthropic Claude**
- Claude Opus 4.1 (most capable)
- Claude Sonnet 4 (balanced performance)
- Claude 3.7 Sonnet (enhanced version)
- Claude 3 Sonnet (standard)
- Claude 3 Haiku (fastest)

**Google Gemini**
- Gemini 2.5 Pro (flagship model)
- Gemini 2.5 Flash (optimized speed)
- Gemini 2.5 Flash 8B (lightweight)
- Gemini Pro (legacy)

**DeepSeek**
- DeepSeek V3 Chat (conversational AI)
- DeepSeek R1 Reasoner (advanced reasoning)

**xAI Grok**
- Grok 4 (latest version)
- Grok 2 Vision (multimodal)
- Grok 2 1212 (text-only)
- Grok Beta (experimental)

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
- **OpenAI**: Responses API for o-series reasoning models, GPT-5 flagship performance
- **Anthropic**: Structured reasoning with `<reasoning>` tags for Claude 3.7/4
- **Google**: Thinking budget configuration for Gemini 2.5 models
- **xAI**: Advanced reasoning capabilities in Grok 4
- **DeepSeek**: Complete reasoning transparency via `reasoning_content` field

**Note**: Model specifications are regularly updated. Check `server/providers/` for the most current model configurations, pricing, and capabilities.

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

## Frontend Architecture

### Component Hierarchy

```
App (Theme Provider + Router)
├── Home Page
│   ├── ModelSelector (provider-grouped checkboxes)
│   ├── PromptInput (textarea with options)
│   └── ResponseGrid
│       └── ResponseCard[] (individual model responses)
└── ThemeProvider (light/dark mode support)
```

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
GET  /api/models           # Fetch available AI models
POST /api/compare          # Submit prompt for comparison
GET  /api/comparisons/:id  # Retrieve specific comparison
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

### Required Environment Variables

```bash
# Database (optional - falls back to in-memory)
DATABASE_URL=postgresql://user:pass@host:port/db

# AI Provider Keys (at least one required)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GEMINI_API_KEY=AI...
GROK_API_KEY=xai-...
DEEPSEEK_API_KEY=sk-...

# Development
NODE_ENV=development
```

### Development Commands

- `npm run dev` - Start development server (frontend + backend)
- `npm run build` - Build for production
- `npm run preview` - Preview production build

The application automatically handles missing API keys by excluding unavailable providers from the model selection interface.