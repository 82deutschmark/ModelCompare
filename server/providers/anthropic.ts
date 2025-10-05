/**
 * Anthropic Provider
 * 
 * Handles Claude models with extended thinking capabilities
 * Author: Cascade using Claude Sonnet 4
 * Date: 2025-10-04
 * PURPOSE: Provides integration with Anthropic's Claude models including Sonnet 4.5, 4, 3.7, 3.5, and Haiku variants.
 *          Manages reasoning extraction, message formatting, and token usage tracking.
 * SRP/DRY check: Pass - Single responsibility for Anthropic API integration
 */

import 'dotenv/config';
import Anthropic from '@anthropic-ai/sdk';
import { BaseProvider, ModelConfig, ModelResponse, ModelMessage, CallOptions } from './base.js';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export class AnthropicProvider extends BaseProvider {
  name = 'Anthropic';
  
  models: ModelConfig[] = [
    {
      id: "claude-sonnet-4-5-20250929",
      name: "Claude Sonnet 4.5 (Sep 29 2025)",
      provider: "Anthropic",
      model: "claude-sonnet-4-5",
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
        maxTokens: 64000,
        contextWindow: 200000,
      },
    },
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

  /**
   * Helper method to convert structured messages to Anthropic Messages API format
   * Anthropic requires alternating user/assistant messages with system content embedded
   * System and context messages are combined into user messages for compatibility
   */
  private convertToAnthropicMessages(messages: ModelMessage[]): Array<{role: 'user' | 'assistant', content: string}> {
    const anthropicMessages: Array<{role: 'user' | 'assistant', content: string}> = [];
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
          anthropicMessages.push({ role: 'assistant', content: message.content });
          break;
      }
    }
    
    // Combine system, context, and user content into user message
    let finalUserContent = '';
    if (systemContent.trim()) {
      finalUserContent += `System Instructions:\n${systemContent.trim()}\n\n`;
    }
    if (contextContent.trim()) {
      finalUserContent += `Context:\n${contextContent.trim()}\n\n`;
    }
    if (userContent.trim()) {
      finalUserContent += `User Request:\n${userContent.trim()}`;
    }
    
    if (finalUserContent.trim()) {
      anthropicMessages.push({ role: 'user', content: finalUserContent.trim() });
    }
    
    return anthropicMessages;
  }

  async callModel(messages: ModelMessage[], model: string, options?: CallOptions): Promise<ModelResponse> {
    const startTime = Date.now();
    
    const modelConfig = this.models.find(m => m.id === model);
    const supportsReasoning = modelConfig?.capabilities.reasoning;
    
    // Convert structured messages to Anthropic format
    const anthropicMessages = this.convertToAnthropicMessages(messages);
    
    // Add reasoning instructions for reasoning-capable models
    if (supportsReasoning && anthropicMessages.length > 0) {
      const lastUserMessage = anthropicMessages[anthropicMessages.length - 1];
      if (lastUserMessage.role === 'user') {
        lastUserMessage.content = `Before providing your final answer, please show your step-by-step reasoning process inside <reasoning> tags. Think through the prompt systematically, analyzing the request and logical connections.

<reasoning>
[Your detailed step-by-step analysis will go here]
</reasoning>

Then provide your final response.

${lastUserMessage.content}`;
      }
    }
    
    const message = await anthropic.messages.create({
      model,
      max_tokens: options?.maxTokens || 2000,
      temperature: options?.temperature,
      messages: anthropicMessages,
    });
    
    const content = Array.isArray(message.content) 
      ? message.content.map(block => block.type === 'text' ? block.text : '').join('')
      : message.content;
    
    // Extract reasoning from <reasoning> tags if available
    let reasoning: string | undefined = undefined;
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
      reasoning: reasoning,
      responseTime: Date.now() - startTime,
      systemPrompt: anthropicMessages.map(m => m.content).join('\n\n'),
      tokenUsage,
      cost,
      modelConfig: {
        capabilities: modelConfig!.capabilities,
        pricing: modelConfig!.pricing
      }
    };
  }
}