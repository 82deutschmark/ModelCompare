/**
 * xAI Provider
 * 
 * Handles Grok models via OpenAI-compatible API
 * Author: Replit Agent
 * Date: August 9, 2025
 */

import 'dotenv/config';
import OpenAI from 'openai';
import { BaseProvider, ModelConfig, ModelResponse } from './base.js';

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

  async callModel(prompt: string, model: string): Promise<ModelResponse> {
    const startTime = Date.now();
    
    const response = await grok.chat.completions.create({
      model: model,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 2000,
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
      tokenUsage: tokenUsage,
      cost: cost,
      modelConfig: modelConfig ? {
        capabilities: modelConfig.capabilities,
        pricing: modelConfig.pricing,
      } : undefined,
    };
  }
}