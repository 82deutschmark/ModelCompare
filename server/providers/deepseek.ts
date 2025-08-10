/**
 * DeepSeek Provider
 * 
 * Handles DeepSeek models with chain-of-thought reasoning
 * Author: Replit Agent
 * Date: August 9, 2025
 */

import OpenAI from 'openai';
import { BaseProvider, ModelConfig, ModelResponse } from './base.js';

const deepseek = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: 'https://api.deepseek.com',
});

export class DeepSeekProvider extends BaseProvider {
  name = 'DeepSeek';
  
  models: ModelConfig[] = [
    {
      id: "deepseek-reasoner",
      name: "DeepSeek R1 Reasoner",
      provider: "DeepSeek",
      model: "deepseek-reasoner",
      capabilities: {
        reasoning: true, // Full chain-of-thought reasoning available
        multimodal: false,
        functionCalling: true,
        streaming: true,
      },
      pricing: {
        inputPerMillion: 0.55, // Cache miss
        outputPerMillion: 2.19, // Including CoT
        reasoningPerMillion: 2.19,
      },
      limits: {
        maxTokens: 8000,
        contextWindow: 128000,
      },
    },
    {
      id: "deepseek-chat",
      name: "DeepSeek V3 Chat",
      provider: "DeepSeek",
      model: "deepseek-chat",
      capabilities: {
        reasoning: false,
        multimodal: false,
        functionCalling: true,
        streaming: true,
      },
      pricing: {
        inputPerMillion: 0.27, // Cache miss
        outputPerMillion: 1.10,
      },
      limits: {
        maxTokens: 4000,
        contextWindow: 128000,
      },
    },
  ];

  async callModel(prompt: string, model: string): Promise<ModelResponse> {
    const startTime = Date.now();
    
    const response = await deepseek.chat.completions.create({
      model: model,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 2000,
      temperature: 0.6, // Recommended for reasoning tasks
    });
    
    const choice = response.choices[0];
    
    return {
      content: choice.message.content || "No response generated",
      reasoning: (choice.message as any).reasoning_content || undefined, // DeepSeek R1 provides visible reasoning
      responseTime: Date.now() - startTime,
      tokenUsage: response.usage ? {
        input: response.usage.prompt_tokens,
        output: response.usage.completion_tokens,
        reasoning: (response.usage as any).reasoning_tokens, // R1 specific
      } : undefined,
    };
  }
}