# OpenAI Prompt ID/Version Implementation Plan

## Overview

This document outlines the implementation of OpenAI's Prompt ID/Version feature using the Responses API. This allows calling pre-configured prompt templates stored in OpenAI's system by their ID and version, enabling better prompt management and version control.

## Current State

The ModelCompare system already uses the OpenAI Responses API in `server/providers/openai.ts` for all OpenAI model calls. The current implementation supports:

- Direct text prompts via `input` parameter
- Reasoning model support with `reasoning: { summary: "auto" }`
- High token limits (`max_output_tokens: 128000` for GPT-5 series)
- Retry/backoff logic with timeout handling
- Response ID persistence for chaining

## Target Implementation

### Example Usage
```javascript
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const response = await openai.responses.create({
  prompt: {
    "id": "pmpt_68a8bc95871c8197b1b653d490c26676041aca3b40b07f63",
    "version": "4"
  },
  // Optional variables for prompt templating
  variables: {
    "topic": "AI Ethics",
    "style": "academic"
  },
  // Standard Responses API parameters
  reasoning: { summary: "auto" },
  max_output_tokens: 128000
});
```

## Architecture Design

### 1. Backend Extensions

#### A. Enhanced OpenAI Provider (`server/providers/openai.ts`)

**New Interface:**
```typescript
interface PromptReference {
  id: string;
  version: string;
  variables?: Record<string, any>;
}

interface CallOptions {
  prompt?: PromptReference;
  input?: string;
  reasoning?: { summary: string };
  max_output_tokens?: number;
  previous_response_id?: string;
}
```

**Implementation Changes:**
- Add new method: `callModelWithPrompt(prompt: PromptReference, model: string, options?: CallOptions)`
- Modify existing `callModel()` to accept optional prompt parameter
- Maintain backward compatibility with text-based prompts
- Support both prompt ID and direct input in same request structure

#### B. API Route Extensions (`server/routes.ts`)

**New Endpoints:**
- `POST /api/prompts/execute` - Execute prompt by ID/version
- `GET /api/prompts/list` - List available prompts (if supported by OpenAI)
- `POST /api/prompts/validate` - Validate prompt ID/version exists

**Modified Endpoints:**
- `POST /api/compare` - Accept prompt objects alongside text prompts
- `POST /api/models/respond` - Support prompt ID mode
- `POST /api/generate` - Stream support for prompt ID calls

#### C. Type Definitions (`shared/api-types.ts`)

```typescript
interface PromptExecutionRequest {
  promptId: string;
  version: string;
  variables?: Record<string, any>;
  models: string[];
  options?: {
    reasoning?: boolean;
    maxTokens?: number;
  };
}

interface ModelRequest {
  prompt?: {
    id: string;
    version: string;
    variables?: Record<string, any>;
  };
  input?: string; // Maintain backward compatibility
  model: string;
}
```

### 2. Frontend Integration

#### A. Prompt Mode Selector
- Add toggle between "Text Input" and "Prompt Template" modes in `PromptInterface.tsx`
- Implement prompt ID/version input fields
- Variable injection interface for prompt templating

#### B. Prompt Template Management
- New component: `PromptTemplateSelector.tsx`
- Dropdown for available prompt IDs
- Version selector with validation
- Variable editor with schema validation

#### C. UI/UX Considerations
- Clear indication of which mode is active
- Preview of resolved prompt (if possible)
- Variable validation and error handling
- History of used prompt templates

## Implementation Strategy

### Phase 1: Backend Core (Priority 1)
1. **Extend OpenAI Provider**
   - Add prompt object support to `callModel()` method
   - Implement request parameter mapping
   - Add proper error handling for invalid prompt IDs

2. **API Route Updates**
   - Modify existing endpoints to accept prompt objects
   - Add validation for prompt ID format
   - Implement proper error responses

3. **Type Safety**
   - Update shared types for prompt references
   - Add request/response validation schemas

### Phase 2: Frontend Integration (Priority 2)
1. **Core UI Components**
   - Prompt mode selector
   - Template ID/version inputs
   - Variable editor interface

2. **Integration Points**
   - Update `PromptInterface.tsx` for dual modes
   - Modify comparison logic in dashboard
   - Update export functionality

3. **User Experience**
   - Mode switching with state preservation
   - Input validation and error feedback
   - Template history and favorites

### Phase 3: Advanced Features (Priority 3)
1. **Prompt Discovery**
   - List available prompts (if API supports)
   - Search and filter capabilities
   - Template categorization

2. **Analytics & Monitoring**
   - Usage tracking for prompt templates
   - Performance comparison between templates
   - Version effectiveness analysis

## Technical Specifications

### Request Structure
```typescript
// New prompt-based request
{
  prompt: {
    id: "pmpt_68a8bc95871c8197b1b653d490c26676041aca3b40b07f63",
    version: "4",
    variables: {
      "topic": "machine learning",
      "audience": "technical"
    }
  },
  model: "gpt-5-2025-08-07",
  reasoning: { summary: "auto" },
  max_output_tokens: 128000
}

// Backward compatible text request
{
  input: "Explain machine learning to a technical audience",
  model: "gpt-5-2025-08-07",
  reasoning: { summary: "auto" },
  max_output_tokens: 128000
}
```

### Response Extensions
```typescript
interface ModelResponse {
  content: string;
  reasoning?: string;
  responseTime: number;
  tokenUsage?: TokenUsage;
  cost?: number;
  responseId?: string;
  // New fields
  promptInfo?: {
    id: string;
    version: string;
    resolvedVariables?: Record<string, any>;
  };
}
```

## Error Handling

### Prompt ID Validation
- Invalid prompt ID format
- Prompt not found
- Version not available
- Variable validation failures

### Fallback Strategies
- Graceful degradation to text input mode
- Clear error messages for prompt issues
- Retry logic for temporary failures

## Testing Strategy

### Unit Tests
- Prompt ID validation logic
- Variable substitution accuracy
- Error handling scenarios
- Backward compatibility

### Integration Tests
- End-to-end prompt execution
- Multi-model prompt comparison
- Variable injection workflows
- API endpoint validation

### Manual Testing
- UI mode switching
- Template selection workflows
- Error state handling
- Performance comparison

## Configuration

### Environment Variables
```bash
# Existing
OPENAI_API_KEY=your_api_key_here
OPENAI_MAX_OUTPUT_TOKENS=128000
OPENAI_TIMEOUT_MS=600000

# New additions
OPENAI_PROMPT_VALIDATION=true
OPENAI_PROMPT_CACHE_TTL=3600
DEBUG_PROMPT_RESOLUTION=false
```

### Feature Flags
- `ENABLE_PROMPT_TEMPLATES=true` - Enable/disable prompt ID feature
- `PROMPT_DISCOVERY_MODE=basic` - Control prompt discovery features
- `VARIABLE_VALIDATION_STRICT=false` - Strict variable validation

## Migration Path

### Backward Compatibility
- All existing text-based prompts continue to work unchanged
- No breaking changes to current API contracts
- Gradual migration path for users

### Rollout Strategy
1. Deploy backend changes with feature flag disabled
2. Test with limited prompt IDs in staging
3. Enable frontend components progressively
4. Full feature rollout with documentation

## Security Considerations

### Prompt ID Security
- Validate prompt ID format to prevent injection
- Rate limiting for prompt execution calls
- Audit logging for prompt template usage

### Variable Injection
- Sanitize user-provided variables
- Prevent sensitive data injection
- Validate variable types and constraints

## Performance Impact

### Expected Benefits
- Reduced prompt engineering overhead
- Consistent prompt versioning
- Better prompt optimization tracking
- Reduced input token usage for repeated patterns

### Monitoring Points
- Prompt execution latency
- Variable resolution performance
- Cache hit rates for prompt metadata
- Error rates by prompt ID

## Documentation Requirements

### Developer Documentation
- API endpoint specifications
- Integration examples
- Error handling guides
- Migration instructions

### User Documentation
- Prompt template usage guide
- Variable injection examples
- Best practices for prompt versioning
- Troubleshooting common issues

## Timeline Estimate

### Phase 1 (Backend Core): 2-3 days
- OpenAI provider modifications: 1 day
- API route updates: 1 day
- Testing and validation: 1 day

### Phase 2 (Frontend Integration): 3-4 days
- UI component development: 2 days
- Integration and testing: 1-2 days

### Phase 3 (Advanced Features): 2-3 days
- Prompt discovery: 1 day
- Analytics integration: 1-2 days

**Total Estimated Time: 7-10 days**

## Success Criteria

### Functional Requirements
- ✅ Execute prompts by ID/version successfully
- ✅ Variable substitution works correctly
- ✅ Backward compatibility maintained
- ✅ Error handling provides clear feedback

### Performance Requirements  
- ✅ Prompt execution latency < 2x text input latency
- ✅ Variable resolution time < 100ms
- ✅ UI mode switching < 500ms
- ✅ No degradation in existing text prompt performance

### User Experience Requirements
- ✅ Intuitive mode switching interface
- ✅ Clear indication of active prompt mode
- ✅ Helpful error messages and validation
- ✅ Seamless integration with existing workflows

## Future Considerations

### OpenAI API Evolution
- Monitor for new prompt management features
- Adapt to changes in Responses API structure
- Integrate with OpenAI's prompt optimization tools

### Advanced Prompt Management
- Local prompt template caching
- Prompt performance analytics
- A/B testing framework for prompt versions
- Integration with external prompt management tools

---

**Author**: Claude Code  
**Date**: August 26, 2025  
**Version**: 1.0  
**Status**: Implementation Ready