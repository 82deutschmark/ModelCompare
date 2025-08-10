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
      id: "gpt-4.1-nano-2025-04-14",
      name: "GPT-4.1 Nano",
      provider: "OpenAI",
      model: "gpt-4.1-nano-2025-04-14",
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

  async callModel(prompt: string, model: string): Promise<ModelResponse> {
    const startTime = Date.now();
    
    const modelConfig = this.models.find(m => m.id === model);
    const supportsReasoning = modelConfig?.capabilities.reasoning;
    const reasoningModels = ['o3-mini-2025-01-31', 'o4-mini-2025-04-16', 'o3-2025-04-16'];
    
    let response: any;
    let reasoning = null;
    
    // Use Responses API for reasoning models, ChatCompletions for others
    if (supportsReasoning && reasoningModels.includes(model)) {
      try {
        response = await openai.responses.create({
          model: model,
          input: [{ role: "user", content: prompt }],
          reasoning: {
            effort: "medium",
            summary: "detailed"
          }
        });
        
        // Extract reasoning logs from Responses API output array
        const reasoningParts: string[] = [];
        for (const outputItem of (response as any).output ?? []) {
          if (outputItem.type === "reasoning") {
            if (Array.isArray(outputItem.summary)) {
              reasoningParts.push(outputItem.summary.map((s: any) => s.text).join("\n"));
            } else if (typeof outputItem.summary === 'string') {
              reasoningParts.push(outputItem.summary);
            }
          }
        }
        
        if (reasoningParts.length) {
          reasoning = reasoningParts.join("\n\n");
        }
        
        return {
          content: (response as any).output_text || "No response generated",
          reasoning,
          responseTime: Date.now() - startTime,
          tokenUsage: undefined, // Responses API doesn't provide usage
          modelConfig: modelConfig ? {
            capabilities: modelConfig.capabilities,
            pricing: modelConfig.pricing,
          } : undefined,
        };
      } catch (error) {
        console.warn(`Responses API failed for ${model}, falling back to ChatCompletions:`, error);
      }
    }
    
    // Standard ChatCompletions API for non-reasoning models or fallback
    const chatResponse = await openai.chat.completions.create({
      model: model,
      messages: [{ role: "user", content: prompt }],
      max_completion_tokens: 2000,
    });
    
    return {
      content: chatResponse.choices[0].message.content || "No response generated",
      reasoning,
      responseTime: Date.now() - startTime,
      tokenUsage: chatResponse.usage ? {
        input: chatResponse.usage.prompt_tokens,
        output: chatResponse.usage.completion_tokens,
        reasoning: chatResponse.usage.completion_tokens_details?.reasoning_tokens,
      } : undefined,
      modelConfig: modelConfig ? {
        capabilities: modelConfig.capabilities,
        pricing: modelConfig.pricing,
      } : undefined,
    };
  }
}