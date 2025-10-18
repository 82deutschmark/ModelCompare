/*
 * Author: gpt-5-codex
 * Date: 2025-10-16 18:34 UTC
 * PURPOSE: Provides the OpenAI provider implementation using the Responses API, including
 *          structured payload construction, retry/timeout logic, and reasoning-aware streaming.
 *          Updated to send native message arrays, adopt the correct streaming lifecycle events,
 *          and expose instructions plus conversation chaining support per October 2025 guidance.
 * SRP/DRY check: Pass - focuses solely on OpenAI API integration and reuses shared provider
 *                abstractions without duplicating cross-provider logic.
 */

import 'dotenv/config';
import OpenAI from 'openai';
import { handleResponsesStreamEvent } from '../streaming/openai-event-handler.js';
import { BaseProvider, ModelConfig, ModelResponse, ModelMessage, CallOptions, StreamingCallOptions } from './base.js';

type ResponseMessage = {
  role: 'system' | 'user' | 'assistant' | 'developer';
  content: string | Array<{ type: 'text'; text: string }>;
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

  private mapMessagesToResponsesInput(messages: ModelMessage[], options?: CallOptions): ResponseMessage[] {
    const normalized: ResponseMessage[] = [];

    if (options?.systemPrompt?.trim()) {
      normalized.push({ role: 'system', content: options.systemPrompt.trim() });
    }

    for (const message of messages) {
      const trimmed = message.content?.trim();
      if (!trimmed) {
        continue;
      }

      let role: ResponseMessage['role'];
      switch (message.role) {
        case 'system':
        case 'assistant':
        case 'user':
        case 'developer':
          role = message.role;
          break;
        case 'context':
          role = 'system';
          break;
        default:
          role = 'user';
          break;
      }

      normalized.push({ role, content: trimmed });
    }

    if (normalized.length === 0) {
      normalized.push({ role: 'user', content: 'No prompt provided.' });
    }

    return normalized;
  }

  private isGpt5Family(modelId?: string): boolean {
    return typeof modelId === 'string' && modelId.startsWith('gpt-5');
  }

  private isOReasoningModel(modelId?: string): boolean {
    return typeof modelId === 'string' && /^o[34]/.test(modelId);
  }

  private supportsReasoningEffort(modelId?: string): boolean {
    return this.isGpt5Family(modelId);
  }

  private supportsVerbosityControl(modelId?: string): boolean {
    return this.isGpt5Family(modelId);
  }

  private getDefaultReasoningSummary(modelId?: string): 'auto' | 'detailed' {
    if (this.isGpt5Family(modelId)) {
      return 'detailed';
    }
    if (this.isOReasoningModel(modelId)) {
      return 'auto';
    }
    return 'auto';
  }

  private buildReasoningPayload(modelId: string, overrides?: CallOptions['reasoningConfig']): {
    reasoning?: Record<string, any>;
    text?: Record<string, any>;
  } {
    const reasoning: Record<string, any> = {};
    const summary = overrides?.summary ?? this.getDefaultReasoningSummary(modelId);

    if (summary) {
      reasoning.summary = summary;
    }

    if (this.supportsReasoningEffort(modelId)) {
      reasoning.effort = overrides?.effort ?? 'medium';
    } else if (overrides?.effort) {
      // Ignore unsupported effort override silently to prevent API errors
    }

    const payload: { reasoning?: Record<string, any>; text?: Record<string, any> } = {};

    if (Object.keys(reasoning).length > 0) {
      payload.reasoning = reasoning;
    }

    const shouldSendVerbosity = this.supportsVerbosityControl(modelId);
    const defaultVerbosity = shouldSendVerbosity ? 'high' : undefined;
    const verbosity = overrides?.verbosity ?? defaultVerbosity;

    if (shouldSendVerbosity && verbosity) {
      payload.text = { verbosity };
    } else if (overrides?.verbosity && !shouldSendVerbosity) {
      // Unsupported verbosity override is ignored to maintain compatibility
    }

    return payload;
  }

  private extractReasoningSummary(response: any): string {
    const summary = response?.output_reasoning?.summary;
    if (typeof summary === 'string') {
      return summary;
    }

    if (Array.isArray(summary)) {
      return summary
        .map(item => {
          if (typeof item === 'string') {
            return item;
          }
          if (item && typeof item === 'object') {
            if (typeof item.text === 'string') {
              return item.text;
            }
            if (typeof item.content === 'string') {
              return item.content;
            }
            return JSON.stringify(item);
          }
          return '';
        })
        .filter(Boolean)
        .join('\n\n');
    }

    if (summary && typeof summary === 'object') {
      if (typeof summary.text === 'string') {
        return summary.text;
      }
      if (typeof summary.content === 'string') {
        return summary.content;
      }
      return JSON.stringify(summary, null, 2);
    }

    if (Array.isArray(response?.output)) {
      const reasoningBlocks = response.output.filter((block: any) => {
        const type = typeof block?.type === 'string' ? block.type.toLowerCase() : '';
        return type === 'reasoning' || type === 'thought' || type === 'reflection';
      });

      if (reasoningBlocks.length > 0) {
        return reasoningBlocks
          .map((block: any) => {
            if (typeof block?.summary === 'string') {
              return block.summary;
            }
            if (typeof block?.content === 'string') {
              return block.content;
            }
            if (Array.isArray(block?.content)) {
              return block.content
                .map((part: any) =>
                  typeof part === 'string'
                    ? part
                    : typeof part?.text === 'string'
                    ? part.text
                    : typeof part?.content === 'string'
                    ? part.content
                    : ''
                )
                .filter(Boolean)
                .join('');
            }
            if (typeof block?.text === 'string') {
              return block.text;
            }
            return JSON.stringify(block);
          })
          .filter(Boolean)
          .join('\n\n');
      }
    }

    return '';
  }

  private extractContentText(response: any): string {
    if (typeof response?.output_text === 'string' && response.output_text.trim().length > 0) {
      return response.output_text;
    }

    if (response?.output_parsed !== undefined) {
      if (typeof response.output_parsed === 'string') {
        return response.output_parsed;
      }
      try {
        return JSON.stringify(response.output_parsed, null, 2);
      } catch {
        return String(response.output_parsed);
      }
    }

    if (Array.isArray(response?.output)) {
      const textBlock = response.output.find((block: any) => {
        const type = typeof block?.type === 'string' ? block.type.toLowerCase() : '';
        return type === 'text' || type === 'message';
      });

      if (textBlock) {
        if (typeof textBlock.text === 'string') {
          return textBlock.text;
        }
        if (typeof textBlock.content === 'string') {
          return textBlock.content;
        }
        if (Array.isArray(textBlock.content)) {
          return textBlock.content
            .map((part: any) =>
              typeof part === 'string'
                ? part
                : typeof part?.text === 'string'
                ? part.text
                : typeof part?.content === 'string'
                ? part.content
                : ''
            )
            .filter(Boolean)
            .join('');
        }
      }
    }

    return '';
  }

  private extractStructuredOutput(response: any): unknown {
    if (!response || typeof response !== 'object') {
      return undefined;
    }

    if (Object.prototype.hasOwnProperty.call(response, 'output_parsed')) {
      return (response as any).output_parsed;
    }

    if (Object.prototype.hasOwnProperty.call(response, 'output_json')) {
      return (response as any).output_json;
    }

    if (Array.isArray((response as any).output)) {
      const structuredBlocks = (response as any).output.filter((block: any) => {
        const type = typeof block?.type === 'string' ? block.type.toLowerCase() : '';
        return type && type !== 'text' && type !== 'message' && type !== 'reasoning';
      });

      if (structuredBlocks.length > 0) {
        const mapped = structuredBlocks
          .map((block: any) => {
            if (block?.data !== undefined) {
              return block.data;
            }
            if (block?.content !== undefined) {
              return block.content;
            }
            if (block?.json !== undefined) {
              return block.json;
            }
            return block;
          })
          .filter((value: unknown) => value !== undefined);

        if (mapped.length === 1) {
          return mapped[0];
        }
        if (mapped.length > 1) {
          return mapped;
        }
      }
    }

    return undefined;
  }

  async callModel(messages: ModelMessage[], model: string, options?: CallOptions): Promise<ModelResponse> {
    const startTime = Date.now();
    const modelConfig = this.models.find(m => m.id === model);
    const input = this.mapMessagesToResponsesInput(messages, options);

    // Configure max_output_tokens
    const isGpt5Series = [
      'gpt-5-2025-08-07',
      'gpt-5-mini-2025-08-07',
      'gpt-5-nano-2025-08-07'
    ].includes(model);
    const envMax = process.env.OPENAI_MAX_OUTPUT_TOKENS ? parseInt(process.env.OPENAI_MAX_OUTPUT_TOKENS, 10) : undefined;
    const desiredMax = envMax ?? (isGpt5Series ? 128000 : 16384);
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
          model: modelConfig?.model ?? model,
          input,
          max_output_tokens: options?.maxTokens ?? maxOutputTokens,
          store: true,
        };

        if (options?.temperature !== undefined && this.supportsTemperature(modelConfig?.model ?? model)) {
          requestPayload.temperature = options.temperature;
        }

        if (options?.instructions?.trim()) {
          requestPayload.instructions = options.instructions.trim();
        }

        if (options?.previousResponseId) {
          requestPayload.previous_response_id = options.previousResponseId;
        }

        if (modelConfig?.capabilities.reasoning) {
          const { reasoning, text } = this.buildReasoningPayload(modelConfig.model, options?.reasoningConfig);
          if (reasoning) {
            requestPayload.reasoning = reasoning;
          }
          if (text) {
            requestPayload.text = { ...(requestPayload.text ?? {}), ...text };
          }
        }

        const response: any = await openai.responses.create(requestPayload, { signal: controller.signal as any });

        clearTimeout(timer);

        const parsedContent = this.extractContentText(response);
        const parsedReasoning = this.extractReasoningSummary(response);
        const content = parsedContent || 'No response generated';
        const reasoningSummary = parsedReasoning || undefined;

        return {
          content,
          reasoning: reasoningSummary,
          responseTime: Date.now() - startTime,
          systemPrompt: options?.systemPrompt,
          tokenUsage: (response.usage ? {
            input: response.usage.input_tokens ?? 0,
            output: response.usage.output_tokens ?? 0,
            reasoning: response.usage.output_tokens_details?.reasoning_tokens ?? undefined,
          } : undefined),
          cost: (response.usage && modelConfig ? this.calculateCost(modelConfig, {
            input: response.usage.input_tokens ?? 0,
            output: response.usage.output_tokens ?? 0,
            reasoning: response.usage.output_tokens_details?.reasoning_tokens ?? undefined,
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
      instructions,
      onReasoningChunk,
      onContentChunk,
      onJsonChunk,
      onStatus,
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
    const input = this.mapMessagesToResponsesInput(normalizedMessages);

    // Configure max_output_tokens
    const isGpt5Series = this.isGpt5Family(modelConfig.model);
    const defaultMax = isGpt5Series ? 128000 : 16384;
    const configuredMax = maxTokens ?? defaultMax;

    try {
      const requestPayload: any = {
        model: modelConfig.model,
        input,
        max_output_tokens: configuredMax,
        stream: true,
        store: true,
      };

      if (previousResponseId) {
        requestPayload.previous_response_id = previousResponseId;
      }

      if (temperature !== undefined && this.supportsTemperature(modelConfig.model)) {
        requestPayload.temperature = temperature;
      }

      if (instructions?.trim()) {
        requestPayload.instructions = instructions.trim();
      }

      if (modelConfig.capabilities.reasoning) {
        const { reasoning, text } = this.buildReasoningPayload(modelConfig.model, reasoningConfig);
        if (reasoning) {
          requestPayload.reasoning = reasoning;
        }
        if (text) {
          requestPayload.text = { ...(requestPayload.text ?? {}), ...text };
        }
      }

      const stream = await openai.responses.stream(requestPayload);

      let aggregatedReasoning = "";
      let aggregatedContent = "";
      const aggregatedJson: unknown[] = [];
      let streamFailed = false;

      for await (const event of stream) {
        handleResponsesStreamEvent(event as any, {
          onStatus: (phase, data) => {
            onStatus?.(phase, data ?? {});
          },
          onReasoningDelta: delta => {
            if (delta) {
              aggregatedReasoning += delta;
              onReasoningChunk(delta);
            }
          },
          onContentDelta: delta => {
            if (delta) {
              aggregatedContent += delta;
              onContentChunk(delta);
            }
          },
          onJsonDelta: json => {
            aggregatedJson.push(json);
            onJsonChunk?.(json);
          },
          onRefusal: payload => {
            const refusalRecord = { refusal: payload };
            aggregatedJson.push(refusalRecord);
            onJsonChunk?.(refusalRecord);
          },
          onError: error => {
            streamFailed = true;
            onError(error);
          }
        });
        if (streamFailed) {
          break;
        }
      }

      if (streamFailed) {
        return;
      }

      const finalResponse = await (stream as any).finalResponse();
      const finalResponseId = finalResponse?.id || '';
      const finalUsage = finalResponse?.usage || null;

      const parsedContent = this.extractContentText(finalResponse);
      const parsedReasoning = this.extractReasoningSummary(finalResponse);
      const structuredOutput = this.extractStructuredOutput(finalResponse);

      if (!aggregatedContent && parsedContent) {
        aggregatedContent = parsedContent;
        onContentChunk(parsedContent);
      }

      if (!aggregatedReasoning && parsedReasoning) {
        aggregatedReasoning = parsedReasoning;
        onReasoningChunk(parsedReasoning);
      }

      if (structuredOutput !== undefined && aggregatedJson.length === 0) {
        aggregatedJson.push(structuredOutput);
        onJsonChunk?.(structuredOutput);
      }

      const finalContent = aggregatedContent || parsedContent || "";
      const finalReasoning = aggregatedReasoning || parsedReasoning || "";
      const finalStructured =
        aggregatedJson.length > 0 ? (aggregatedJson.length === 1 ? aggregatedJson[0] : aggregatedJson) : undefined;

      const cost = modelConfig && finalUsage
        ? this.calculateCost(modelConfig, {
            input: finalUsage.input_tokens || 0,
            output: finalUsage.output_tokens || 0,
            reasoning: finalUsage.output_tokens_details?.reasoning_tokens || 0
          })
        : { total: 0, input: 0, output: 0, reasoning: 0 };

      onComplete(finalResponseId, finalUsage, cost, {
        content: finalContent,
        reasoning: finalReasoning,
        structuredOutput: finalStructured,
      });
    } catch (error: any) {
      console.error('OpenAI streaming error:', error);
      onError(error instanceof Error ? error : new Error(String(error)));
    }
  }

  private supportsTemperature(modelId: string): boolean {
    const normalized = modelId.toLowerCase();
    if (normalized.startsWith('gpt-5')) {
      return false;
    }
    return true;
  }
}
