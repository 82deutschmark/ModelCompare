/**
 * xAI Provider
 * 
 * Handles Grok models via OpenAI-compatible API
 * Author: Replit Agent
 * Date: August 9, 2025
 */

import OpenAI from 'openai';
import { BaseProvider, ModelConfig, ModelResponse } from './base.js';

const grok = new OpenAI({
  baseURL: "https://api.x.ai/v1",
  apiKey: process.env.XAI_API_KEY,
});

export class XAIProvider extends BaseProvider {
  name = 'xAI';
  
  models: ModelConfig[] = [
    {
      id: "grok-4",
      name: "Grok 4",
      provider: "xAI",
      model: "grok-4",
      capabilities: {
        reasoning: true, // Advanced reasoning capabilities
        multimodal: true,
        functionCalling: true,
        streaming: true,
      },
      pricing: {
        inputPerMillion: 5.00,
        outputPerMillion: 15.00,
      },
      limits: {
        maxTokens: 4096,
        contextWindow: 131072,
      },
    },
    {
      id: "grok-2-1212",
      name: "Grok 2",
      provider: "xAI",
      model: "grok-2-1212",
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
        maxTokens: 4096,
        contextWindow: 131072,
      },
    },
    {
      id: "grok-2-vision-1212",
      name: "Grok 2 Vision",
      provider: "xAI",
      model: "grok-2-vision-1212",
      capabilities: {
        reasoning: false,
        multimodal: true,
        functionCalling: true,
        streaming: true,
      },
      pricing: {
        inputPerMillion: 2.00,
        outputPerMillion: 10.00,
      },
      limits: {
        maxTokens: 4096,
        contextWindow: 8192,
      },
    },
  ];

  async callModel(prompt: string, model: string): Promise<ModelResponse> {
    const startTime = Date.now();
    
    const response = await grok.chat.completions.create({
      model: model,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 2000,
    });
    
    return {
      content: response.choices[0].message.content || "No response generated",
      reasoning: undefined, // Grok reasoning not directly exposed
      responseTime: Date.now() - startTime,
      tokenUsage: response.usage ? {
        input: response.usage.prompt_tokens,
        output: response.usage.completion_tokens,
      } : undefined,
    };
  }
}