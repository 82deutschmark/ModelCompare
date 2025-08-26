/**
 * xAI Provider
 * 
 * Handles Grok models via OpenAI-compatible API
 * Author: Replit Agent
 * Date: August 9, 2025
 */

import 'dotenv/config';
import OpenAI from 'openai';
import { BaseProvider, ModelConfig, ModelResponse, ModelMessage, CallOptions } from './base.js';

const grok = new OpenAI({
  baseURL: "https://api.x.ai/v1",
  apiKey: process.env.GROK_API_KEY,
});

export class XAIProvider extends BaseProvider {
  name = 'xAI';
  
  models: ModelConfig[] = [
    {
      id: "grok-4-0709",
      name: "Grok 4",
      provider: "xAI",
      model: "grok-4-0709",
      knowledgeCutoff: "October 2023",
      capabilities: {
        reasoning: true, // Reasoning model with potential reasoning logs
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
      id: "grok-3",
      name: "Grok 3",
      provider: "xAI",
      model: "grok-3",
      knowledgeCutoff: "December 2024",
      capabilities: {
        reasoning: false,
        multimodal: false,
        functionCalling: true,
        streaming: true,
      },
      pricing: {
        inputPerMillion: 2.00,
        outputPerMillion: 10.00,
      },
      limits: {
        maxTokens: 8192,
        contextWindow: 128000,
      },
    },
    {
      id: "grok-3-mini",
      name: "Grok 3 Mini",
      provider: "xAI",
      model: "grok-3-mini",
      knowledgeCutoff: "October 2023",
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
      id: "grok-3-fast",
      name: "Grok 3 Fast",
      provider: "xAI",
      model: "grok-3-fast",
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
      id: "grok-3-mini-fast",
      name: "Grok 3 Mini Fast",
      provider: "xAI",
      model: "grok-3-mini-fast",
      knowledgeCutoff: "October 2023",
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
  ];

  // Helper method to convert structured messages to OpenAI format for Grok
  private convertToGrokMessages(messages: ModelMessage[]): Array<{role: 'user' | 'assistant' | 'system', content: string}> {
    const grokMessages: Array<{role: 'user' | 'assistant' | 'system', content: string}> = [];
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
          grokMessages.push({ role: 'assistant', content: message.content });
          break;
      }
    }
    
    // Add system message if we have system content
    if (systemContent.trim()) {
      grokMessages.push({ role: 'system', content: systemContent.trim() });
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
      grokMessages.push({ role: 'user', content: finalUserContent.trim() });
    }
    
    return grokMessages;
  }

  async callModel(messages: ModelMessage[], model: string, options?: CallOptions): Promise<ModelResponse> {
    const startTime = Date.now();
    
    // Convert structured messages to Grok format
    const grokMessages = this.convertToGrokMessages(messages);
    
    const response = await grok.chat.completions.create({
      model: model,
      messages: grokMessages as any,
      max_tokens: options?.maxTokens || 2000,
      temperature: options?.temperature,
    });
    
    const modelConfig = this.models.find(m => m.id === model);
    const tokenUsage = response.usage ? {
      input: response.usage.prompt_tokens,
      output: response.usage.completion_tokens,
    } : undefined;

    const cost = tokenUsage && modelConfig ? this.calculateCost(modelConfig, tokenUsage) : undefined;

    return {
      content: response.choices[0].message.content || "No response generated",
      reasoning: undefined, // Grok reasoning not directly exposed via API
      responseTime: Date.now() - startTime,
      systemPrompt: grokMessages.map(m => `${m.role}: ${m.content}`).join('\n\n'),
      tokenUsage: tokenUsage,
      cost: cost,
      modelConfig: modelConfig ? {
        capabilities: modelConfig.capabilities,
        pricing: modelConfig.pricing,
      } : undefined,
    };
  }
}