/**
 * OpenRouter Provider
 * 
 * Handles OpenRouter models via OpenAI-compatible API, providing access to Grok models and unique models not available through other providers
 * Author: Claude Code using Sonnet 4
 * Date: 2025-01-28
 * PURPOSE: Provides access to Grok models via OpenRouter and unique models like Qwen, Cohere, and Mistral. Uses OpenAI-compatible message conversion pattern from DeepSeek/xAI for consistency. Avoids duplication with existing independent providers.
 * SRP/DRY check: Pass - Single responsibility for OpenRouter API integration, reuses OpenAI-compatible message conversion pattern
 * shadcn/ui: Pass - Backend provider, no UI components needed
 */

import 'dotenv/config';
import OpenAI from 'openai';
import { BaseProvider, ModelConfig, ModelResponse, ModelMessage, CallOptions } from './base.js';

const openrouter = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: 'https://openrouter.ai/api/v1',
  defaultHeaders: {
    'HTTP-Referer': 'https://modelcompare.dev',
    'X-Title': 'ModelCompare - AI Model Comparison Platform'
  }
});

export class OpenRouterProvider extends BaseProvider {
  name = 'OpenRouter';
  
  models: ModelConfig[] = [
    // Grok models via OpenRouter (migrated from deprecated xAI provider)
    {
      id: "openrouter/grok-4",
      name: "Grok 4 (via OpenRouter)",
      provider: "OpenRouter",
      model: "x-ai/grok-4",
      knowledgeCutoff: "October 2024",
      capabilities: {
        reasoning: true,
        multimodal: true,
        functionCalling: true,
        streaming: true,
      },
      pricing: {
        inputPerMillion: 5.00,
        outputPerMillion: 15.00,
      },
      limits: {
        maxTokens: 8192,
        contextWindow: 128000,
      },
    },
    {
      id: "openrouter/grok-3",
      name: "Grok 3 (via OpenRouter)",
      provider: "OpenRouter",
      model: "x-ai/grok-3",
      knowledgeCutoff: "December 2024",
      capabilities: {
        reasoning: true,
        multimodal: true,
        functionCalling: true,
        streaming: true,
      },
      pricing: {
        inputPerMillion: 3.00,
        outputPerMillion: 15.00,
      },
      limits: {
        maxTokens: 8192,
        contextWindow: 131000,
      },
    },
    {
      id: "openrouter/grok-3-mini",
      name: "Grok 3 Mini (via OpenRouter)",
      provider: "OpenRouter",
      model: "x-ai/grok-3-mini",
      knowledgeCutoff: "October 2024",
      capabilities: {
        reasoning: false,
        multimodal: false,
        functionCalling: true,
        streaming: true,
      },
      pricing: {
        inputPerMillion: 0.50,
        outputPerMillion: 2.00,
      },
      limits: {
        maxTokens: 8192,
        contextWindow: 128000,
      },
    },
    {
      id: "openrouter/grok-3-fast",
      name: "Grok 3 Fast (via OpenRouter)",
      provider: "OpenRouter",
      model: "x-ai/grok-3-fast",
      knowledgeCutoff: "December 2024",
      capabilities: {
        reasoning: false,
        multimodal: false,
        functionCalling: true,
        streaming: true,
      },
      pricing: {
        inputPerMillion: 1.00,
        outputPerMillion: 4.00,
      },
      limits: {
        maxTokens: 8192,
        contextWindow: 128000,
      },
    },
    {
      id: "openrouter/grok-3-mini-fast",
      name: "Grok 3 Mini Fast (via OpenRouter)",
      provider: "OpenRouter",
      model: "x-ai/grok-3-mini-fast",
      knowledgeCutoff: "October 2024",
      capabilities: {
        reasoning: false,
        multimodal: false,
        functionCalling: true,
        streaming: true,
      },
      pricing: {
        inputPerMillion: 0.25,
        outputPerMillion: 1.00,
      },
      limits: {
        maxTokens: 8192,
        contextWindow: 128000,
      },
    },
    // Premium frontier models via OpenRouter
    {
      id: "openrouter/qwen-3-235b",
      name: "Qwen 3 235B (via OpenRouter)",
      provider: "OpenRouter",
      model: "qwen/qwen3-235b-a22b-07-25",
      knowledgeCutoff: "July 2025",
      capabilities: {
        reasoning: true,
        multimodal: false,
        functionCalling: true,
        streaming: true,
      },
      pricing: {
        inputPerMillion: 0.15,
        outputPerMillion: 0.85,
      },
      limits: {
        maxTokens: 32768,
        contextWindow: 262000,
      },
    },
    {
      id: "openrouter/llama-4-maverick",
      name: "Llama 4 Maverick (via OpenRouter)",
      provider: "OpenRouter",
      model: "meta-llama/llama-4-maverick",
      knowledgeCutoff: "December 2024",
      capabilities: {
        reasoning: true,
        multimodal: true,
        functionCalling: true,
        streaming: true,
      },
      pricing: {
        inputPerMillion: 0.80,
        outputPerMillion: 2.40,
      },
      limits: {
        maxTokens: 32768,
        contextWindow: 256000,
      },
    },
    {
      id: "openrouter/llama-3.3-70b",
      name: "Llama 3.3 70B (via OpenRouter)",
      provider: "OpenRouter",
      model: "meta-llama/llama-3.3-70b-instruct",
      knowledgeCutoff: "December 2024",
      capabilities: {
        reasoning: false,
        multimodal: false,
        functionCalling: true,
        streaming: true,
      },
      pricing: {
        inputPerMillion: 0.60,
        outputPerMillion: 0.60,
      },
      limits: {
        maxTokens: 16384,
        contextWindow: 131072,
      },
    },
    {
      id: "openrouter/mistral-large",
      name: "Mistral Large (via OpenRouter)",
      provider: "OpenRouter",
      model: "mistral/mistral-large-2411",
      knowledgeCutoff: "October 2024",
      capabilities: {
        reasoning: false,
        multimodal: false,
        functionCalling: true,
        streaming: true,
      },
      pricing: {
        inputPerMillion: 2.00,
        outputPerMillion: 6.00,
      },
      limits: {
        maxTokens: 16384,
        contextWindow: 128000,
      },
    },
    {
      id: "openrouter/command-r-plus",
      name: "Command R+ (via OpenRouter)",
      provider: "OpenRouter",
      model: "cohere/command-r-plus",
      knowledgeCutoff: "April 2024",
      capabilities: {
        reasoning: false,
        multimodal: false,
        functionCalling: true,
        streaming: true,
      },
      pricing: {
        inputPerMillion: 2.50,
        outputPerMillion: 10.00,
      },
      limits: {
        maxTokens: 16384,
        contextWindow: 128000,
      },
    },
  ];

  /**
   * Helper method to convert structured messages to OpenAI-compatible format for OpenRouter API
   * OpenRouter uses OpenAI-compatible chat completions with proper system message support
   * Separates system instructions, combines context with user content for optimal results
   */
  private convertToOpenRouterMessages(messages: ModelMessage[]): Array<{role: 'user' | 'assistant' | 'system', content: string}> {
    const openrouterMessages: Array<{role: 'user' | 'assistant' | 'system', content: string}> = [];
    let systemContent = '';
    let userContent = '';
    let contextContent = '';
    
    // Collect all content by role
    for (const message of messages) {
      switch (message.role) {
        case 'system':
          systemContent += message.content + '\n\n';
          break;
        case 'user':
          userContent += message.content + '\n\n';
          break;
        case 'context':
          contextContent += message.content + '\n\n';
          break;
        case 'assistant':
          openrouterMessages.push({ role: 'assistant', content: message.content });
          break;
      }
    }
    
    // Add system message if we have system content
    if (systemContent.trim()) {
      openrouterMessages.push({ role: 'system', content: systemContent.trim() });
    }
    
    // Combine context and user content into user message
    let finalUserContent = '';
    if (contextContent.trim()) {
      finalUserContent += `Context:\n${contextContent.trim()}\n\n`;
    }
    if (userContent.trim()) {
      finalUserContent += userContent.trim();
    }
    
    if (finalUserContent.trim()) {
      openrouterMessages.push({ role: 'user', content: finalUserContent.trim() });
    }
    
    return openrouterMessages;
  }

  async callModel(messages: ModelMessage[], model: string, options?: CallOptions): Promise<ModelResponse> {
    const startTime = Date.now();
    
    // Convert structured messages to OpenRouter format
    const openrouterMessages = this.convertToOpenRouterMessages(messages);
    
    const response = await openrouter.chat.completions.create({
      model: model,
      messages: openrouterMessages as any,
      max_tokens: options?.maxTokens || 2000,
      temperature: options?.temperature || 0.7,
    });
    
    const modelConfig = this.models.find(m => m.id.includes(model) || m.model === model);
    const tokenUsage = response.usage ? {
      input: response.usage.prompt_tokens,
      output: response.usage.completion_tokens,
    } : undefined;

    const cost = tokenUsage && modelConfig ? this.calculateCost(modelConfig, tokenUsage) : undefined;

    return {
      content: response.choices[0].message.content || "No response generated",
      reasoning: undefined, // OpenRouter doesn't expose reasoning logs directly
      responseTime: Date.now() - startTime,
      systemPrompt: openrouterMessages.map(m => `${m.role}: ${m.content}`).join('\n\n'),
      tokenUsage: tokenUsage,
      cost: cost,
      modelConfig: modelConfig ? {
        capabilities: modelConfig.capabilities,
        pricing: modelConfig.pricing,
      } : undefined,
    };
  }
}