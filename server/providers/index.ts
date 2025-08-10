/**
 * AI Provider Registry
 * 
 * Central registry for all AI providers and their models
 * Author: Replit Agent
 * Date: August 9, 2025
 */

import { BaseProvider, type ModelConfig, type ModelResponse } from './base.js';
import { OpenAIProvider } from './openai.js';
import { AnthropicProvider } from './anthropic.js';
import { GoogleProvider } from './google.js';
import { DeepSeekProvider } from './deepseek.js';
import { XAIProvider } from './xai.js';

// Initialize all providers
const providers: BaseProvider[] = [
  new OpenAIProvider(),
  new AnthropicProvider(),
  new GoogleProvider(),
  new DeepSeekProvider(),
  new XAIProvider(),
];

// Provider registry functions
export function getAllModels(): ModelConfig[] {
  return providers.flatMap(provider => provider.models);
}

export function getModelById(modelId: string): ModelConfig | undefined {
  for (const provider of providers) {
    const model = provider.getModel(modelId);
    if (model) return model;
  }
  return undefined;
}

export function getProviderByModelId(modelId: string): BaseProvider | undefined {
  for (const provider of providers) {
    if (provider.getModel(modelId)) {
      return provider;
    }
  }
  return undefined;
}

export function getModelsByCapability(capability: keyof ModelConfig['capabilities']): ModelConfig[] {
  return providers.flatMap(provider => provider.getModelsByCapability(capability));
}

export function getReasoningModels(): ModelConfig[] {
  return getModelsByCapability('reasoning');
}

export async function callModel(prompt: string, modelId: string): Promise<ModelResponse & { modelConfig: ModelConfig }> {
  const provider = getProviderByModelId(modelId);
  const modelConfig = getModelById(modelId);
  
  if (!provider || !modelConfig) {
    throw new Error(`Model ${modelId} not found`);
  }
  
  try {
    const response = await provider.callModel(prompt, modelConfig.model);
    return { ...response, modelConfig };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    throw new Error(`${provider.name} API error: ${errorMessage}`);
  }
}

export { BaseProvider, ModelConfig, ModelResponse };
export { OpenAIProvider, AnthropicProvider, GoogleProvider, DeepSeekProvider, XAIProvider };