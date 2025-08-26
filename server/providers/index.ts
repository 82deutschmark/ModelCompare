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
import { CircuitBreaker } from './circuit-breaker.js';
import { ModelNotFoundError, ProviderError, CircuitBreakerError } from '../errors.js';
import { getCircuitBreakerConfig } from '../config.js';

// Initialize all providers with circuit breakers
const providers: BaseProvider[] = [
  new OpenAIProvider(),
  new AnthropicProvider(),
  new GoogleProvider(),
  new DeepSeekProvider(),
  new XAIProvider(),
];

// Circuit breaker per provider for resilience
const circuitBreakers = new Map<string, CircuitBreaker>();
const circuitBreakerConfig = getCircuitBreakerConfig();

providers.forEach(provider => {
  circuitBreakers.set(provider.name, new CircuitBreaker({
    failureThreshold: circuitBreakerConfig.failureThreshold,
    recoveryTimeout: circuitBreakerConfig.recoveryTimeout,
    monitoringPeriod: circuitBreakerConfig.monitoringPeriod
  }));
});

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
    throw new ModelNotFoundError(modelId);
  }
  
  const circuitBreaker = circuitBreakers.get(provider.name);
  if (!circuitBreaker) {
    throw new ProviderError(`Circuit breaker not found for provider ${provider.name}`, { 
      provider: provider.name,
      modelId 
    });
  }
  
  try {
    const response = await circuitBreaker.execute(async () => {
      return await provider.callModel(prompt, modelConfig.model);
    });
    return { ...response, modelConfig };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    // Enhanced error reporting with circuit breaker state
    const breakerState = circuitBreaker.getState();
    const failureCount = circuitBreaker.getFailureCount();
    
    if (breakerState === 'OPEN') {
      throw new CircuitBreakerError(provider.name, failureCount);
    } else {
      throw new ProviderError(`${provider.name} API error: ${errorMessage}`, {
        provider: provider.name,
        modelId,
        circuitBreakerState: breakerState,
        failureCount
      });
    }
  }
}

export { BaseProvider, ModelConfig, ModelResponse };
export { OpenAIProvider, AnthropicProvider, GoogleProvider, DeepSeekProvider, XAIProvider };