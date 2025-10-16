/*
 * Author: gpt-5-codex
 * Date: 2025-10-16 18:34 UTC
 * PURPOSE: Declares shared provider contracts, including model metadata, message roles, and
 *          invocation option shapes leveraged by all providers. Updated to expose the developer
 *          role, instructions steering, conversation chaining, and reasoning configuration options
 *          required for the Responses API fixes.
 * SRP/DRY check: Pass - File centralizes provider type definitions without duplicating logic from
 *                concrete provider implementations.
 */

export interface ModelConfig {
  id: string;
  name: string;
  provider: string;
  model: string;
  knowledgeCutoff: string;
  capabilities: {
    reasoning: boolean;
    multimodal: boolean;
    functionCalling: boolean;
    streaming: boolean;
  };
  pricing: {
    inputPerMillion: number;
    outputPerMillion: number;
    reasoningPerMillion?: number;
  };
  limits: {
    maxTokens: number;
    contextWindow: number;
  };
}

export interface ModelResponse {
  content: string;
  reasoning?: string;
  responseTime: number;
  systemPrompt?: string; // The actual prompt sent to the model
  tokenUsage?: {
    input: number;
    output: number;
    reasoning?: number;
  };
  cost?: {
    input: number;
    output: number;
    reasoning?: number;
    total: number;
  };
  modelConfig?: {
    capabilities: {
      reasoning: boolean;
      multimodal: boolean;
      functionCalling: boolean;
      streaming: boolean;
    };
    pricing: {
      inputPerMillion: number;
      outputPerMillion: number;
      reasoningPerMillion?: number;
    };
  };
}

/**
 * Structured message interface for provider communication
 * Enables proper role separation for advanced prompt engineering
 */
export interface ModelMessage {
  /** Message role - system for instructions, user for queries, context for additional info */
  role: 'system' | 'user' | 'assistant' | 'context' | 'developer';
  /** The actual message content */
  content: string;
  /** Optional metadata for message tracking and processing */
  metadata?: Record<string, any>;
}

/**
 * Call options for model invocation
 * Provides fine-grained control over model behavior
 */
export interface CallOptions {
  /** Model temperature (0.0-1.0) for response randomness */
  temperature?: number;
  /** Maximum tokens to generate */
  maxTokens?: number;
  /** Legacy system prompt (prefer structured messages) */
  systemPrompt?: string;
  /** Responses API instructions field for high-priority steering */
  instructions?: string;
  /** Continue a stored conversation by referencing the previous response id */
  previousResponseId?: string;
  /** Fine-grained reasoning configuration for capable models */
  reasoningConfig?: {
    effort?: 'low' | 'medium' | 'high';
    summary?: 'auto' | 'detailed';
    verbosity?: 'low' | 'medium' | 'high';
  };
}

export interface StreamingCallbacks {
  onReasoningChunk: (chunk: string) => void;
  onContentChunk: (chunk: string) => void;
  onComplete: (responseId: string, tokenUsage: any, cost: any, content?: string, reasoning?: string) => void;
  onError: (error: Error) => void;
}

export interface StreamingCallOptions {
  modelId: string;
  messages: Array<{ role: string; content: string }>;
  previousResponseId?: string; // For conversation chaining
  temperature?: number;
  maxTokens?: number;
  // Reasoning configuration for advanced models
  reasoningConfig?: {
    effort?: 'low' | 'medium' | 'high';
    summary?: 'auto' | 'detailed';
    verbosity?: 'low' | 'medium' | 'high';
  };
  /** Optional Responses API instructions steering */
  instructions?: string;
  onReasoningChunk: (chunk: string) => void;
  onContentChunk: (chunk: string) => void;
  onComplete: (responseId: string, tokenUsage: any, cost: any, content?: string, reasoning?: string) => void;
  onError: (error: Error) => void;
}

export abstract class BaseProvider {
  abstract name: string;
  abstract models: ModelConfig[];
  
  /** 
   * Call model with structured messages instead of flat string prompts
   * Enables proper system/user/context role separation for advanced prompt engineering
   * @param messages Array of structured messages with roles and content
   * @param model Model identifier to use for generation
   * @param options Optional generation parameters (temperature, maxTokens, etc.)
   * @returns Promise resolving to model response with content, reasoning, timing, and costs
   */
  abstract callModel(messages: ModelMessage[], model: string, options?: CallOptions): Promise<ModelResponse>;
  
  /** 
   * Streaming call with reasoning support
   * Must be implemented by providers that support reasoning models
   */
  abstract callModelStreaming?(options: StreamingCallOptions): Promise<void>;
  
  getModel(modelId: string): ModelConfig | undefined {
    return this.models.find(m => m.id === modelId);
  }
  
  getModelsByCapability(capability: keyof ModelConfig['capabilities']): ModelConfig[] {
    return this.models.filter(m => m.capabilities[capability]);
  }
  
  // Calculate actual cost based on token usage
  calculateCost(modelConfig: ModelConfig, tokenUsage: { input: number; output: number; reasoning?: number }): {
    input: number;
    output: number;
    reasoning?: number;
    total: number;
  } {
    const inputCost = (tokenUsage.input / 1_000_000) * modelConfig.pricing.inputPerMillion;
    const outputCost = (tokenUsage.output / 1_000_000) * modelConfig.pricing.outputPerMillion;
    
    let reasoningCost = 0;
    if (tokenUsage.reasoning && modelConfig.pricing.reasoningPerMillion) {
      reasoningCost = (tokenUsage.reasoning / 1_000_000) * modelConfig.pricing.reasoningPerMillion;
    }
    
    const total = inputCost + outputCost + reasoningCost;
    
    return {
      input: inputCost,
      output: outputCost,
      reasoning: tokenUsage.reasoning ? reasoningCost : undefined,
      total: total
    };
  }
}