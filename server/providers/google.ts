/**
 * Google Provider
 * 
 * Handles Gemini models with thinking capabilities
 * Author: Replit Agent
 * Date: August 9, 2025
 */

import 'dotenv/config';
import { GoogleGenAI } from '@google/genai';
import { BaseProvider, ModelConfig, ModelResponse, ModelMessage, CallOptions } from './base.js';

const gemini = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export class GoogleProvider extends BaseProvider {
  name = 'Google';
  
  models: ModelConfig[] = [
    {
      id: "gemini-2.5-pro",
      name: "Gemini 2.5 Pro",
      provider: "Google",
      model: "gemini-2.5-pro",
      knowledgeCutoff: "Early 2023",
      capabilities: {
        reasoning: true, // Thinking enabled by default
        multimodal: true,
        functionCalling: true,
        streaming: true,
      },
      pricing: {
        inputPerMillion: 2.50,
        outputPerMillion: 10.00,
      },
      limits: {
        maxTokens: 8192,
        contextWindow: 2000000,
      },
    },
    {
      id: "gemini-2.5-flash",
      name: "Gemini 2.5 Flash",
      provider: "Google",
      model: "gemini-2.5-flash",
      knowledgeCutoff: "Early 2023",
      capabilities: {
        reasoning: true, // Configurable thinking
        multimodal: true,
        functionCalling: true,
        streaming: true,
      },
      pricing: {
        inputPerMillion: 0.075,
        outputPerMillion: 0.30,
      },
      limits: {
        maxTokens: 8192,
        contextWindow: 1000000,
      },
    },
    
    {
      id: "gemini-2.0-flash",
      name: "Gemini 2.0 Flash",
      provider: "Google",
      model: "gemini-2.0-flash",
      knowledgeCutoff: "September 2021",
      capabilities: {
        reasoning: false,
        multimodal: true,
        functionCalling: true,
        streaming: true,
      },
      pricing: {
        inputPerMillion: 0.075,
        outputPerMillion: 0.30,
      },
      limits: {
        maxTokens: 8192,
        contextWindow: 1000000,
      },
    },
  ];

  // Helper method to convert structured messages to Gemini format
  private convertToGeminiContents(messages: ModelMessage[]): string {
    const parts: string[] = [];
    
    for (const message of messages) {
      switch (message.role) {
        case 'system':
          parts.push(`System Instructions: ${message.content}`);
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
    
    // Convert structured messages to Gemini format
    const contents = this.convertToGeminiContents(messages);
    
    // Enable thinking for Gemini 2.5 models that support it
    const enableThinking = model.includes('gemini-2.5') || model.includes('thinking');
    
    const requestConfig: any = {
      model: model,
      contents: contents,
    };
    
    if (enableThinking) {
      requestConfig.config = {
        thinking_config: {
          thinking_budget: 4000 // Allow thinking tokens
        }
      };
    }
    
    const response = await gemini.models.generateContent(requestConfig);
    
    const modelConfig = this.models.find(m => m.id === model);
    const tokenUsage = response.usageMetadata ? {
      input: response.usageMetadata.promptTokenCount || 0,
      output: response.usageMetadata.candidatesTokenCount || 0,
    } : undefined;

    const cost = tokenUsage && modelConfig ? this.calculateCost(modelConfig, tokenUsage) : undefined;

    return {
      content: response.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated',
      reasoning: undefined, // Google doesn't provide reasoning logs yet
      responseTime: Date.now() - startTime,
      systemPrompt: contents, // Include the actual prompt sent to the model
      tokenUsage,
      cost,
      modelConfig: {
        capabilities: modelConfig!.capabilities,
        pricing: modelConfig!.pricing
      }
    };
  }
}