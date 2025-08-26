/**
 * DeepSeek Provider
 * 
 * Handles DeepSeek models with chain-of-thought reasoning
 * Author: Replit Agent
 * Date: August 9, 2025
 */

import 'dotenv/config';
import OpenAI from 'openai';
import { BaseProvider, ModelConfig, ModelResponse, ModelMessage, CallOptions } from './base.js';

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
      knowledgeCutoff: "July 2024",
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
      knowledgeCutoff: "June 2024",
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

  /**
   * Helper method to convert structured messages to OpenAI-compatible format for DeepSeek API
   * DeepSeek uses OpenAI-compatible chat completions with proper system message support
   * Separates system instructions, combines context with user content for optimal reasoning
   */
  private convertToDeepSeekMessages(messages: ModelMessage[]): Array<{role: 'user' | 'assistant' | 'system', content: string}> {
    const deepseekMessages: Array<{role: 'user' | 'assistant' | 'system', content: string}> = [];
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
          deepseekMessages.push({ role: 'assistant', content: message.content });
          break;
      }
    }
    
    // Add system message if we have system content
    if (systemContent.trim()) {
      deepseekMessages.push({ role: 'system', content: systemContent.trim() });
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
      deepseekMessages.push({ role: 'user', content: finalUserContent.trim() });
    }
    
    return deepseekMessages;
  }

  async callModel(messages: ModelMessage[], model: string, options?: CallOptions): Promise<ModelResponse> {
    const startTime = Date.now();
    
    // Convert structured messages to DeepSeek format
    const deepseekMessages = this.convertToDeepSeekMessages(messages);
    
    const response = await deepseek.chat.completions.create({
      model: model,
      messages: deepseekMessages as any,
      max_tokens: options?.maxTokens || 2000,
      temperature: options?.temperature || 0.6, // Recommended for reasoning tasks
    });
    
    const choice = response.choices[0];
    
    const modelConfig = this.models.find(m => m.id === model);
    const tokenUsage = response.usage ? {
      input: response.usage.prompt_tokens,
      output: response.usage.completion_tokens,
      reasoning: (response.usage as any).reasoning_tokens, // R1 specific
    } : undefined;

    const cost = tokenUsage && modelConfig ? this.calculateCost(modelConfig, tokenUsage) : undefined;

    return {
      content: response.choices[0]?.message?.content || 'No response generated',
      reasoning: undefined, // DeepSeek doesn't provide reasoning logs yet
      responseTime: Date.now() - startTime,
      systemPrompt: deepseekMessages.map(m => `${m.role}: ${m.content}`).join('\n\n'),
      tokenUsage,
      cost,
      modelConfig: {
        capabilities: modelConfig!.capabilities,
        pricing: modelConfig!.pricing
      }
    };
  }
}