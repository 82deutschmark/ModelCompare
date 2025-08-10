/**
 * OpenAI Provider
 * 
 * Handles OpenAI GPT models with reasoning capabilities
 * Author: Replit Agent
 * Date: August 9, 2025
 */

import OpenAI from 'openai';
import { BaseProvider, ModelConfig, ModelResponse } from './base.js';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export class OpenAIProvider extends BaseProvider {
  name = 'OpenAI';
  
  models: ModelConfig[] = [
    {
      id: "openai-gpt-5",
      name: "GPT-5",
      provider: "OpenAI",
      model: "gpt-5",
      capabilities: {
        reasoning: true,
        multimodal: true,
        functionCalling: true,
        streaming: true,
      },
      pricing: {
        inputPerMillion: 10.00,
        outputPerMillion: 30.00,
      },
      limits: {
        maxTokens: 4096,
        contextWindow: 128000,
      },
    },
    {
      id: "openai-gpt-4o",
      name: "GPT-4o",
      provider: "OpenAI",
      model: "gpt-4o",
      capabilities: {
        reasoning: false,
        multimodal: true,
        functionCalling: true,
        streaming: true,
      },
      pricing: {
        inputPerMillion: 2.50,
        outputPerMillion: 10.00,
      },
      limits: {
        maxTokens: 4096,
        contextWindow: 128000,
      },
    },
    {
      id: "openai-o1-preview",
      name: "o1-preview",
      provider: "OpenAI",
      model: "o1-preview",
      capabilities: {
        reasoning: true,
        multimodal: false,
        functionCalling: false,
        streaming: false,
      },
      pricing: {
        inputPerMillion: 15.00,
        outputPerMillion: 60.00,
        reasoningPerMillion: 60.00, // Hidden reasoning tokens
      },
      limits: {
        maxTokens: 32768,
        contextWindow: 128000,
      },
    },
    {
      id: "openai-o1-mini",
      name: "o1-mini",
      provider: "OpenAI",
      model: "o1-mini",
      capabilities: {
        reasoning: true,
        multimodal: false,
        functionCalling: false,
        streaming: false,
      },
      pricing: {
        inputPerMillion: 3.00,
        outputPerMillion: 12.00,
        reasoningPerMillion: 12.00,
      },
      limits: {
        maxTokens: 65536,
        contextWindow: 128000,
      },
    },
  ];

  async callModel(prompt: string, model: string): Promise<ModelResponse> {
    const startTime = Date.now();
    
    const response = await openai.chat.completions.create({
      model: model,
      messages: [{ role: "user", content: prompt }],
      max_completion_tokens: 2000,
    });
    
    return {
      content: response.choices[0].message.content || "No response generated",
      reasoning: undefined, // OpenAI o1 models have hidden reasoning, not exposed via API
      responseTime: Date.now() - startTime,
      tokenUsage: response.usage ? {
        input: response.usage.prompt_tokens,
        output: response.usage.completion_tokens,
        reasoning: response.usage.completion_tokens_details?.reasoning_tokens,
      } : undefined,
    };
  }
}