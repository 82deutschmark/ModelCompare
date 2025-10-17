# Debate Mode: OpenAI Responses API Streaming + Reasoning Implementation Plan

**Author:** Claude Code (Sonnet 4.5)
**Date:** October 14, 2025
**Purpose:** Complete implementation guide for adding real-time streaming and reasoning display to Debate Mode using OpenAI Responses API with proper conversation chaining.

---

## Executive Summary

This plan implements real-time streaming and reasoning display for Debate Mode, leveraging OpenAI's Responses API with stateful conversation chaining. The critical feature is that **each model maintains its own conversation chain** with OpenAI's servers, with alternating turns where each model responds to the opponent's latest argument.

> **2025-10-17 Update (GPT-5 Codex):** The legacy `POST /api/debate/stream` endpoint and `useDebateStream` hook described below have been retired. The production flow now uses the `/api/debate/stream/init` + SSE handshake consumed by `useDebateStreaming`.

**Key Deliverables:**
1. Backend SSE streaming infrastructure (`/api/debate/stream`)
2. OpenAI provider rewrite with Responses API streaming
3. Frontend real-time streaming UI components
4. Conversation chaining with proper response ID tracking
5. Database persistence for debate sessions
6. Comprehensive error handling and recovery

---

## Architecture Overview: Alternating Turn Structure

### Debate Flow (10 Rounds Total)

```
┌─────────────────────────────────────────────────────────────┐
│                    DEBATE STRUCTURE                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Turn 1: Model A (GPT-5-Mini) - Opening Argument            │
│    ├─ No previous_response_id (first turn)                  │
│    ├─ Input: [system + topic]                               │
│    ├─ Stream: reasoning + content                           │
│    └─ Store: response_id_A1                                 │
│                                                              │
│  Turn 2: Model B (GPT-5-Nano) - Counter Argument            │
│    ├─ No previous_response_id (first turn)                  │
│    ├─ Input: [system + "Respond to: [Model A Turn 1]"]      │
│    ├─ Stream: reasoning + content                           │
│    └─ Store: response_id_B1                                 │
│                                                              │
│  Turn 3: Model A - Rebuttal to Turn 2                       │
│    ├─ HAS previous_response_id = response_id_A1             │
│    ├─ Input: [{ role: 'user', content: "Respond to: [B2]" }]│
│    ├─ OpenAI loads Model A's Turn 1 context automatically   │
│    ├─ Stream: reasoning + content                           │
│    └─ Store: response_id_A2 (overwrites A1 for next turn)   │
│                                                              │
│  Turn 4: Model B - Rebuttal to Turn 3                       │
│    ├─ HAS previous_response_id = response_id_B1             │
│    ├─ Input: [{ role: 'user', content: "Respond to: [A3]" }]│
│    ├─ OpenAI loads Model B's Turn 2 context automatically   │
│    ├─ Stream: reasoning + content                           │
│    └─ Store: response_id_B2 (overwrites B1 for next turn)   │
│                                                              │
│  ... Continue alternating for 10 total turns ...            │
│                                                              │
│  Model A Chain: Turn 1 → Turn 3 → Turn 5 → Turn 7 → Turn 9  │
│  Model B Chain: Turn 2 → Turn 4 → Turn 6 → Turn 8 → Turn 10 │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### ⚠️ CRITICAL CONCEPT: Two Separate Conversation Chains

**Model A's Chain** (Pro/Affirmative):
- Turn 1: Opening statement (no previous_response_id)
- Turn 3: Responds to Model B's Turn 2 (previous_response_id = Turn 1 response ID)
- Turn 5: Responds to Model B's Turn 4 (previous_response_id = Turn 3 response ID)
- Turn 7: Responds to Model B's Turn 6 (previous_response_id = Turn 5 response ID)
- Turn 9: Responds to Model B's Turn 8 (previous_response_id = Turn 7 response ID)

**Model B's Chain** (Con/Negative):
- Turn 2: Opening counter (no previous_response_id)
- Turn 4: Responds to Model A's Turn 3 (previous_response_id = Turn 2 response ID)
- Turn 6: Responds to Model A's Turn 5 (previous_response_id = Turn 4 response ID)
- Turn 8: Responds to Model A's Turn 7 (previous_response_id = Turn 6 response ID)
- Turn 10: Responds to Model A's Turn 9 (previous_response_id = Turn 8 response ID)

**Key Insight:** Each model receives the opponent's latest response as a NEW user message, but the conversation chain connects to the model's OWN previous turn, not the opponent's.

---

## Phase 1: Backend Streaming Infrastructure

### 1.1 Create Streaming Endpoint

**File:** `server/routes.ts`

**Location:** After existing `/api/models/respond` endpoint (line ~350)

```typescript
// POST /api/debate/stream - Streaming debate with reasoning
app.post("/api/debate/stream", async (req, res) => {
  try {
    const {
      modelId,
      topic,
      role, // 'AFFIRMATIVE' | 'NEGATIVE'
      intensity,
      opponentMessage, // null for Turn 1/2, opponent's content for subsequent turns
      previousResponseId, // null for Turn 1/2, model's own last response ID
      turnNumber // 1-10
    } = req.body;

    // Validation
    if (!modelId || !topic || !role || !intensity || turnNumber == null) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Set SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });

    // Build prompt based on turn number
    let inputMessages: Array<{ role: string; content: string }>;

    if (turnNumber === 1 || turnNumber === 2) {
      // Opening statements - no previous context
      const position = role === 'AFFIRMATIVE' ? 'FOR' : 'AGAINST';
      const systemPrompt = `You are the ${role} debater ${position} the proposition: "${topic}".
Present your opening argument following Robert's Rules of Order.
Adversarial intensity level: ${intensity}.`;

      inputMessages = [{ role: 'user', content: systemPrompt }];
    } else {
      // Rebuttals - respond to opponent
      const rebuttalPrompt = `Your opponent just argued: "${opponentMessage}"

Respond as the ${role} debater:
1. Address your opponent's specific points
2. Refute their arguments with evidence and logic
3. Strengthen your own position
4. Use adversarial intensity level: ${intensity}`;

      inputMessages = [{ role: 'user', content: rebuttalPrompt }];
    }

    // Call OpenAI provider with streaming enabled
    const provider = getProviderForModel(modelId);

    await provider.callModelStreaming({
      modelId,
      messages: inputMessages,
      previousResponseId: previousResponseId || undefined,
      onReasoningChunk: (chunk: string) => {
        res.write(`event: reasoning\ndata: ${JSON.stringify({ chunk })}\n\n`);
      },
      onContentChunk: (chunk: string) => {
        res.write(`event: content\ndata: ${JSON.stringify({ chunk })}\n\n`);
      },
      onComplete: (responseId: string, tokenUsage: any, cost: any) => {
        res.write(`event: complete\ndata: ${JSON.stringify({
          responseId,
          tokenUsage,
          cost
        })}\n\n`);
        res.end();
      },
      onError: (error: Error) => {
        res.write(`event: error\ndata: ${JSON.stringify({
          message: error.message
        })}\n\n`);
        res.end();
      }
    });

  } catch (error) {
    console.error('Debate stream error:', error);
    res.write(`event: error\ndata: ${JSON.stringify({
      message: error instanceof Error ? error.message : 'Unknown error'
    })}\n\n`);
    res.end();
  }
});
```

### 1.2 Add Provider Method Signatures

**File:** `server/providers/base.ts`

```typescript
export interface StreamingCallbacks {
  onReasoningChunk: (chunk: string) => void;
  onContentChunk: (chunk: string) => void;
  onComplete: (responseId: string, tokenUsage: any, cost: any) => void;
  onError: (error: Error) => void;
}

export interface StreamingCallOptions {
  modelId: string;
  messages: Array<{ role: string; content: string }>;
  previousResponseId?: string; // For conversation chaining
  temperature?: number;
  maxTokens?: number;
  onReasoningChunk: (chunk: string) => void;
  onContentChunk: (chunk: string) => void;
  onComplete: (responseId: string, tokenUsage: any, cost: any) => void;
  onError: (error: Error) => void;
}

export abstract class BaseProvider {
  // ... existing methods ...

  /**
   * Streaming call with reasoning support
   * Must be implemented by providers that support reasoning models
   */
  abstract callModelStreaming?(options: StreamingCallOptions): Promise<void>;
}
```

---

## Phase 2: OpenAI Provider Rewrite with Streaming

### 2.1 Implement Streaming Method

**File:** `server/providers/openai.ts`

**Add after existing `callModel` method (line ~334):**

```typescript
/**
 * Streaming implementation for Responses API with reasoning
 * Supports conversation chaining via previous_response_id
 */
async callModelStreaming(options: StreamingCallOptions): Promise<void> {
  const {
    modelId,
    messages,
    previousResponseId,
    temperature,
    maxTokens,
    onReasoningChunk,
    onContentChunk,
    onComplete,
    onError
  } = options;

  const modelConfig = this.models.find(m => m.id === modelId);
  if (!modelConfig) {
    onError(new Error(`Model not found: ${modelId}`));
    return;
  }

  // Configure max_output_tokens
  const isGpt5Series = modelId.startsWith('gpt-5');
  const defaultMax = isGpt5Series ? 128000 : 16384;
  const configuredMax = maxTokens || defaultMax;

  try {
    // Build Responses API request
    const requestPayload: any = {
      model: modelId,
      input: messages, // Array of message objects
      reasoning: {
        summary: 'auto',
        effort: 'high' // High effort for debate quality
      },
      max_output_tokens: configuredMax,
      stream: true // Enable streaming
    };

    // Add conversation chaining if applicable
    if (previousResponseId) {
      requestPayload.previous_response_id = previousResponseId;
    }

    // Explicitly enable storage for conversation chaining
    requestPayload.store = true;

    // Create streaming response
    const stream = await this.openai.responses.create(requestPayload);

    let accumulatedReasoning = '';
    let accumulatedContent = '';
    let finalResponseId = '';
    let finalTokenUsage: any = null;

    // Process stream chunks
    for await (const chunk of stream) {
      // Reasoning chunks
      if (chunk.type === 'response.reasoning.delta') {
        const reasoningText = chunk.delta?.content || '';
        accumulatedReasoning += reasoningText;
        onReasoningChunk(reasoningText);
      }

      // Content chunks
      if (chunk.type === 'response.output_text.delta') {
        const contentText = chunk.delta?.content || '';
        accumulatedContent += contentText;
        onContentChunk(contentText);
      }

      // Completion event
      if (chunk.type === 'response.done') {
        finalResponseId = chunk.response?.id || '';
        finalTokenUsage = chunk.response?.usage || null;
      }
    }

    // Calculate cost
    const cost = modelConfig && finalTokenUsage
      ? this.calculateCost(modelConfig, {
          input: finalTokenUsage.input_tokens || 0,
          output: finalTokenUsage.output_tokens || 0,
          reasoning: finalTokenUsage.output_tokens_details?.reasoning_tokens || 0
        })
      : { total: 0, input: 0, output: 0, reasoning: 0 };

    // Call completion callback
    onComplete(finalResponseId, finalTokenUsage, cost);

  } catch (error: any) {
    console.error('OpenAI streaming error:', error);
    onError(error);
  }
}
```

### 2.2 Update Provider Index

**File:** `server/providers/index.ts`

```typescript
export function getProviderForModel(modelId: string): BaseProvider {
  const allModels = getAllModels();
  const modelConfig = allModels.find(m => m.id === modelId);

  if (!modelConfig) {
    throw new Error(`Model not found: ${modelId}`);
  }

  switch (modelConfig.provider.toLowerCase()) {
    case 'openai':
      return new OpenAIProvider();
    case 'anthropic':
      return new AnthropicProvider();
    case 'google':
      return new GoogleProvider();
    // ... other providers
    default:
      throw new Error(`Provider not found: ${modelConfig.provider}`);
  }
}
```

---

## Phase 3: Frontend Streaming UI

### 3.1 Create Streaming Hook

**File:** ~~`client/src/hooks/useDebateStream.ts`~~ (retired; use `client/src/hooks/useDebateStreaming.ts`)

```typescript
import { useState, useCallback, useRef } from 'react';

interface DebateStreamOptions {
  modelId: string;
  topic: string;
  role: 'AFFIRMATIVE' | 'NEGATIVE';
  intensity: number;
  opponentMessage: string | null;
  previousResponseId: string | null;
  turnNumber: number;
}

interface StreamState {
  reasoning: string;
  content: string;
  isStreaming: boolean;
  error: string | null;
  responseId: string | null;
  tokenUsage: any | null;
  cost: any | null;
}

export function useDebateStream() { // Legacy implementation (removed 2025-10-17)
  const [state, setState] = useState<StreamState>({
    reasoning: '',
    content: '',
    isStreaming: false,
    error: null,
    responseId: null,
    tokenUsage: null,
    cost: null
  });

  const eventSourceRef = useRef<EventSource | null>(null);

  const startStream = useCallback(async (options: DebateStreamOptions) => {
    // Reset state
    setState({
      reasoning: '',
      content: '',
      isStreaming: true,
      error: null,
      responseId: null,
      tokenUsage: null,
      cost: null
    });

    try {
      // Make POST request to initiate stream
      const response = await fetch('/api/debate/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(options)
      });

      if (!response.ok) {
        throw new Error(`Stream failed: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response body');
      }

      // Read SSE stream
      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('event: reasoning')) {
            const data = JSON.parse(line.replace('event: reasoning\ndata: ', ''));
            setState(prev => ({
              ...prev,
              reasoning: prev.reasoning + data.chunk
            }));
          } else if (line.startsWith('event: content')) {
            const data = JSON.parse(line.replace('event: content\ndata: ', ''));
            setState(prev => ({
              ...prev,
              content: prev.content + data.chunk
            }));
          } else if (line.startsWith('event: complete')) {
            const data = JSON.parse(line.replace('event: complete\ndata: ', ''));
            setState(prev => ({
              ...prev,
              isStreaming: false,
              responseId: data.responseId,
              tokenUsage: data.tokenUsage,
              cost: data.cost
            }));
          } else if (line.startsWith('event: error')) {
            const data = JSON.parse(line.replace('event: error\ndata: ', ''));
            setState(prev => ({
              ...prev,
              isStreaming: false,
              error: data.message
            }));
          }
        }
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        isStreaming: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }));
    }
  }, []);

  const cancelStream = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setState(prev => ({ ...prev, isStreaming: false }));
  }, []);

  return {
    ...state,
    startStream,
    cancelStream
  };
}
```

### 3.2 Update Debate Page Component

**File:** `client/src/pages/Debate.tsx`

**Changes needed:**

> **Note (2025-10-17):** Replace any `useDebateStream` references below with `useDebateStreaming` and adapt to the two-stage streaming handshake.

1. **Add state for response ID tracking** (line ~106):

```typescript
// Add after existing state declarations
const [modelALastResponseId, setModelALastResponseId] = useState<string | null>(null);
const [modelBLastResponseId, setModelBLastResponseId] = useState<string | null>(null);
```

2. **Import streaming hook** (line ~18):

```typescript
import { useDebateStream } from '@/hooks/useDebateStream';
```

3. **Replace mutations with streaming logic** (line ~186):

```typescript
const {
  reasoning: streamReasoning,
  content: streamContent,
  isStreaming,
  error: streamError,
  responseId: streamResponseId,
  tokenUsage: streamTokenUsage,
  cost: streamCost,
  startStream,
  cancelStream
} = useDebateStream();

const handleStartDebate = async () => {
  if (!model1Id || !model2Id) {
    toast({
      title: "Select Both Models",
      description: "Please select two models for the debate.",
      variant: "destructive",
    });
    return;
  }

  const prompts = generateDebatePrompts();

  // Start streaming for Model A's opening
  await startStream({
    modelId: model1Id,
    topic: prompts.topicText,
    role: 'AFFIRMATIVE',
    intensity: adversarialLevel,
    opponentMessage: null, // No opponent yet
    previousResponseId: null, // First turn
    turnNumber: 1
  });

  // When complete, add to messages and store response ID
  if (streamResponseId) {
    const model1 = models.find(m => m.id === model1Id);
    setMessages([{
      id: `msg-1`,
      modelId: model1Id,
      modelName: model1?.name || "Model 1",
      content: streamContent,
      reasoning: streamReasoning,
      timestamp: Date.now(),
      round: 1,
      responseTime: 0, // Not tracked in streaming
      tokenUsage: streamTokenUsage,
      cost: streamCost,
      modelConfig: undefined
    }]);
    setModelALastResponseId(streamResponseId);
    setCurrentRound(1);
    setShowSetup(false);
  }
};

const continueDebate = async () => {
  if (!model1Id || !model2Id) return;

  const prompts = generateDebatePrompts();
  const lastMessage = messages[messages.length - 1];

  // Determine which model goes next
  const isModelBTurn = currentRound % 2 === 1;
  const nextModelId = isModelBTurn ? model2Id : model1Id;
  const nextRole = isModelBTurn ? 'NEGATIVE' : 'AFFIRMATIVE';

  // Determine previous response ID (model's OWN last turn, not opponent's)
  const previousResponseId = isModelBTurn
    ? modelBLastResponseId
    : modelALastResponseId;

  // Start streaming
  await startStream({
    modelId: nextModelId,
    topic: prompts.topicText,
    role: nextRole,
    intensity: adversarialLevel,
    opponentMessage: lastMessage.content,
    previousResponseId: previousResponseId,
    turnNumber: currentRound + 1
  });

  // When complete, add to messages and update response ID
  if (streamResponseId) {
    const model = models.find(m => m.id === nextModelId);
    const nextRound = currentRound + 1;

    setMessages(prev => [...prev, {
      id: `msg-${nextRound}`,
      modelId: nextModelId,
      modelName: model?.name || "Model",
      content: streamContent,
      reasoning: streamReasoning,
      timestamp: Date.now(),
      round: Math.ceil(nextRound / 2),
      responseTime: 0,
      tokenUsage: streamTokenUsage,
      cost: streamCost,
      modelConfig: undefined
    }]);

    // Update the correct model's response ID
    if (isModelBTurn) {
      setModelBLastResponseId(streamResponseId);
    } else {
      setModelALastResponseId(streamResponseId);
    }

    setCurrentRound(nextRound);
  }
};
```

4. **Add real-time streaming display** (line ~764):

```typescript
{/* Show streaming content in real-time */}
{isStreaming && (
  <Card className="mb-4 border-blue-500">
    <CardContent className="pt-6">
      <div className="space-y-4">
        {streamReasoning && (
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded">
            <div className="text-xs font-medium text-blue-700 dark:text-blue-300 mb-2">
              Reasoning (streaming...)
            </div>
            <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
              {streamReasoning}
            </div>
          </div>
        )}
        {streamContent && (
          <div className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap">
            {streamContent}
          </div>
        )}
        <Button
          onClick={cancelStream}
          variant="outline"
          size="sm"
          className="mt-2"
        >
          <Square className="w-4 h-4 mr-2" />
          Stop Streaming
        </Button>
      </div>
    </CardContent>
  </Card>
)}
```

---

## Phase 4: Conversation Chaining Logic

### 4.1 State Management Structure

```typescript
interface DebateState {
  currentTurn: number; // 1-10
  modelAId: string;
  modelBId: string;
  modelALastResponseId: string | null;
  modelBLastResponseId: string | null;
  turnHistory: Array<{
    turn: number;
    modelId: string; // which model responded this turn
    content: string;
    reasoning: string;
    responseId: string;
    timestamp: number;
  }>;
}
```

### 4.2 Determining Which Model Goes Next

**Pseudocode:**

```typescript
function getNextModelId(currentTurn: number, modelAId: string, modelBId: string): string {
  // Turn 1, 3, 5, 7, 9 = Model A
  // Turn 2, 4, 6, 8, 10 = Model B
  return (currentTurn % 2 === 1) ? modelAId : modelBId;
}

function getNextRole(currentTurn: number): 'AFFIRMATIVE' | 'NEGATIVE' {
  return (currentTurn % 2 === 1) ? 'AFFIRMATIVE' : 'NEGATIVE';
}
```

### 4.3 Building Previous Response ID

**Pseudocode:**

```typescript
function getPreviousResponseId(
  currentTurn: number,
  modelALastResponseId: string | null,
  modelBLastResponseId: string | null
): string | null {
  // Turn 1 or 2: no previous response
  if (currentTurn <= 2) {
    return null;
  }

  // Determine which model is going next
  const isModelATurn = (currentTurn % 2 === 1);

  // Return that model's OWN last response ID
  return isModelATurn ? modelALastResponseId : modelBLastResponseId;
}
```

### 4.4 Example: Complete 4-Turn Debate

**Turn 1: Model A Opening**
```typescript
POST /api/debate/stream
{
  "modelId": "gpt-5-mini-2025-08-07",
  "topic": "AI will replace most human jobs by 2040",
  "role": "AFFIRMATIVE",
  "intensity": 3,
  "opponentMessage": null,
  "previousResponseId": null,
  "turnNumber": 1
}

// OpenAI Request:
{
  "model": "gpt-5-mini-2025-08-07",
  "input": [
    {
      "role": "user",
      "content": "You are the AFFIRMATIVE debater FOR the proposition..."
    }
  ],
  // NO previous_response_id
  "reasoning": { "summary": "auto", "effort": "high" },
  "max_output_tokens": 128000,
  "stream": true,
  "store": true
}

// Response:
// ... streaming reasoning and content ...
// Final: responseId = "resp_abc123"

// Frontend: setModelALastResponseId("resp_abc123")
```

**Turn 2: Model B Counter**
```typescript
POST /api/debate/stream
{
  "modelId": "gpt-5-nano-2025-08-07",
  "topic": "AI will replace most human jobs by 2040",
  "role": "NEGATIVE",
  "intensity": 3,
  "opponentMessage": "[Full content of Model A's Turn 1]",
  "previousResponseId": null, // Still no previous for Model B
  "turnNumber": 2
}

// OpenAI Request:
{
  "model": "gpt-5-nano-2025-08-07",
  "input": [
    {
      "role": "user",
      "content": "Your opponent just argued: \"[Model A Turn 1]\"..."
    }
  ],
  // NO previous_response_id (first turn for Model B)
  "reasoning": { "summary": "auto", "effort": "high" },
  "max_output_tokens": 128000,
  "stream": true,
  "store": true
}

// Response:
// ... streaming reasoning and content ...
// Final: responseId = "resp_def456"

// Frontend: setModelBLastResponseId("resp_def456")
```

**Turn 3: Model A Rebuttal**
```typescript
POST /api/debate/stream
{
  "modelId": "gpt-5-mini-2025-08-07",
  "topic": "AI will replace most human jobs by 2040",
  "role": "AFFIRMATIVE",
  "intensity": 3,
  "opponentMessage": "[Full content of Model B's Turn 2]",
  "previousResponseId": "resp_abc123", // ← Model A's Turn 1 response ID
  "turnNumber": 3
}

// OpenAI Request:
{
  "model": "gpt-5-mini-2025-08-07",
  "input": [
    {
      "role": "user",
      "content": "Your opponent just argued: \"[Model B Turn 2]\"..."
    }
  ],
  "previous_response_id": "resp_abc123", // ← Connects to Turn 1
  // OpenAI server loads Turn 1 context automatically
  "reasoning": { "summary": "auto", "effort": "high" },
  "max_output_tokens": 128000,
  "stream": true,
  "store": true
}

// Response:
// ... streaming reasoning and content ...
// Final: responseId = "resp_ghi789"

// Frontend: setModelALastResponseId("resp_ghi789") // Overwrites Turn 1 ID
```

**Turn 4: Model B Rebuttal**
```typescript
POST /api/debate/stream
{
  "modelId": "gpt-5-nano-2025-08-07",
  "topic": "AI will replace most human jobs by 2040",
  "role": "NEGATIVE",
  "intensity": 3,
  "opponentMessage": "[Full content of Model A's Turn 3]",
  "previousResponseId": "resp_def456", // ← Model B's Turn 2 response ID
  "turnNumber": 4
}

// OpenAI Request:
{
  "model": "gpt-5-nano-2025-08-07",
  "input": [
    {
      "role": "user",
      "content": "Your opponent just argued: \"[Model A Turn 3]\"..."
    }
  ],
  "previous_response_id": "resp_def456", // ← Connects to Turn 2
  // OpenAI server loads Turn 2 context automatically
  "reasoning": { "summary": "auto", "effort": "high" },
  "max_output_tokens": 128000,
  "stream": true,
  "store": true
}

// Response:
// ... streaming reasoning and content ...
// Final: responseId = "resp_jkl012"

// Frontend: setModelBLastResponseId("resp_jkl012") // Overwrites Turn 2 ID
```

---

## Phase 5: Database Persistence

### 5.1 Update Schema

**File:** `shared/schema.ts`

**Add new table for debate sessions:**

```typescript
export const debateSessions = pgTable('debate_sessions', {
  id: text('id').primaryKey(),
  topicText: text('topic_text').notNull(),
  model1Id: text('model1_id').notNull(),
  model2Id: text('model2_id').notNull(),
  adversarialLevel: integer('adversarial_level').notNull(),
  turnHistory: jsonb('turn_history').notNull(), // Array of turn records
  model1ResponseIds: jsonb('model1_response_ids').notNull(), // Array of response IDs
  model2ResponseIds: jsonb('model2_response_ids').notNull(), // Array of response IDs
  totalCost: real('total_cost').default(0),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export type DebateSession = typeof debateSessions.$inferSelect;
export type NewDebateSession = typeof debateSessions.$inferInsert;
```

### 5.2 Storage Methods

**File:** `server/storage.ts`

```typescript
async createDebateSession(data: {
  topicText: string;
  model1Id: string;
  model2Id: string;
  adversarialLevel: number;
}): Promise<DebateSession> {
  const id = `debate_${Date.now()}_${Math.random().toString(36).slice(2)}`;

  const [session] = await this.db.insert(debateSessions).values({
    id,
    topicText: data.topicText,
    model1Id: data.model1Id,
    model2Id: data.model2Id,
    adversarialLevel: data.adversarialLevel,
    turnHistory: [],
    model1ResponseIds: [],
    model2ResponseIds: [],
    totalCost: 0
  }).returning();

  return session;
}

async updateDebateSession(
  id: string,
  turnData: {
    turn: number;
    modelId: string;
    content: string;
    reasoning: string;
    responseId: string;
    cost: number;
  }
): Promise<void> {
  const session = await this.getDebateSession(id);
  if (!session) throw new Error('Session not found');

  const turnHistory = [...(session.turnHistory as any[]), turnData];

  // Update appropriate response ID array
  const isModel1 = turnData.modelId === session.model1Id;
  const model1ResponseIds = isModel1
    ? [...(session.model1ResponseIds as string[]), turnData.responseId]
    : (session.model1ResponseIds as string[]);
  const model2ResponseIds = !isModel1
    ? [...(session.model2ResponseIds as string[]), turnData.responseId]
    : (session.model2ResponseIds as string[]);

  await this.db.update(debateSessions)
    .set({
      turnHistory,
      model1ResponseIds,
      model2ResponseIds,
      totalCost: session.totalCost + turnData.cost,
      updatedAt: new Date()
    })
    .where(eq(debateSessions.id, id));
}

async getDebateSession(id: string): Promise<DebateSession | null> {
  const [session] = await this.db
    .select()
    .from(debateSessions)
    .where(eq(debateSessions.id, id))
    .limit(1);

  return session || null;
}
```

### 5.3 Session Persistence Flow

1. **Start Debate:** Create session in database
2. **After Each Turn:** Update session with turn data + response ID
3. **On Page Reload:** Restore state from session ID (future feature)

---

## Phase 6: Error Handling & Recovery

### 6.1 Error Scenarios

**Scenario 1: Stream Fails Mid-Turn**
- **Detection:** `onError` callback triggered
- **Action:** Display error message, mark turn as failed
- **Recovery:** Allow retry of current turn (use same previous_response_id)

**Scenario 2: Response ID Missing**
- **Detection:** `streamResponseId` is null after completion
- **Action:** Log error, continue without chaining
- **Impact:** Next turn won't have conversation context (degraded)

**Scenario 3: User Stops Mid-Stream**
- **Detection:** User clicks "Stop Streaming" button
- **Action:** Cancel EventSource, mark turn as incomplete
- **Recovery:** Allow restart from previous turn

**Scenario 4: Network Disconnection**
- **Detection:** Stream timeout or connection error
- **Action:** Display reconnection message
- **Recovery:** Retry with exponential backoff (3 attempts)

### 6.2 Error Handling Code

**File:** `client/src/hooks/useDebateStream.ts`

```typescript
// Add retry logic to startStream
const startStream = useCallback(async (options: DebateStreamOptions, retryCount = 0) => {
  const MAX_RETRIES = 3;

  try {
    // ... existing streaming code ...
  } catch (error) {
    if (retryCount < MAX_RETRIES) {
      // Exponential backoff: 1s, 2s, 4s
      const delay = Math.pow(2, retryCount) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
      return startStream(options, retryCount + 1);
    } else {
      setState(prev => ({
        ...prev,
        isStreaming: false,
        error: `Failed after ${MAX_RETRIES} retries: ${error.message}`
      }));
    }
  }
}, []);
```

### 6.3 Validation Checklist

**Before Each Turn:**
- ✅ Model IDs are valid OpenAI reasoning models
- ✅ Topic text is not empty
- ✅ Previous response ID (if Turn 3+) is stored correctly
- ✅ Opponent message (if Turn 2+) is available

**After Each Turn:**
- ✅ Response ID captured and stored
- ✅ Turn data saved to database
- ✅ State updated correctly for next turn
- ✅ Cost calculated and added to total

---

## Testing Strategy

### Manual Testing Checklist

**Turn 1 (Model A Opening):**
1. Start debate with GPT-5-Mini vs GPT-5-Nano
2. Verify reasoning streams in real-time
3. Verify content streams in real-time
4. Verify response ID captured: `modelALastResponseId`
5. Verify turn saved to database

**Turn 2 (Model B Counter):**
1. Click "Continue Debate"
2. Verify Model A's Turn 1 content passed as `opponentMessage`
3. Verify NO previous_response_id sent (first turn for Model B)
4. Verify reasoning + content stream correctly
5. Verify response ID captured: `modelBLastResponseId`

**Turn 3 (Model A Rebuttal):**
1. Click "Continue Debate"
2. Verify Model B's Turn 2 content passed as `opponentMessage`
3. ⚠️ **CRITICAL:** Verify `previous_response_id = modelALastResponseId` (Turn 1 ID)
4. Verify reasoning + content stream correctly
5. Verify new response ID overwrites `modelALastResponseId`

**Turn 4 (Model B Rebuttal):**
1. Click "Continue Debate"
2. Verify Model A's Turn 3 content passed as `opponentMessage`
3. ⚠️ **CRITICAL:** Verify `previous_response_id = modelBLastResponseId` (Turn 2 ID)
4. Verify reasoning + content stream correctly
5. Verify new response ID overwrites `modelBLastResponseId`

**Continue to Turn 10:**
1. Verify alternating pattern continues correctly
2. Verify each model always references its OWN previous turn
3. Verify total cost accumulated correctly
4. Verify all turns saved to database

### Error Testing

1. **Disconnect WiFi during Turn 3:** Verify retry logic activates
2. **Stop stream mid-reasoning:** Verify clean cancellation
3. **Send invalid model ID:** Verify error message displayed
4. **Send missing opponent message:** Verify validation error

---

## Performance Considerations

### Streaming Optimization

**Problem:** Two models streaming simultaneously initially (Turn 1 + Turn 2)
**Solution:** Run sequentially to avoid backend overload:
- Turn 1: Wait for Model A completion
- Turn 2: Then start Model B

**Problem:** Turn 3+ must wait for previous turn's response ID
**Solution:** Already enforced by conversation chaining requirement

### Token Usage

**Before Chaining (Hypothetical):**
- Turn 1: 850 tokens (system + topic)
- Turn 2: 850 + 300 (opponent) = 1150 tokens
- Turn 3: 850 + 300 + 300 = 1450 tokens
- Turn 10: ~4000+ tokens

**With Chaining:**
- Turn 1: 850 tokens
- Turn 2: 850 tokens (separate chain)
- Turn 3: 300 tokens (only new message, context loaded by OpenAI)
- Turn 10: 300 tokens

**Savings:** ~60-70% token reduction for long debates

---

## Success Criteria

### Must Have
- ✅ Real-time reasoning streaming visible to user
- ✅ Real-time content streaming visible to user
- ✅ Conversation chaining works correctly (each model references own previous turn)
- ✅ Response IDs captured and stored correctly
- ✅ 10-turn debate completes successfully
- ✅ Database persistence for all turns
- ✅ Error handling with retry logic

### Nice to Have
- ⭕ Session restoration on page reload
- ⭕ Pause/resume streaming functionality
- ⭕ Export with reasoning included
- ⭕ Side-by-side reasoning comparison view

### Validation Tests
1. Complete 10-turn debate GPT-5-Mini vs GPT-5-Nano
2. Inspect network logs to verify `previous_response_id` correctness
3. Check database for complete turn history
4. Verify cost calculations match OpenAI dashboard
5. Test error scenarios (network loss, invalid model, etc.)

---

## Implementation Order

### Sprint 1: Backend Foundation (1 day)
1. Create `/api/debate/stream` endpoint
2. Add `callModelStreaming` to OpenAI provider
3. Test with Postman/curl

### Sprint 2: Frontend Hook (1 day)
1. Create `useDebateStream` hook
2. Add response ID state management
3. Test with mock data

### Sprint 3: UI Integration (1 day)
1. Update Debate.tsx with streaming UI
2. Wire up startStream/continueDebate
3. Add real-time display components

### Sprint 4: Database + Polish (1 day)
1. Add debate_sessions table
2. Implement session persistence
3. Add error handling and retry logic
4. Final testing and validation

**Total Estimated Time:** 4 days

---

## Appendix: Key Files Summary

### Files to Modify
- `server/routes.ts` - Add `/api/debate/stream` endpoint
- `server/providers/base.ts` - Add streaming method signature
- `server/providers/openai.ts` - Implement `callModelStreaming`
- `server/providers/index.ts` - Export `getProviderForModel`
- `server/storage.ts` - Add debate session methods
- `shared/schema.ts` - Add `debateSessions` table
- `client/src/pages/Debate.tsx` - Replace mutations with streaming
- `client/src/hooks/useDebateStream.ts` - NEW FILE (streaming hook)

### Database Migration
```sql
CREATE TABLE debate_sessions (
  id TEXT PRIMARY KEY,
  topic_text TEXT NOT NULL,
  model1_id TEXT NOT NULL,
  model2_id TEXT NOT NULL,
  adversarial_level INTEGER NOT NULL,
  turn_history JSONB NOT NULL DEFAULT '[]',
  model1_response_ids JSONB NOT NULL DEFAULT '[]',
  model2_response_ids JSONB NOT NULL DEFAULT '[]',
  total_cost REAL DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

Run migration:
```bash
npm run db:push
```

---

## Final Notes

This implementation plan focuses on **correctness first, optimization second**. The conversation chaining logic is the most critical aspect - each model must reference its own previous turn, not the opponent's. The streaming UI provides immediate user feedback, making the debate feel more dynamic and engaging.

**Questions or Issues?**
- If response IDs aren't captured correctly, conversation chaining will fail silently (degraded to stateless mode)
- If `previous_response_id` references the wrong turn, OpenAI will return an error
- If stream is interrupted, retry logic will attempt recovery up to 3 times

**Next Steps After Implementation:**
1. Monitor OpenAI API usage for token savings verification
2. Collect user feedback on streaming UX
3. Consider adding pause/resume functionality
4. Explore session restoration for page reloads
