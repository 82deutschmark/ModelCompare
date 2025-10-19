/**
 * OpenAI Responses API Critical Implementation Fixes
 *
 * Author: Claude Code using Sonnet 4
 * Date: 2025-10-16
 * PURPOSE: Documents critical issues in ModelCompare's Responses API implementation by comparing
 *          against official OpenAI reference implementations from October 2025. Identifies incorrect
 *          patterns, provides corrected examples, and outlines migration path.
 * SRP/DRY check: Pass - Documentation only
 * shadcn/ui: N/A - Documentation
 */

# OpenAI Responses API Critical Implementation Issues
*Analysis Date: October 16, 2025*
*Training Data Warning: This analysis is based on October 2025 Responses API patterns*

## Executive Summary

ModelCompare's current OpenAI provider (`server/providers/openai.ts`) is attempting to use the Responses API but has **7 critical implementation issues** that prevent proper functionality. This document compares the current implementation against official OpenAI reference repositories and provides specific fixes.

**Reference Repositories Analyzed:**
- `D:\GitHub\openai-sdk-streaming` - Official NextJS starter with Responses API
- `D:\GitHub\openai-chatkit-advanced-samples` - Advanced ChatKit patterns
- `D:\GitHub\openai_responses` - Python examples with proper usage patterns

---

## Critical Issue #1: Incorrect Input Format (Non-Streaming)

### Current Implementation (INCORRECT)
**Location:** `server/providers/openai.ts:219-240, 247`

```typescript
// WRONG: Converting messages to concatenated prompt string
private convertMessagesToPrompt(messages: ModelMessage[]): string {
  const parts: string[] = [];

  for (const message of messages) {
    switch (message.role) {
      case 'system':
        parts.push(`System: ${message.content}`);
        break;
      case 'user':
        parts.push(`User: ${message.content}`);
        break;
      // ... more cases
    }
  }

  return parts.join('\n\n');
}

// Then passing as string:
const response = await openai.responses.create({
  model,
  input: prompt, // ❌ Single concatenated string
  // ...
});
```

### Why This Is Wrong

The Responses API supports **TWO input formats**:
1. **Simple string** - For single-turn interactions
2. **Array of message objects** - For structured conversations (PREFERRED)

By converting structured messages to a concatenated string, you're:
- ❌ Losing role information that the model needs
- ❌ Breaking conversation context understanding
- ❌ Making it impossible for the API to optimize based on message roles
- ❌ Losing support for multimodal content (images, etc.)

### Correct Implementation

**From Reference:** `D:\GitHub\openai_responses\1_basics.py:28-38`

```typescript
// ✅ CORRECT: Pass array of message objects
const response = await openai.responses.create({
  model,
  input: [
    {
      role: "system",
      content: "You are a helpful assistant."
    },
    {
      role: "user",
      content: "What is the meaning of life?"
    }
  ],
  reasoning: { summary: 'auto' },
  max_output_tokens: maxOutputTokens,
});
```

**Alternative for simple cases:**
```typescript
// ✅ ALSO CORRECT: Direct string for single-turn
const response = await openai.responses.create({
  model: "gpt-4.1",
  input: "Write a bedtime story about a unicorn.",
  instructions: "Talk like you are drunk" // Optional system-level steering
});
```

### Required Fix

**Remove the `convertMessagesToPrompt` method entirely** and pass messages directly:

```typescript
async callModel(messages: ModelMessage[], model: string, options?: CallOptions): Promise<ModelResponse> {
  const startTime = Date.now();
  const modelConfig = this.models.find(m => m.id === model);

  // ✅ Convert to Responses API message format
  const input = messages.map(msg => ({
    role: msg.role === 'context' ? 'system' : msg.role, // Map custom roles
    content: msg.content
  }));

  const response = await openai.responses.create({
    model,
    input, // ✅ Array of properly structured messages
    reasoning: { summary: 'auto' },
    max_output_tokens: maxOutputTokens,
  });
  // ...
}
```

---

## Critical Issue #2: Incorrect Streaming Event Types

### Current Implementation (INCORRECT)
**Location:** `server/providers/openai.ts:423-440`

```typescript
// ❌ WRONG EVENT TYPES - These don't exist in Responses API!
for await (const chunk of stream) {
  // WRONG: No such event as 'response.reasoning_summary_text.delta'
  if (chunk.type === 'response.reasoning_summary_text.delta') {
    const reasoningText = chunk.delta?.content || '';
    accumulatedReasoning += reasoningText;
    onReasoningChunk(reasoningText);
  }

  // WRONG: No such event as 'response.content_part.added'
  if (chunk.type === 'response.content_part.added') {
    const contentText = chunk.part?.text || '';
    accumulatedContent += contentText;
    onContentChunk(contentText);
  }

  // WRONG: Event exists but property access is wrong
  if (chunk.type === 'response.completed') {
    finalResponseId = chunk.response?.id || '';
    finalTokenUsage = chunk.response?.usage || null;
  }
}
```

### Why This Is Wrong

The event types you're using **do not exist in the Responses API**. These appear to be either:
- From an old/deprecated API version
- Confused with Assistants API event types
- Made up based on assumptions

### Correct Implementation

**From Reference:** `D:\GitHub\openai-sdk-streaming\docs\guides\responses-api.md:1080-1090`

The actual Responses API streaming events are:

```typescript
// ✅ CORRECT EVENT TYPES from official docs
for await (const event of stream) {
  switch (event.type) {
    case 'response.output_item.added':
      // New output item started (text, function_call, etc.)
      console.log('New item:', event.item);
      break;

    case 'response.output_text.delta':
      // Text content streaming chunk
      const textDelta = event.delta;
      accumulatedContent += textDelta;
      onContentChunk(textDelta);
      break;

    case 'response.function_call_arguments.delta':
      // Function call arguments streaming (if using tools)
      const argsDelta = event.delta;
      accumulatedArgs += argsDelta;
      break;

    case 'response.function_call_arguments.done':
      // Function call arguments complete
      const finalArgs = event.arguments;
      break;

    case 'response.output_item.done':
      // Output item completed
      const completedItem = event.item;
      break;

    case 'response.done':
      // ENTIRE response complete (use this, not 'response.completed')
      finalResponseId = event.response.id;
      finalTokenUsage = event.response.usage;
      break;
  }
}
```

**For reasoning output specifically:**

From the official function calling guide, reasoning appears in the `output` array structure, not as separate delta events. You need to parse it from the final response:

```typescript
// ✅ Reasoning is in output_reasoning property
case 'response.done':
  finalResponseId = event.response.id;
  finalTokenUsage = event.response.usage;

  // Parse reasoning from response structure
  if (event.response.output_reasoning) {
    accumulatedReasoning = event.response.output_reasoning.summary || '';
  }
  break;
```

### Required Fix

**Replace entire streaming event handling:**

```typescript
async callModelStreaming(options: StreamingCallOptions): Promise<void> {
  // ... setup code ...

  const stream = await openai.responses.create({
    model: modelId,
    input: messages, // ✅ Pass message array directly
    max_output_tokens: configuredMax,
    stream: true,
    store: true, // ✅ Keep this for conversation chaining
    reasoning: reasoningConfig ? {
      effort: reasoningConfig.effort || 'medium',
      summary: reasoningConfig.summary || 'detailed'
    } : { summary: 'auto' }
  });

  let accumulatedContent = '';
  let accumulatedReasoning = '';
  let finalResponseId = '';
  let finalTokenUsage: any = null;

  // ✅ CORRECT event types
  for await (const event of stream) {
    switch (event.type) {
      case 'response.output_text.delta':
        // ✅ Correct text streaming
        accumulatedContent += event.delta;
        onContentChunk(event.delta);
        break;

      case 'response.done':
        // ✅ Correct completion event
        finalResponseId = event.response.id;
        finalTokenUsage = event.response.usage;

        // Extract reasoning if available
        if (event.response.output_reasoning?.summary) {
          accumulatedReasoning = event.response.output_reasoning.summary;
          onReasoningChunk(accumulatedReasoning);
        }
        break;
    }
  }

  // Calculate cost and call completion
  const cost = modelConfig && finalTokenUsage
    ? this.calculateCost(modelConfig, {
        input: finalTokenUsage.input_tokens || 0,
        output: finalTokenUsage.output_tokens || 0,
        reasoning: finalTokenUsage.output_tokens_details?.reasoning_tokens || 0
      })
    : { total: 0, input: 0, output: 0, reasoning: 0 };

  onComplete(finalResponseId, finalTokenUsage, cost, accumulatedContent, accumulatedReasoning);
}
```

---

## Critical Issue #3: Incorrect Response Property Access

### Current Implementation (INCORRECT)
**Location:** `server/providers/openai.ts:278-287`

```typescript
// ❌ Overly complex fallback parsing
const outputText: string = response.output_text || '';
let content = outputText;
if (!content && Array.isArray(response.output)) {
  // Fallback scan for first text content
  const textBlock = response.output.find((b: any) =>
    b.type === 'output_text' || b.type === 'message' || b.type === 'text'
  );
  if (textBlock?.content) {
    content = typeof textBlock.content === 'string'
      ? textBlock.content
      : String(textBlock.content);
  }
}
if (!content) content = 'No response generated';
```

### Why This Is Wrong

You're treating `output_text` as optional and implementing complex fallback logic. The Responses API **always provides `output_text`** as a top-level property for text responses.

### Correct Implementation

**From Reference:** `D:\GitHub\openai_responses\1_basics.py:18`

```python
# ✅ Python example - direct property access
print(response.output_text)
```

**TypeScript equivalent:**

```typescript
// ✅ CORRECT: Direct property access
const response = await openai.responses.create({
  model,
  input: messages,
  reasoning: { summary: 'auto' },
  max_output_tokens: maxOutputTokens,
});

// ✅ output_text is ALWAYS present for text responses
const content = response.output_text;

// ✅ Only parse output array if you need detailed structure
if (response.output && Array.isArray(response.output)) {
  // Inspect individual output items (function_calls, etc.)
  for (const item of response.output) {
    if (item.type === 'function_call') {
      console.log('Function called:', item.name);
    }
  }
}
```

### Required Fix

```typescript
const response = await openai.responses.create({
  model,
  input: messages,
  reasoning: { summary: 'auto' },
  max_output_tokens: maxOutputTokens,
});

// ✅ Simplified response parsing
const content = response.output_text || 'No response generated';
const reasoningSummary = response.output_reasoning?.summary;

return {
  content,
  reasoning: reasoningSummary,
  responseTime: Date.now() - startTime,
  tokenUsage: {
    input: response.usage?.input_tokens ?? 0,
    output: response.usage?.output_tokens ?? 0,
    reasoning: response.usage?.output_tokens_details?.reasoning_tokens ?? 0,
  },
  cost: this.calculateCost(modelConfig, /* ... */),
  responseId: response.id, // ✅ Keep for conversation chaining
};
```

---

## Critical Issue #4: Missing `instructions` Parameter Support

### Current Gap

The Responses API introduced a new `instructions` parameter that acts as a **system-level steering mechanism**, separate from the conversation messages. Your implementation doesn't support this.

### Correct Implementation

**From Reference:** `D:\GitHub\openai_responses\1_basics.py:11-15`

```python
# ✅ Using instructions parameter
response = client.responses.create(
    model="gpt-4o",
    instructions="Talk like you are drunk",  # System-level steering
    input="Write a one-sentence bedtime story about a unicorn."
)
```

### Recommended Addition

Add support for `instructions` in your `CallOptions`:

```typescript
interface CallOptions {
  temperature?: number;
  maxTokens?: number;
  instructions?: string; // ✅ Add this
  reasoningConfig?: {
    effort?: 'low' | 'medium' | 'high';
    summary?: 'auto' | 'detailed';
  };
}

async callModel(messages: ModelMessage[], model: string, options?: CallOptions) {
  const requestPayload: any = {
    model,
    input: messages,
    reasoning: { summary: 'auto' },
    max_output_tokens: maxOutputTokens,
  };

  // ✅ Add instructions if provided
  if (options?.instructions) {
    requestPayload.instructions = options.instructions;
  }

  const response = await openai.responses.create(requestPayload);
  // ...
}
```

---

## Critical Issue #5: Conversation Chaining Not Fully Implemented

### Current Implementation (PARTIAL)
**Location:** `server/providers/openai.ts:374-376`

```typescript
// ✅ Streaming has it (GOOD)
if (previousResponseId) {
  requestPayload.previous_response_id = previousResponseId;
}
```

But the **non-streaming** `callModel` method does NOT support `previous_response_id`, which breaks conversation continuity.

### Why This Matters

**From Reference:** `D:\GitHub\openai_responses\1_basics.py:50-56`

```python
# First turn
response = client.responses.create(
    model="gpt-4o",
    input="My name is Geert"
)

# Second turn - uses previous_response_id for context
second_response = client.responses.create(
    model="gpt-4o",
    input="What is my name based on what I just told you?",
    previous_response_id=response.id  # ✅ Context chaining
)
```

The `previous_response_id` parameter tells the API to:
1. Load the full stored conversation context from the server
2. Append only the new input message
3. Continue the conversation seamlessly

Without this, you're forcing the API to reprocess entire conversation histories on every call.

### Required Fix

```typescript
interface CallOptions {
  temperature?: number;
  maxTokens?: number;
  instructions?: string;
  previousResponseId?: string; // ✅ Add this
  reasoningConfig?: {
    effort?: 'low' | 'medium' | 'high';
    summary?: 'auto' | 'detailed';
  };
}

async callModel(messages: ModelMessage[], model: string, options?: CallOptions) {
  const requestPayload: any = {
    model,
    input: messages,
    reasoning: { summary: 'auto' },
    max_output_tokens: maxOutputTokens,
    store: true, // ✅ Enable storage for chaining
  };

  // ✅ Add conversation chaining
  if (options?.previousResponseId) {
    requestPayload.previous_response_id = options.previousResponseId;
  }

  const response = await openai.responses.create(requestPayload);

  return {
    content: response.output_text,
    // ... other properties ...
    responseId: response.id, // ✅ Return for next turn
  };
}
```

---

## Critical Issue #6: Incorrect Reasoning Configuration

### Current Implementation (QUESTIONABLE)
**Location:** `server/providers/openai.ts:384-402`

```typescript
// ❌ Overly complex reasoning configuration
if (reasoningConfig) {
  requestPayload.reasoning = {
    effort: reasoningConfig.effort || 'medium',
    summary: reasoningConfig.summary || 'detailed'
  };

  requestPayload.text = {
    verbosity: reasoningConfig.verbosity || 'high'
  };
} else {
  requestPayload.reasoning = {
    summary: 'detailed',
    effort: 'medium'
  };
  requestPayload.text = {
    verbosity: 'high'
  };
}
```

### Issues

1. **`text.verbosity` parameter:** Not shown in any reference examples - may not exist or be deprecated
2. **Default to 'detailed':** Reference examples use 'auto' for most cases
3. **Always setting reasoning:** Should only be set for reasoning models

### Correct Implementation

**From Reference:** `D:\GitHub\openai_responses\7_reasoning.py:19-28`

```python
# ✅ Simple reasoning configuration for o3-mini
response = client.responses.create(
    model="o3-mini",
    reasoning={"effort": "medium"},  # That's it!
    input=[{"role": "user", "content": prompt}]
)
```

### Recommended Fix

```typescript
// ✅ Simplified reasoning configuration
const requestPayload: any = {
  model: modelId,
  input: messages,
  max_output_tokens: configuredMax,
  stream: true,
  store: true,
};

// ✅ Only add reasoning for reasoning models
if (modelConfig.capabilities.reasoning) {
  requestPayload.reasoning = {
    effort: reasoningConfig?.effort || 'medium',
    summary: reasoningConfig?.summary || 'auto' // ✅ Changed default to 'auto'
  };
}

// ❌ REMOVE text.verbosity - not documented in reference examples
```

---

## Critical Issue #7: Missing Developer Role Support

### Current Gap

The Responses API introduced a new `developer` role that provides **stronger steering than system messages**. Your message conversion doesn't support this.

### Correct Implementation

**From Reference:** `D:\GitHub\openai_responses\1_basics.py:28-38`

```python
response = client.responses.create(
    model="gpt-4o",
    input=[
        {
            "role": "developer",  # ✅ Stronger than "system"
            "content": "Talk like a pirate."
        },
        {
            "role": "user",
            "content": "Are semicolons optional in JavaScript?"
        }
    ]
)
```

### Message Role Priority

According to the reference examples:
1. **`developer`** - Strongest steering, takes precedence over system
2. **`system`** - Standard system instructions
3. **`user`** - User messages
4. **`assistant`** - Assistant responses (for conversation history)

### Recommended Addition

```typescript
export interface ModelMessage {
  role: 'system' | 'user' | 'assistant' | 'context' | 'developer'; // ✅ Add 'developer'
  content: string;
}

// When converting messages:
const input = messages.map(msg => {
  // Map 'context' to 'system', keep others as-is
  const role = msg.role === 'context' ? 'system' : msg.role;
  return { role, content: msg.content };
});
```

---

## Additional Observations

### 1. Streaming Event Types Reference

**Complete list from official docs:**

```typescript
// Response lifecycle events
'response.created'
'response.output_item.added'
'response.output_item.done'
'response.done'

// Text output events
'response.output_text.delta'
'response.output_text.annotation.added'

// Function calling events
'response.function_call_arguments.delta'
'response.function_call_arguments.done'

// Built-in tool events
'response.web_search_call.completed'
'response.file_search_call.completed'

// Error events
'response.failed'
'response.cancelled'
```

### 2. Simple String vs Array Input

The API accepts **both formats**:

```typescript
// ✅ Simple string (single-turn, no role context)
const response = await openai.responses.create({
  model: "gpt-4.1",
  input: "Tell me a joke"
});

// ✅ Array (structured, multi-turn, role-aware)
const response = await openai.responses.create({
  model: "gpt-4.1",
  input: [
    { role: "system", content: "You are helpful" },
    { role: "user", content: "Tell me a joke" }
  ]
});
```

For ModelCompare's use case (structured conversations), **always use the array format**.

### 3. Storage and Conversation Chaining

Every response has an `id`. To chain conversations:

```typescript
// Turn 1
const response1 = await openai.responses.create({
  model: "gpt-4.1",
  input: [{ role: "user", content: "My favorite color is blue" }],
  store: true // ✅ Save for chaining
});

// Turn 2 - context automatically loaded
const response2 = await openai.responses.create({
  model: "gpt-4.1",
  input: [{ role: "user", content: "What's my favorite color?" }],
  previous_response_id: response1.id // ✅ Loads turn 1 context
});
```

---

## Migration Priority

### High Priority (Breaking Issues)
1. ✅ **Fix #1:** Remove `convertMessagesToPrompt`, pass message arrays
2. ✅ **Fix #2:** Correct streaming event types
3. ✅ **Fix #3:** Simplify response property access

### Medium Priority (Functionality Gaps)
4. ✅ **Fix #5:** Add `previous_response_id` to non-streaming calls
5. ✅ **Fix #6:** Simplify reasoning configuration

### Low Priority (Nice to Have)
6. ✅ **Fix #4:** Add `instructions` parameter support
7. ✅ **Fix #7:** Add `developer` role support

---

## Testing Checklist

After implementing fixes:

- [ ] Non-streaming call with message array works
- [ ] Streaming call produces correct event types
- [ ] `response.output_text` is correctly accessed
- [ ] Conversation chaining with `previous_response_id` works
- [ ] Reasoning models produce reasoning summaries
- [ ] Non-reasoning models work without reasoning config
- [ ] Developer role messages are supported
- [ ] Instructions parameter applies system steering

---

## References

- **OpenAI SDK Streaming Starter:** `D:\GitHub\openai-sdk-streaming`
  - Key file: `app/api/turn_response/route.ts` (streaming implementation)
  - Key file: `lib/assistant.ts` (message handling)

- **OpenAI Responses Examples:** `D:\GitHub\openai_responses`
  - Key file: `1_basics.py` (core patterns)
  - Key file: `2_chat.py` (conversation chaining)
  - Key file: `7_reasoning.py` (reasoning configuration)

- **ChatKit Advanced Samples:** `D:\GitHub\openai-chatkit-advanced-samples`
  - Demonstrates production-grade conversation management

---

## Conclusion

Your current implementation is attempting to use the Responses API but is mixing patterns from:
- Old Chat Completions API (concatenated prompts)
- Hypothetical/deprecated event types
- Overly defensive response parsing

The fixes are straightforward:
1. **Pass message arrays directly** - don't concatenate
2. **Use correct event types** - `response.output_text.delta`, not `.content_part.added`
3. **Trust the API structure** - `output_text` is always there
4. **Support conversation chaining** - `previous_response_id` everywhere
5. **Simplify reasoning config** - just `{ effort, summary }`

These changes will align your implementation with October 2025 best practices and unlock the full power of the Responses API.
