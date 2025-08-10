/**
 * Anthropic Provider
 * 
 * Handles Claude models with extended thinking capabilities
 * Author: Replit Agent
 * Date: August 9, 2025
 */

import Anthropic from '@anthropic-ai/sdk';
import { BaseProvider, ModelConfig, ModelResponse } from './base.js';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export class AnthropicProvider extends BaseProvider {
  name = 'Anthropic';
  
  models: ModelConfig[] = [
    {
      id: "claude-sonnet-4-20250514",
      name: "Claude Sonnet 4",
      provider: "Anthropic",
      model: "claude-sonnet-4-20250514",
      capabilities: {
        reasoning: true, // Extended thinking available
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
        contextWindow: 200000,
      },
    },
    {
      id: "claude-3-7-sonnet-20250219",
      name: "Claude 3.7 Sonnet",
      provider: "Anthropic",
      model: "claude-3-7-sonnet-20250219",
      capabilities: {
        reasoning: true, // Full thinking output available
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
        contextWindow: 200000,
      },
    },
    {
      id: "claude-3-5-sonnet-20241022",
      name: "Claude 3.5 Sonnet",
      provider: "Anthropic",
      model: "claude-3-5-sonnet-20241022",
      capabilities: {
        reasoning: false,
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
        contextWindow: 200000,
      },
    },
    {
      id: "claude-3-haiku-20240307",
      name: "Claude 3 Haiku",
      provider: "Anthropic",
      model: "claude-3-haiku-20240307",
      capabilities: {
        reasoning: false,
        multimodal: true,
        functionCalling: true,
        streaming: true,
      },
      pricing: {
        inputPerMillion: 0.25,
        outputPerMillion: 1.25,
      },
      limits: {
        maxTokens: 4096,
        contextWindow: 200000,
      },
    },
  ];

  async callModel(prompt: string, model: string): Promise<ModelResponse> {
    const startTime = Date.now();
    
    // Enable thinking for Claude 3.7 Sonnet and Claude 4 models
    const enableThinking = model.includes('claude-3-7-sonnet') || 
                          model.includes('claude-4') || 
                          model.includes('claude-sonnet-4');
    
    const requestConfig: any = {
      model,
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    };
    
    if (enableThinking) {
      requestConfig.thinking = {
        type: "enabled",
        budget_tokens: 4000
      };
    }
    
    const message = await anthropic.messages.create(requestConfig);
    
    const content = Array.isArray(message.content) 
      ? message.content.map(block => block.type === 'text' ? block.text : '').join('')
      : message.content;
    
    return {
      content,
      reasoning: (message as any).thinking_content || undefined, // Thinking logs for supported models
      responseTime: Date.now() - startTime,
      tokenUsage: message.usage ? {
        input: message.usage.input_tokens,
        output: message.usage.output_tokens,
      } : undefined,
    };
  }
}