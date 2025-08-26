/**
 * OpenAI Provider
 *
 * Handles OpenAI models via the Responses API with reasoning support only.
 * This migration removes Chat Completions usage and standardizes parsing of
 * output_text and output_reasoning. Adds timeout/backoff and large token caps.
 * Author: Cascade
 * Date: August 20, 2025
 */

import 'dotenv/config';
import OpenAI from 'openai';
import { BaseProvider, ModelConfig, ModelResponse, ModelMessage, CallOptions } from './base.js';

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

  // Helper method to convert structured messages to prompt string for Responses API
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
        case 'context':
          parts.push(`Context: ${message.content}`);
          break;
        case 'assistant':
          parts.push(`Assistant: ${message.content}`);
          break;
      }
    }
    
    return parts.join('\n\n');
  }

  async callModel(messages: ModelMessage[], model: string, options?: CallOptions): Promise<ModelResponse> {
    const startTime = Date.now();
    const modelConfig = this.models.find(m => m.id === model);
    
    // Convert structured messages to prompt string for Responses API
    const prompt = this.convertMessagesToPrompt(messages);

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
        const response: any = await openai.responses.create({
          model,
          input: prompt,
          reasoning: { summary: 'auto' },
          max_output_tokens: maxOutputTokens,
        }, { signal: controller.signal as any });

        clearTimeout(timer);

        // Parse content
        const outputText: string = response.output_text || '';
        let content = outputText;
        if (!content && Array.isArray(response.output)) {
          // Fallback scan for first text content
          const textBlock = response.output.find((b: any) => b.type === 'output_text' || b.type === 'message' || b.type === 'text');
          if (textBlock?.content) {
            content = typeof textBlock.content === 'string' ? textBlock.content : String(textBlock.content);
          }
        }
        if (!content) content = 'No response generated';

        // Parse reasoning
        const reasoningSummary: string | undefined = response.output_reasoning?.summary
          || (Array.isArray(response.output_reasoning?.items) && response.output_reasoning.items.length
                ? undefined
                : undefined);

        return {
          content,
          reasoning: reasoningSummary,
          responseTime: Date.now() - startTime,
          systemPrompt: prompt,
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
}