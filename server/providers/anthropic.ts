/**
 * Anthropic Provider
 * 
 * Handles Claude models with extended thinking capabilities
 * Author: Replit Agent
 * Date: August 9, 2025
 */

import 'dotenv/config';
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
      knowledgeCutoff: "April 2024",
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
      knowledgeCutoff: "April 2023",
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
      knowledgeCutoff: "2022",
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
      knowledgeCutoff: "Unknown",
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
    
    const modelConfig = this.models.find(m => m.id === model);
    const supportsReasoning = modelConfig?.capabilities.reasoning;
    
    // Add reasoning instructions for reasoning-capable models
    let finalPrompt = prompt;
    if (supportsReasoning) {
      finalPrompt = `Before providing your final answer, please show your step-by-step reasoning process inside <reasoning> tags. Think through the prompt systematically, analyzing the request and logical connections.

<reasoning>
[Your detailed step-by-step analysis will go here]
</reasoning>

Then provide your final response.

${prompt}`;
    }
    
    const message = await anthropic.messages.create({
      model,
      max_tokens: 2000,
      messages: [{ role: 'user', content: finalPrompt }],
    });
    
    const content = Array.isArray(message.content) 
      ? message.content.map(block => block.type === 'text' ? block.text : '').join('')
      : message.content;
    
    // Extract reasoning from <reasoning> tags if available
    let reasoning = null;
    let cleanedContent = content;
    let reasoningTokens = 0;
    
    if (supportsReasoning) {
      const reasoningMatch = content.match(/<reasoning>([\s\S]*?)<\/reasoning>/);
      if (reasoningMatch) {
        reasoning = reasoningMatch[1].trim();
        reasoningTokens = Math.floor(reasoning.length * 0.75); // Rough token estimate
        // Remove reasoning tags from content
        cleanedContent = content.replace(/<reasoning>[\s\S]*?<\/reasoning>/, '').trim();
      }
    }
    
    const tokenUsage = message.usage ? {
      input: message.usage.input_tokens,
      output: message.usage.output_tokens,
      reasoning: reasoningTokens,
    } : undefined;

    const cost = tokenUsage && modelConfig ? this.calculateCost(modelConfig, tokenUsage) : undefined;

    return {
      content: (message.content[0]?.type === 'text' ? message.content[0].text : 'No response generated'),
      reasoning: undefined, // Anthropic doesn't provide reasoning logs yet
      responseTime: Date.now() - startTime,
      systemPrompt: prompt, // Include the actual prompt sent to the model
      tokenUsage,
      cost,
      modelConfig: {
        capabilities: modelConfig!.capabilities,
        pricing: modelConfig!.pricing
      }
    };
  }
}