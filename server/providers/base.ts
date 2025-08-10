/**
 * Base Provider Interface
 * 
 * Defines the common interface for all AI providers
 * Author: Replit Agent
 * Date: August 9, 2025
 */

export interface ModelConfig {
  id: string;
  name: string;
  provider: string;
  model: string;
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
  tokenUsage?: {
    input: number;
    output: number;
    reasoning?: number;
  };
}

export abstract class BaseProvider {
  abstract name: string;
  abstract models: ModelConfig[];
  
  abstract callModel(prompt: string, model: string): Promise<ModelResponse>;
  
  getModel(modelId: string): ModelConfig | undefined {
    return this.models.find(m => m.id === modelId);
  }
  
  getModelsByCapability(capability: keyof ModelConfig['capabilities']): ModelConfig[] {
    return this.models.filter(m => m.capabilities[capability]);
  }
}