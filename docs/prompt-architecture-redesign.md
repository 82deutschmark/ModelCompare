# Prompt Architecture Redesign Plan

**Author:** Claude Code Analysis  
**Date:** 2025-08-26  
**Status:** Implementation Ready

## Executive Summary

ModelCompare currently has a fundamental architectural flaw in its prompt construction system. Templates are processed client-side with no system/user message separation, making it unsuitable for serious prompt injection research. This document outlines a complete redesign to server-side template processing with proper message architecture.

## Current Architecture Problems

### 1. Client-Side Template Processing (Critical Issue)

**Current Flow:**
```
Client → fetch('/docs/battle-prompts.md') → Parse Markdown → Resolve Variables → Send String
```

**Problems:**
- Server's `TemplateCompiler` is completely bypassed by client
- Templates processed twice: once by server cache, once by client parser
- No server control over prompt construction
- Client can manipulate templates before sending

**Evidence in Code:**
```typescript
// client/src/lib/promptParser.ts:51
const response = await fetch('/docs/compare-prompts.md');
```

### 2. No System/User Message Separation (Architecture Flaw)

**Anthropic Provider:**
```typescript
// server/providers/anthropic.ts:130
messages: [{ role: 'user', content: finalPrompt }]
```

**OpenAI Provider:**
```typescript
// server/providers/openai.ts:239  
input: prompt,
```

**Problems:**
- Everything goes as user message or single input
- No way to separate system instructions from user content
- Breaks proper prompt engineering practices
- Vulnerable to prompt injection in ways that aren't useful for research

### 3. Flat String Architecture

**Current API:**
```typescript
callModel(resolvedPrompt: string, modelId: string)
```

**Problems:**
- No message structure or role separation
- No conversation context support
- No prompt anatomy or component separation
- Limited research capabilities

### 4. No Prompt Audit Trail

**Server Receives:**
```typescript
{ template: "You are...", variables: {...} }
```

**Server Doesn't Know:**
- Which original template was used
- How variables were resolved
- What the prompt construction process was
- Whether client modified the template

## Proposed Architecture

### Core Principles

1. **Server-Side Authority**: All template processing happens server-side
2. **Message Structure**: Proper system/user/assistant message arrays
3. **Template Integrity**: Client cannot modify template logic
4. **Research-Friendly**: Designed for prompt injection and jailbreaking research

### New API Flow

```mermaid
graph TD
    A[Client] -->|POST /api/templates/battle/challenger| B[Template API]
    B --> C[TemplateCompiler.getTemplate()]
    C --> D[Template Found]
    D --> E[Return Structured Template]
    
    F[Client] -->|POST /api/generate-structured| G[Generate API]
    G --> H[VariableEngine.resolve()]
    H --> I[PromptBuilder.buildMessages()]
    I --> J[Provider.callModel(messages[])]
    J --> K[Response with Audit Trail]
```

### Template Structure Evolution

**Current Template (Flat):**
```markdown
### Battle Rap Challenger
You are a challenger. The previous model said: "{response}". 
Original prompt: "{originalPrompt}". Respond aggressively.
```

**New Template (Structured):**
```markdown
### Battle Rap Challenger

#### System Instructions
You are an AI model engaging in a battle rap competition. 
Your role is to challenge and critique the previous model's response.
Use technical ML terminology mixed with hip-hop slang.

#### User Context Template
Previous model ({modelName}) responded to: "{originalPrompt}"
Their response was: "{response}"

#### Response Guidelines
- Challenge factual accuracy
- Use battle rap format with rhymes
- Mention your model name
- Keep under 200 words
```

## Implementation Plan

### Phase 1: Template API Foundation

**New Endpoints:**
```typescript
GET  /api/templates                    // List all modes
GET  /api/templates/:mode              // Get templates for mode
GET  /api/templates/:mode/:category    // Get category templates  
GET  /api/templates/:mode/:category/:template // Get specific template
```

**Response Format:**
```typescript
interface StructuredTemplate {
  id: string;
  name: string;
  mode: ModeType;
  category: string;
  structure: {
    systemInstructions?: string;
    userTemplate: string;
    contextTemplate?: string;
    responseGuidelines?: string;
  };
  variables: VariableDefinition[];
  metadata: {
    filePath: string;
    lastModified: string;
    version: string;
  };
}
```

### Phase 2: Message Architecture

**New Provider Interface:**
```typescript
interface ModelMessage {
  role: 'system' | 'user' | 'assistant' | 'context';
  content: string;
  metadata?: {
    templateId?: string;
    variables?: Record<string, string>;
  };
}

interface CallOptions {
  maxTokens?: number;
  temperature?: number;
  model: string;
}

callModel(messages: ModelMessage[], options: CallOptions): Promise<ModelResponse>
```

**PromptBuilder Class:**
```typescript
class PromptBuilder {
  constructor(template: StructuredTemplate);
  
  setVariables(variables: Record<string, string>): this;
  setContext(context: string): this;
  addSystemInstruction(instruction: string): this;
  
  buildMessages(): ModelMessage[];
  getAuditInfo(): PromptAudit;
}
```

### Phase 3: Server-Side Resolution

**New Generate Endpoint:**
```typescript
POST /api/generate-structured
{
  templateId: "battle:challenger:generic",
  variables: { 
    originalPrompt: "...",
    response: "...",
    modelName: "gpt-4"
  },
  modelId: "claude-3-5-sonnet",
  options: { temperature: 0.7 }
}
```

**Server Processing:**
1. Fetch compiled template by ID
2. Validate variables against template schema
3. Resolve variables server-side
4. Build structured message array
5. Log full audit trail
6. Send to provider with message structure

### Phase 4: Provider Updates

**Anthropic Provider Enhancement:**
```typescript
async callModel(messages: ModelMessage[], options: CallOptions): Promise<ModelResponse> {
  const systemMessage = messages.find(m => m.role === 'system');
  const userMessages = messages.filter(m => m.role === 'user');
  
  const anthropicMessages = [
    ...(systemMessage ? [{ role: 'system', content: systemMessage.content }] : []),
    ...userMessages.map(m => ({ role: 'user', content: m.content }))
  ];
  
  return anthropic.messages.create({
    model: options.model,
    system: systemMessage?.content,
    messages: anthropicMessages,
    max_tokens: options.maxTokens || 2000
  });
}
```

**OpenAI Provider Enhancement:**
```typescript
async callModel(messages: ModelMessage[], options: CallOptions): Promise<ModelResponse> {
  const systemMessage = messages.find(m => m.role === 'system');
  const conversationMessages = messages
    .filter(m => m.role !== 'system')
    .map(m => ({ role: m.role, content: m.content }));
    
  if (isReasoningModel(options.model)) {
    // Use responses API for reasoning models
    return openai.responses.create({
      model: options.model,
      input: buildReasoningInput(messages),
      reasoning: { summary: 'auto' }
    });
  } else {
    // Use chat completions for regular models
    return openai.chat.completions.create({
      model: options.model,
      messages: [
        ...(systemMessage ? [{ role: 'system', content: systemMessage.content }] : []),
        ...conversationMessages
      ]
    });
  }
}
```

## Security and Research Benefits

### Proper Prompt Injection Research Environment

1. **System Message Protection**: System instructions can't be overridden by user input
2. **Template Integrity**: Server controls template logic, client only provides variables
3. **Audit Trail**: Full logging of prompt construction for research analysis
4. **Message Boundaries**: Clear separation between system, user, and context

### Enhanced Research Capabilities

1. **A/B Testing**: Compare different system instruction approaches
2. **Variable Isolation**: Test specific variable injection without template changes
3. **Provider Comparison**: Same message structure across all providers
4. **Jailbreak Analysis**: Proper logging of successful/failed injection attempts

## Migration Strategy

### Backward Compatibility

During transition, maintain both old and new endpoints:
- Legacy `/api/generate` continues working
- New `/api/generate-structured` for structured approach
- Client can migrate incrementally
- Old markdown files remain accessible during transition

### Rollout Plan

1. **Week 1**: Template API endpoints
2. **Week 2**: PromptBuilder and message structure
3. **Week 3**: Server-side resolution
4. **Week 4**: Provider updates and testing
5. **Week 5**: Client migration and cleanup

## Success Metrics

### Technical Metrics
- Template processing moved to server (0% → 100%)
- Proper message structure adoption (0% → 100%)
- Provider system message support (0% → 100%)
- Client-side markdown elimination (100% → 0%)

### Research Metrics
- Prompt injection success rate tracking
- Template variable effectiveness measurement
- Cross-provider consistency verification
- Audit trail completeness validation

## Implementation Task List

### Phase 1: Template API Foundation ✅ 

**1.1 Create Template API Endpoints**
- [x] Create `/api/templates` endpoint (list all modes)
- [x] Create `/api/templates/:mode` endpoint (get templates for mode)  
- [x] Create `/api/templates/:mode/:category` endpoint (get category templates)
- [x] Create `/api/templates/:mode/:category/:template` endpoint (get specific template)
- [x] Add proper error handling and validation
- [ ] Test endpoints with existing compiled templates Do if easy, otherwise user can do it.

**1.2 Define Structured Template Interface**
- [x] Create `StructuredTemplate` interface in shared types
- [x] Create `VariableDefinition` interface
- [x] Create `TemplateMetadata` interface
- [x] Update `TemplateCompiler` to support structured output
- [x] Add template versioning support

**1.3 Update Template Compiler**
- [x] Modify `parseMarkdownContent()` to detect structured sections
- [x] Add system/user/context section parsing
- [x] Extract variable definitions from templates
- [x] Add template validation for new structure  OVER-ENGINEERED!  NEEDS TO BE AUDITED FOR SIMPLIFICATION
- [ ] Test with existing markdown files

### Phase 2: Message Architecture 🔄

**2.1 Create Core Message Types**
- [x] Define `ModelMessage` interface
- [x] Define `CallOptions` interface  
- [x] Define `PromptAudit` interface
- [x] Add to shared API types
- [x] Update existing types for compatibility

**2.2 Create PromptBuilder Class**
- [x] Implement `PromptBuilder` constructor with template
- [x] Implement `setVariables()` method
- [x] Implement `setContext()` method
- [x] Implement `addSystemInstruction()` method
- [x] Implement `buildMessages()` method
- [x] Implement `getAuditInfo()` method
- [ ] Add comprehensive unit tests OVER-ENGINEERED!

**2.3 Update Template Format**
- [ ] Design new markdown structure with sections Possibly OVER-ENGINEERED! Reuse what we have??
- [ ] Create migration script for existing templates OVER-ENGINEERED! Reuse what we have??
- [ ] Update battle-prompts.md with new format
- [ ] Update creative-combat-prompts.md with new format
- [ ] Update debate-prompts.md with new format
- [ ] Test template parsing with new format

### Phase 3: Server-Side Resolution 🔄

**3.1 Create New Generate Endpoint**
- [x] Implement `POST /api/generate-structured` endpoint
- [x] Add request validation and schema
- [x] Implement template resolution by ID
- [x] Add variable validation against template schema
- [x] Add proper error handling

**3.2 Server-Side Variable Resolution**
- [x] Move variable resolution from client to server
- [x] Update `VariableEngine` to work with structured templates
- [x] Add template variable validation
- [x] Add audit logging for variable resolution
- [ ] Test resolution with all template types  HOW???

**3.3 Prompt Audit System**
- [x] Create `PromptAudit` logging system
- [x] Log template ID, variables, and resolution results
- [x] Add audit trail to database schema
- [x] Create audit query endpoints
- [ ] Add audit visualization support  Seems overengineered and not needed

### Phase 4: Provider Updates 🔄

**4.1 Update BaseProvider Interface**
- [ ] Change `callModel()` signature to accept `ModelMessage[]`
- [ ] Update `ModelResponse` interface for structured output
- [ ] Add message audit trail to responses
- [ ] Maintain backward compatibility during transition

**4.2 Update Anthropic Provider**
- [ ] Implement message array processing
- [ ] Add proper system message support
- [ ] Handle conversation context messages
- [ ] Add reasoning integration for structured messages
- [ ] Test with various message structures

**4.3 Update OpenAI Provider**  
- [ ] Detect reasoning vs chat completion models
- [ ] Implement structured input for reasoning models
- [ ] Implement chat completions for regular models
- [ ] Add proper system message support
- [ ] Test with GPT-4 and reasoning models

**4.4 Update Other Providers**
- [ ] Update Google Provider for message structure
- [ ] Update DeepSeek Provider for message structure  
- [ ] Update XAI Provider for message structure
- [ ] Test all providers with new message format
- [ ] Add provider-specific message optimization

### Phase 5: Client Migration 🔄

**5.1 Update Client Template Fetching**
- [ ] Replace `fetch('/docs/*.md')` with API calls
- [ ] Update `promptParser.ts` to use structured templates
- [ ] Remove client-side markdown parsing
- [ ] Add template caching on client side
- [ ] Test template loading performance

**5.2 Update Client Variable Handling**
- [ ] Remove client-side variable resolution
- [ ] Send template ID + variables to server
- [ ] Update UI to show structured template sections
- [ ] Add variable validation feedback
- [ ] Test variable input validation

**5.3 Update UI Components**
- [ ] Show system instructions separately from user templates
- [ ] Add template structure visualization
- [ ] Show resolved message structure in debug mode
- [ ] Add audit information display
- [ ] Test UI with all template types

### Phase 6: Testing and Validation 🔄

**6.1 Integration Testing**
- [ ] Test full flow: template API → resolution → provider → response
- [ ] Test all template modes (battle, creative, debate, etc.)
- [ ] Test variable validation and error handling
- [ ] Test backward compatibility with legacy endpoints
- [ ] Load test with concurrent requests

**6.2 Provider Compatibility Testing**  
- [ ] Test system message handling across all providers
- [ ] Verify conversation context support
- [ ] Test reasoning model integration
- [ ] Validate response format consistency
- [ ] Test error handling and fallbacks

**6.3 Security and Research Validation**
- [ ] Test prompt injection protection
- [ ] Validate audit trail completeness
- [ ] Test template integrity protection
- [ ] Verify variable sanitization
- [ ] Document research capabilities

### Phase 7: Documentation and Cleanup 🔄

**7.1 Update Documentation**
- [ ] Document new API endpoints
- [ ] Create template authoring guide
- [ ] Document message structure format
- [ ] Create prompt injection research guide
- [ ] Update deployment documentation

**7.2 Legacy Cleanup**
- [ ] Remove deprecated client-side parsing
- [ ] Clean up unused template processing code
- [ ] Remove duplicate markdown processing
- [ ] Update error messages and logging
- [ ] Archive legacy endpoints

**7.3 Performance Optimization**
- [ ] Optimize template compilation and caching
- [ ] Add template precompilation for production
- [ ] Optimize message structure serialization  
- [ ] Add response caching where appropriate
- [ ] Monitor and tune performance metrics

### Progress Tracking

**Current Phase:** Phase 1 - Template API Foundation  
**Next Milestone:** Template API endpoints functional  
**Estimated Completion:** 6-8 days total implementation time  

**Daily Progress Log:**
- [ ] Day 1: Template API endpoints and structured interfaces
- [ ] Day 2: PromptBuilder class and message architecture  
- [ ] Day 3: Server-side resolution and new generate endpoint
- [ ] Day 4: Provider updates and message structure support
- [ ] Day 5: Client migration and UI updates
- [ ] Day 6: Integration testing and validation
- [ ] Day 7-8: Documentation, cleanup, and optimization

## Conclusion

This redesign transforms ModelCompare from a simple comparison tool into a serious prompt injection research platform. The server-side template architecture provides the control, auditability, and structure needed for advanced prompt engineering research while maintaining the flexibility that makes the tool valuable for experimentation.

The investment in proper architecture will pay dividends in research capability, maintainability, and the ability to conduct sophisticated prompt injection and jailbreaking research with proper controls and measurement.