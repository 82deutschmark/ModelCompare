# State Management & Variable System Standardization Plan v2

**Document**: Complete State Management & Variable Storage Standardization (REVISED)  
**Author**: Claude Code Assistant  
**Date**: August 17, 2025  
**Status**: Planning Phase v2 (Critical Revisions Applied)  
**Priority**: Critical (Architectural Technical Debt)

## Executive Summary

This revised plan addresses the **fundamental architectural inconsistencies** while implementing a **single source of truth** for variable substitution on the backend. The plan eliminates drift by making the server the authoritative resolver of templates while providing isomorphic preview capabilities.

## Critical Architectural Decisions (Redlines Addressed)

### 1. **Backend as Single Source of Truth for Variables**
- ✅ Server performs final template resolution and logs both raw template + resolved prompt
- ✅ Frontend only provides **preview** using shared isomorphic utility  
- ✅ API receives: `{ template: string, variables: Record<string, string>, metadata }`

### 2. **Unified API Contract**  
- ✅ Single endpoint: `POST /api/generate` with mode field
- ✅ Legacy routes behind feature flags for deprecation
- ✅ Streaming support via SSE events

### 3. **Typed Variable Registry Per Mode**
- ✅ Each mode declares variable schema (name, type, required, default, description)
- ✅ Server-side enforcement with auto-generated UI helpers

### 4. **Enhanced UnifiedMessage with Streaming**
- ✅ Added: `role`, `seatId`, `status`, `finishReason`, streaming fields
- ✅ Supports debates, tools, partial tokens cleanly

### 5. **ISO String Dates (No Date Objects)**
- ✅ All timestamps as ISO strings to eliminate serialization issues

### 6. **Derived State (No currentResponse)**
- ✅ Derive currentResponse via selectors from messages array
- ✅ Prevents drift and enables streaming

### 7. **Zustand Store with Selectors**
- ✅ Replace useState with optimized store for large state
- ✅ Memoized selectors reduce re-renders during streaming

### 8. **Clear Missing Variable Policy**
- ✅ Default: 'error' mode with escaping for literal braces
- ✅ Alias support during migration period

## Proposed Architecture (Revised)

### 1. Shared Isomorphic Variable Engine

```typescript
// shared/variable-engine.ts (FE + BE compatible)
interface VariableEngineOptions {
  policy: 'error' | 'warn' | 'keep'; // Default: 'error'
  aliases?: Record<string, string>;   // {RESPONSE} -> {response}
}

class VariableEngine {
  private aliases: Record<string, string>;
  private policy: 'error' | 'warn' | 'keep';
  
  constructor(options: VariableEngineOptions = { policy: 'error' }) {
    this.policy = options.policy;
    this.aliases = options.aliases || {};
  }
  
  // Frontend preview (no logging)
  renderPreview(template: string, variables: Record<string, string>): string {
    return this.render(template, variables, false);
  }
  
  // Backend final render (with logging)
  renderFinal(template: string, variables: Record<string, string>): { 
    resolved: string; 
    mapping: Record<string, string>;
    warnings: string[];
  } {
    const mapping: Record<string, string> = {};
    const warnings: string[] = [];
    const resolved = this.render(template, variables, true, mapping, warnings);
    return { resolved, mapping, warnings };
  }
  
  private render(
    template: string, 
    variables: Record<string, string>, 
    isServer = false,
    mapping?: Record<string, string>,
    warnings?: string[]
  ): string {
    // Handle aliases first: {RESPONSE} -> {response}
    let processedTemplate = template;
    Object.entries(this.aliases).forEach(([oldVar, newVar]) => {
      const oldPattern = new RegExp(`\\{${this.escapeRegExp(oldVar)}\\}`, 'g');
      processedTemplate = processedTemplate.replace(oldPattern, `{${newVar}}`);
      if (isServer && warnings && oldPattern.test(template)) {
        warnings.push(`Deprecated variable {${oldVar}} mapped to {${newVar}}`);
      }
    });
    
    // Handle escaping: \\{literal\\} -> {literal}
    const escapedBraces: string[] = [];
    processedTemplate = processedTemplate.replace(/\\\\{([^}]+)\\\\}/g, (match, content) => {
      const placeholder = `__ESCAPED_${escapedBraces.length}__`;
      escapedBraces.push(`{${content}}`);
      return placeholder;
    });
    
    // Replace variables with defaults: {varName|default text}
    let result = processedTemplate.replace(/\\{([^}|]+)(\\|([^}]+))?\\}/g, (match, varName, _, defaultValue) => {
      const value = variables[varName] ?? defaultValue;
      
      if (isServer && mapping) {
        mapping[varName] = value || 'MISSING';
      }
      
      if (value === undefined) {
        const error = `Missing variable: {${varName}}`;
        if (this.policy === 'error') {
          throw new Error(error);
        } else if (this.policy === 'warn' && isServer && warnings) {
          warnings.push(error);
          return match; // Keep placeholder
        } else {
          return match; // Keep placeholder
        }
      }
      
      return value;
    });
    
    // Restore escaped braces
    escapedBraces.forEach((escaped, index) => {
      result = result.replace(`__ESCAPED_${index}__`, escaped);
    });
    
    return result;
  }
  
  private escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&');
  }
}
```

### 2. Unified API Contract

```typescript
// Unified Request
interface GenerateRequest {
  mode: 'creative' | 'battle' | 'debate' | 'compare';
  sessionId?: string;
  template: string;                    // Raw template with {variables}
  variables: Record<string, string>;   // Variable values
  messages: UnifiedMessageIn[];        // Prior history (minimal)
  seats: ModelSeat[];                  // Model configurations
  options?: {
    temperature?: number;
    maxTokens?: number;
    stream?: boolean;
  };
}

// SSE Events (streaming)
interface SSEEvents {
  messageStart: { 
    messageId: string; 
    seatId: string; 
    createdAt: string; 
    resolvedPrompt?: string; 
  };
  delta: { 
    messageId: string; 
    text: string; 
    reasoning?: string; 
    tokens?: number; 
  };
  messageEnd: { 
    messageId: string; 
    finishReason: 'stop' | 'length' | 'tool' | 'content_filter' | 'error';
    tokenUsage: TokenUsage; 
    cost: Cost; 
    resolvedPrompt: string;
    modelConfig: ModelConfig;
  };
  error: { 
    messageId?: string; 
    code: string; 
    message: string; 
  };
}

// Non-streaming Response
interface GenerateResponse {
  message: UnifiedMessage;
  tokenUsage: TokenUsage;
  cost: Cost;
  resolvedPrompt: string;
  variableMapping: Record<string, string>;
  warnings: string[];
}
```

### 3. Enhanced UnifiedMessage

```typescript
interface UnifiedMessage {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  seatId?: string;                    // For multi-model modes
  content: string;
  reasoning?: string;
  createdAt: string;                  // ISO string, not Date
  
  // Mode-specific metadata
  type?: 'initial' | 'rebuttal' | 'creative' | 'debate' | 'comparison';
  round?: number;
  passNumber?: number;
  
  // Streaming and status
  status?: 'pending' | 'streaming' | 'complete' | 'error';
  finishReason?: 'stop' | 'length' | 'tool' | 'content_filter' | 'error';
  
  // Threading and tools
  parentId?: string;
  toolCall?: { name: string; arguments: unknown };
  toolResult?: unknown;
  
  // Metadata
  tokenUsage?: TokenUsage;
  cost?: Cost;
  modelConfig?: ModelConfig;
}
```

### 4. Variable Registry System

```typescript
// Variable schema definition per mode
interface VariableSchema {
  name: string;
  type: 'string' | 'number' | 'enum' | 'date';
  required: boolean;
  default?: string;
  description: string;
  validate?: (value: string) => boolean;
  enum?: string[];               // For type: 'enum'
  secret?: boolean;              // Redact in logs
}

// Mode registries
const VARIABLE_REGISTRIES = {
  creative: [
    { name: 'originalPrompt', type: 'string', required: true, description: 'User creative prompt' },
    { name: 'response', type: 'string', required: false, description: 'Previous model response' },
    { name: 'category', type: 'enum', required: true, enum: ['poetry', 'battle-rap', 'story'], description: 'Creative category' }
  ],
  battle: [
    { name: 'originalPrompt', type: 'string', required: true, description: 'Original debate prompt' },
    { name: 'response', type: 'string', required: false, description: 'Previous response to challenge' },
    { name: 'battleType', type: 'enum', required: true, enum: ['critique', 'enhance'], description: 'Battle mode' }
  ],
  debate: [
    { name: 'originalPrompt', type: 'string', required: true, description: 'Debate topic' },
    { name: 'topic', type: 'string', required: true, description: 'Debate topic' }, // Was {TOPIC}
    { name: 'intensity', type: 'number', required: true, description: 'Adversarial level 1-4' }, // Was {INTENSITY}
    { name: 'response', type: 'string', required: false, description: 'Previous argument' }, // Was {RESPONSE}
    { name: 'role', type: 'enum', required: true, enum: ['pro', 'con'], description: 'Debate side' },
    { name: 'position', type: 'string', required: true, description: 'Detailed position statement' }
  ]
} as const;
```

### 5. Zustand Store with Selectors

```typescript
// State store with optimized selectors
interface AppState {
  // Core state (not derived)
  originalPrompt: string;
  variables: Record<string, string>;
  messages: UnifiedMessage[];
  isProcessing: boolean;
  sessionStartedAt: string | null;
  activeSeatId?: string;
  
  // Actions
  setOriginalPrompt: (prompt: string) => void;
  setVariable: (key: string, value: string) => void;
  setVariables: (variables: Record<string, string>) => void;
  upsertMessage: (message: UnifiedMessage) => void;
  appendDelta: (messageId: string, text: string) => void;
  setStatus: (messageId: string, status: UnifiedMessage['status']) => void;
  setActiveSeat: (seatId: string) => void;
}

// Selectors (derived state)
const selectors = {
  getLastAssistantMessage: (state: AppState, seatId?: string) => 
    state.messages
      .filter(m => m.role === 'assistant' && (!seatId || m.seatId === seatId))
      .slice(-1)[0],
      
  getCurrentResponse: (state: AppState, seatId?: string) => 
    selectors.getLastAssistantMessage(state, seatId)?.content || '',
    
  getTotals: (state: AppState) => 
    state.messages.reduce((acc, msg) => ({
      cost: acc.cost + (msg.cost?.total || 0),
      tokens: {
        input: acc.tokens.input + (msg.tokenUsage?.input || 0),
        output: acc.tokens.output + (msg.tokenUsage?.output || 0),
        reasoning: acc.tokens.reasoning + (msg.tokenUsage?.reasoning || 0)
      }
    }), { cost: 0, tokens: { input: 0, output: 0, reasoning: 0 } })
};

const useAppStore = create<AppState>((set, get) => ({
  // Initial state
  originalPrompt: '',
  variables: {},
  messages: [],
  isProcessing: false,
  sessionStartedAt: null,
  
  // Actions
  setOriginalPrompt: (prompt) => set({ originalPrompt: prompt }),
  setVariable: (key, value) => set(state => ({ 
    variables: { ...state.variables, [key]: value } 
  })),
  setVariables: (variables) => set({ variables }),
  upsertMessage: (message) => set(state => ({
    messages: state.messages.find(m => m.id === message.id)
      ? state.messages.map(m => m.id === message.id ? message : m)
      : [...state.messages, message]
  })),
  appendDelta: (messageId, text) => set(state => ({
    messages: state.messages.map(m => 
      m.id === messageId 
        ? { ...m, content: m.content + text }
        : m
    )
  })),
  setStatus: (messageId, status) => set(state => ({
    messages: state.messages.map(m =>
      m.id === messageId ? { ...m, status } : m
    )
  })),
  setActiveSeat: (seatId) => set({ activeSeatId: seatId })
}));
```

## Revised Implementation Strategy

### Phase 1: Shared Infrastructure (2-3 days)
1. **Create shared variable engine** (`shared/variable-engine.ts`) with comprehensive tests
2. **Define unified API contract** with OpenAPI spec and SSE event shapes  
3. **Implement Zustand store** with selectors and streaming reducers
4. **Create variable registry scaffolding** with build-time validation
5. **Add comprehensive test suite** for variable engine, API contract, store

### Phase 2: Backend Unification (2 days)
1. **Implement unified `/api/generate` endpoint** with mode field
2. **Add server-side variable resolution** with logging and audit trail
3. **Implement SSE streaming support** for real-time updates
4. **Add feature flags for legacy routes** (`/api/battle/start`, etc.)
5. **Create rate limiting and observability** for new endpoint

### Phase 3: Variable Registry Migration (1 day)  
1. **Update markdown templates** to use camelCase variables only
2. **Add alias mapping** for migration (`{RESPONSE}` -> `{response}`)
3. **Create linter rules** to prevent uppercase variable introduction
4. **Add build-time validation** to catch template/registry mismatches

### Phase 4: Mode Migrations (3 days)

#### Creative Combat (0.5 days)
- Integrate Zustand store and selectors
- Use shared variable engine for preview
- Verify streaming and cost totals

#### Battle Chat (1 day)  
- Introduce `seatId` and `activeSeatId` concepts
- Derive "current response" from selector
- Migrate from custom API endpoints to unified endpoint

#### Debate Mode (1 day)
- Map `{TOPIC}/{INTENSITY}` to `{topic}/{intensity}` via registry
- Remove uppercase variables from templates (with aliases)
- Implement structured debate flow with new message system

#### Compare Mode (0.5 days)
- Treat each model as a seat with standardized message structure
- Add template variable support for future features

### Phase 5: Advanced Features & Cleanup (1 day)
1. **Add variable inspector dev panel** showing available variables and resolved values
2. **Implement missing variable policies** with clear error messages
3. **Add security features** (secret variable redaction, audit logging)
4. **Deprecate legacy routes** in release notes
5. **Update comprehensive documentation**

## Critical Implementation Details

### Variable Resolution Flow
1. Frontend sends `{ template, variables }` to `/api/generate`
2. Server applies aliases (`{RESPONSE}` -> `{response}`)
3. Server validates against variable registry
4. Server resolves template and logs mapping
5. Server calls model with resolved prompt
6. Server returns both response and resolved prompt for transparency

### Migration Compatibility
- Legacy endpoints behind feature flags for 2 releases
- Alias support for deprecated variable names
- Adapter functions: `legacyStateToUnified()`, `legacyMessageToUnified()`
- Visual regression testing for template preview vs server resolution

### Security & Observability
- Variable registry `secret: true` fields redacted in logs
- Tracing events with `requestId`, `sessionId`, `seatId`, `modelId`
- Rate limiting on unified endpoint
- Audit trail for variable resolution

## Updated Timeline: 8-10 days

**Phase Breakdown:**
- Phase 1 (Infrastructure): 2-3 days
- Phase 2 (Backend): 2 days  
- Phase 3 (Registry): 1 day
- Phase 4 (Migrations): 3 days
- Phase 5 (Features/Cleanup): 1 day

## Open Decisions for Immediate Resolution

1. **Missing Variable Policy**: Recommend `'error'` for development, `'warn'` for production
2. **Variable Naming**: Enforce `camelCase` only, no exceptions
3. **Endpoint Name**: Recommend `POST /api/generate` (RESTful and clear)
4. **Default Values**: Implement in Phase 1 with `{varName|default}` syntax
5. **Store Choice**: Zustand (lighter than Redux, better than useReducer for this scale)

## Success Criteria

- [ ] Single source of truth: server resolves all templates
- [ ] Isomorphic preview matches server resolution exactly  
- [ ] All modes use unified `/api/generate` endpoint
- [ ] Variable registry enforced server-side with auto-generated UI
- [ ] Streaming support across all modes
- [ ] No Date objects in React state (ISO strings only)
- [ ] Derived state via selectors (no stored `currentResponse`)
- [ ] Legacy route compatibility during transition
- [ ] Comprehensive test coverage
- [ ] Zero functional regressions

---

**This revised plan establishes true architectural consistency with the server as the authoritative source of truth while providing seamless preview capabilities and migration compatibility.**