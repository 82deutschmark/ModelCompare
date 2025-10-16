/*
 * Author: gpt-5-codex
 * Date: 2025-10-16 18:48 UTC
 * PURPOSE: Implements OpenAI Responses API integration with structured messages, streaming,
 *          reasoning-aware cost calculation, and conversation chaining. Updated to align with
 *          October 2025 event schemas by sending role-preserving message arrays, handling
 *          instructions, and consuming the documented streaming events.
 * SRP/DRY check: Pass - encapsulates OpenAI-specific request/response handling while reusing
 *                shared provider abstractions for configuration and cost utilities.
 */

import 'dotenv/config';
import OpenAI from 'openai';
import { BaseProvider, ModelConfig, ModelResponse, ModelMessage, CallOptions, StreamingCallOptions } from './base.js';

type ResponsesMessage = {
  role: 'system' | 'user' | 'assistant' | 'developer';
  content: string;
};

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export class OpenAIProvider extends BaseProvider {
  name = 'OpenAI';
  
  models: ModelConfig[] = [
    {
      id: "gpt-5-2025-08-07",
      name: "GPT-5",
      provider: "OpenAI",
      model: "gpt-5-2025-08-07",
      knowledgeCutoff: "October 2024",
      capabilities: {
        reasoning: true, // Reasoning token support
        multimodal: true,
        functionCalling: true,
        streaming: true,
      },
      pricing: {
        inputPerMillion: 1.25,
        outputPerMillion: 10.00,
      },
      limits: {
        maxTokens: 128000,
        contextWindow: 400000,
      },
    },
    {
  id: "gpt-5-mini-2025-08-07",
  name: "GPT-5 Mini",
  provider: "OpenAI",
  model: "gpt-5-mini-2025-08-07",
  knowledgeCutoff: "October 2024",
  capabilities: {
    reasoning: true, // Reasoning token support
    multimodal: true,
    functionCalling: true,
    streaming: true,
  },
  pricing: {
    inputPerMillion: 0.25,
    outputPerMillion: 2.00,
  },
  limits: {
    maxTokens: 128000,
    contextWindow: 400000,
  },
},
{
  id: "gpt-5-nano-2025-08-07",
  name: "GPT-5 Nano",
  provider: "OpenAI",
  model: "gpt-5-nano-2025-08-07",
  knowledgeCutoff: "May 31, 2024",
  capabilities: {
    reasoning: true, // Reasoning token support (fast/low-cost)
    multimodal: true,
    functionCalling: true,
    streaming: true,
  },
  pricing: {
    inputPerMillion: 0.05,
    outputPerMillion: 0.40,
  },
  limits: {
    maxTokens: 128000,
    contextWindow: 400000,
  },
},
    {
      id: "gpt-4.1-nano-2025-04-14",
      name: "GPT-4.1 Nano",
      provider: "OpenAI",
      model: "gpt-4.1-nano-2025-04-14",
      knowledgeCutoff: "October 2023",
      capabilities: {
        reasoning: false,
        multimodal: true,
        functionCalling: true,
        streaming: true,
      },
      pricing: {
        inputPerMillion: 0.50,
        outputPerMillion: 2.00,
      },
      limits: {
        maxTokens: 16384,
        contextWindow: 128000,
      },
    },
    {
      id: "gpt-4.1-mini-2025-04-14",
      name: "GPT-4.1 Mini",
      provider: "OpenAI",
      model: "gpt-4.1-mini-2025-04-14",
      knowledgeCutoff: "June 2024",
      capabilities: {
        reasoning: false,
        multimodal: true,
        functionCalling: true,
        streaming: true,
      },
      pricing: {
        inputPerMillion: 1.00,
        outputPerMillion: 4.00,
      },
      limits: {
        maxTokens: 16384,
        contextWindow: 128000,
      },
    },
    {
      id: "gpt-4o-mini-2024-07-18",
      name: "GPT-4o Mini",
      provider: "OpenAI",
      model: "gpt-4o-mini-2024-07-18",
      knowledgeCutoff: "October 2023",
      capabilities: {
        reasoning: false,
        multimodal: true,
        functionCalling: true,
        streaming: true,
      },
      pricing: {
        inputPerMillion: 0.15,
        outputPerMillion: 0.60,
      },
      limits: {
        maxTokens: 16384,
        contextWindow: 128000,
      },
    },
    {
      id: "o4-mini-2025-04-16",
      name: "OpenAI o4 Mini",
      provider: "OpenAI",
      model: "o4-mini-2025-04-16",
      knowledgeCutoff: "June 2024",
      capabilities: {
        reasoning: true, // Exposed reasoning logs via Responses API
        multimodal: false,
        functionCalling: false,
        streaming: false,
      },
      pricing: {
        inputPerMillion: 2.00,
        outputPerMillion: 8.00,
      },
      limits: {
        maxTokens: 65536,
        contextWindow: 128000,
      },
    },
    {
      id: "o3-2025-04-16",
      name: "OpenAI o3",
      provider: "OpenAI",
      model: "o3-2025-04-16",
      knowledgeCutoff: "June 2024",
      capabilities: {
        reasoning: true, // Exposed reasoning logs via Responses API
        multimodal: false,
        functionCalling: false,
        streaming: false,
      },
      pricing: {
        inputPerMillion: 15.00,
        outputPerMillion: 60.00,
      },
      limits: {
        maxTokens: 65536,
        contextWindow: 200000,
      },
    },
    {
      id: "gpt-4.1-2025-04-14",
      name: "GPT-4.1",
      provider: "OpenAI",
      model: "gpt-4.1-2025-04-14",
      knowledgeCutoff: "June 2024",
      capabilities: {
        reasoning: false,
        multimodal: true,
        functionCalling: true,
        streaming: true,
      },
      pricing: {
        inputPerMillion: 5.00,
        outputPerMillion: 15.00,
      },
      limits: {
        maxTokens: 16384,
        contextWindow: 200000,
      },
    },
  ];

  private buildResponsesInput(messages: ModelMessage[], systemPrompt?: string): { input: ResponsesMessage[]; promptText: string } {
    const input: ResponsesMessage[] = [];
    const promptParts: string[] = [];

    const appendMessage = (role: ResponsesMessage['role'], text: string) => {
      const trimmed = text.trim();
      if (!trimmed) {
        return;
      }
      input.push({ role, content: trimmed });
      const label = `${role.charAt(0).toUpperCase()}${role.slice(1)}`;
      promptParts.push(`${label}: ${trimmed}`);
    };

    if (systemPrompt?.trim()) {
      appendMessage('system', systemPrompt);
    }

    const mapRole = (role: ModelMessage['role']): ResponsesMessage['role'] => {
      if (role === 'context') {
        return 'system';
      }
      if (role === 'developer') {
        return 'developer';
      }
      if (role === 'assistant' || role === 'system' || role === 'user') {
        return role;
      }
      return 'user';
    };

    for (const message of messages) {
      const text = message.content?.trim();
      if (!text) {
        continue;
      }
      const role = mapRole(message.role);
      appendMessage(role, text);
    }

    if (input.length === 0) {
      appendMessage('user', 'No prompt provided.');
    }

    return { input, promptText: promptParts.join('\n\n') };
  }

  async callModel(messages: ModelMessage[], model: string, options?: CallOptions): Promise<ModelResponse> {
    const startTime = Date.now();
    const modelConfig = this.models.find(m => m.id === model);
    const { input, promptText } = this.buildResponsesInput(messages, options?.systemPrompt);

    // Configure max_output_tokens
    const isGpt5Series = [
      'gpt-5-2025-08-07',
      'gpt-5-mini-2025-08-07',
      'gpt-5-nano-2025-08-07'
    ].includes(model);
    const envMax = process.env.OPENAI_MAX_OUTPUT_TOKENS ? parseInt(process.env.OPENAI_MAX_OUTPUT_TOKENS, 10) : undefined;
    const desiredMax = options?.maxTokens ?? envMax ?? (isGpt5Series ? 128000 : 16384);
    const maxOutputTokens = Math.max(16300, desiredMax);

    // Timeout and retries
    const timeoutMs = process.env.OPENAI_TIMEOUT_MS ? parseInt(process.env.OPENAI_TIMEOUT_MS, 10) : 600000; // 10 minutes
    const maxAttempts = 3;

    let lastError: any;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(new Error('Request timeout')), timeoutMs);
      try {
        const requestPayload: Record<string, any> = {
          model,
          input,
          max_output_tokens: maxOutputTokens,
          store: true,
        };

        if (options?.temperature !== undefined) {
          requestPayload.temperature = options.temperature;
        }

        if (options?.instructions?.trim()) {
          requestPayload.instructions = options.instructions.trim();
        }

        if (options?.previousResponseId) {
          requestPayload.previous_response_id = options.previousResponseId;
        }

        if (modelConfig?.capabilities.reasoning) {
          const reasoningOptions = options?.reasoningConfig ?? {};
          requestPayload.reasoning = {
            effort: reasoningOptions.effort ?? 'medium',
            summary: reasoningOptions.summary ?? 'auto'
          };
        }

        const response: any = await openai.responses.create(requestPayload, { signal: controller.signal as any });

        clearTimeout(timer);

        // Parse content
        const content: string = response.output_text ?? 'No response generated';

        // Parse reasoning summary if available
        const reasoningSummary: string | undefined = response.output_reasoning?.summary ?? undefined;

        const inputTokens = response.usage?.input_tokens ?? 0;
        const outputTokens = response.usage?.output_tokens ?? 0;
        const reasoningTokens = response.usage?.output_tokens_details?.reasoning_tokens;

        return {
          content,
          reasoning: reasoningSummary,
          responseTime: Date.now() - startTime,
          systemPrompt: promptText,
          tokenUsage: response.usage ? {
            input: inputTokens,
            output: outputTokens,
            reasoning: reasoningTokens ?? undefined,
          } : undefined,
          cost: (response.usage && modelConfig ? this.calculateCost(modelConfig, {
            input: inputTokens,
            output: outputTokens,
            reasoning: reasoningTokens ?? undefined,
          }) : undefined),
          modelConfig: modelConfig ? {
            capabilities: modelConfig.capabilities,
            pricing: modelConfig.pricing,
          } : undefined,
          // @ts-ignore - extend shape with responseId for downstream use
          responseId: response.id,
        } as any;
      } catch (error: any) {
        clearTimeout(timer);
        lastError = error;
        const status = (error && (error.status || error.statusCode)) ?? undefined;
        const retriable = status === 429 || (status && status >= 500 && status < 600) || (error?.name === 'AbortError');
        if (attempt < maxAttempts && retriable) {
          const backoffMs = 500 * Math.pow(2, attempt - 1);
          await new Promise(r => setTimeout(r, backoffMs));
          continue;
        }
        // On timeout or error without response, include partials if any aren't available in this SDK error
        throw error;
      }
    }
    // If loop exits unexpectedly, throw last error
    throw lastError || new Error('OpenAI Responses request failed');
  }

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
      reasoningConfig,
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

    const normalizedMessages: ModelMessage[] = messages.map(message => ({
      role: (['system', 'user', 'assistant', 'context', 'developer'] as const).includes(message.role as any)
        ? (message.role as ModelMessage['role'])
        : 'user',
      content: message.content,
      metadata: (message as { metadata?: Record<string, any> }).metadata,
    }));
    const { input } = this.buildResponsesInput(normalizedMessages, undefined);

    // Configure max_output_tokens
    const isGpt5Series = modelId.startsWith('gpt-5');
    const envMax = process.env.OPENAI_MAX_OUTPUT_TOKENS ? parseInt(process.env.OPENAI_MAX_OUTPUT_TOKENS, 10) : undefined;
    const defaultMax = isGpt5Series ? 128000 : 16384;
    const desiredMax = maxTokens ?? envMax ?? defaultMax;
    const configuredMax = Math.max(16300, desiredMax);

    try {
      // Build Responses API request with proper reasoning configuration
      const requestPayload: any = {
        model: modelId,
        input,
        max_output_tokens: configuredMax,
        stream: true, // Enable streaming
        store: true,
      };

      // Add conversation chaining if applicable
      if (previousResponseId) {
        requestPayload.previous_response_id = previousResponseId;
      }

      // Add temperature if provided
      if (temperature !== undefined) {
        requestPayload.temperature = temperature;
      }

      if (reasoningConfig && modelConfig.capabilities.reasoning) {
        requestPayload.reasoning = {
          effort: reasoningConfig.effort ?? 'medium',
          summary: reasoningConfig.summary ?? 'auto'
        };
      } else if (modelConfig.capabilities.reasoning) {
        requestPayload.reasoning = { summary: 'auto', effort: 'medium' };
      }

      // Create streaming response
      const response = await openai.responses.create(requestPayload);

      if (!response || !(response as any)[Symbol.asyncIterator]) {
        onError(new Error('Streaming not supported by OpenAI SDK version'));
        return;
      }

      const stream = response as any;

      let accumulatedReasoning = '';
      let accumulatedContent = '';
      let finalResponseId = '';
      let finalTokenUsage: any = null;

      // Process stream chunks using documented Responses API events
      for await (const event of stream) {
        switch (event.type) {
          case 'response.output_text.delta': {
            const delta = typeof event.delta === 'string' ? event.delta : '';
            if (delta) {
              accumulatedContent += delta;
              onContentChunk(delta);
            }
            break;
          }
          case 'response.output_text.done': {
            if (!accumulatedContent && typeof event.output_text === 'string') {
              accumulatedContent = event.output_text;
            }
            break;
          }
          case 'response.done': {
            finalResponseId = event.response?.id ?? '';
            finalTokenUsage = event.response?.usage ?? null;

            const reasoningSummary = event.response?.output_reasoning?.summary;
            if (reasoningSummary) {
              accumulatedReasoning = reasoningSummary;
              onReasoningChunk(reasoningSummary);
            }

            if (!accumulatedContent && typeof event.response?.output_text === 'string') {
              accumulatedContent = event.response.output_text;
            }
            break;
          }
          case 'response.failed': {
            const message = event.error?.message ?? 'OpenAI streaming request failed';
            throw new Error(message);
          }
          default:
            break;
        }
      }

      const usageInput = finalTokenUsage?.input_tokens ?? 0;
      const usageOutput = finalTokenUsage?.output_tokens ?? 0;
      const reasoningTokens = finalTokenUsage?.output_tokens_details?.reasoning_tokens ?? undefined;

      const cost = modelConfig
        ? this.calculateCost(modelConfig, {
            input: usageInput,
            output: usageOutput,
            reasoning: reasoningTokens,
          })
        : { total: 0, input: 0, output: 0, reasoning: reasoningTokens ?? 0 };

      onComplete(finalResponseId, finalTokenUsage, cost, accumulatedContent, accumulatedReasoning);

    } catch (error: any) {
      console.error('OpenAI streaming error:', error);
      onError(error);
    }
  }
}