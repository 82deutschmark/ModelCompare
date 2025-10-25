/**
 * Author: Cascade (GPT-4o)
 * Date: 2025-10-25 at 17:20 EDT
 * PURPOSE: Maintain the centralized AI provider registry, wiring shared circuit breakers and resolving providers for each model without duplicating instances. Updates ensure DeepSeek and OpenRouter models resolve correctly after Responses API migration.
 * SRP/DRY check: Pass - Registry concerns remain isolated, leveraging shared provider singletons without duplicating construction logic.
 */

import { BaseProvider, type ModelConfig, type ModelResponse, type ModelMessage, type CallOptions } from './base.js';
import { OpenAIProvider } from './openai.js';
import { AnthropicProvider } from './anthropic.js';
import { GoogleProvider } from './google.js';
import { DeepSeekProvider } from './deepseek.js';

import { OpenRouterProvider } from './openrouter.js';
import { CircuitBreaker } from './circuit-breaker.js';
import { ModelNotFoundError, ProviderError, CircuitBreakerError } from '../errors.js';
import { getCircuitBreakerConfig } from '../config.js';

// Initialize all providers with circuit breakers
// Note: xAI provider deprecated - Grok models now available via OpenRouter
const providers: BaseProvider[] = [
  new OpenAIProvider(),
  new AnthropicProvider(),
  new GoogleProvider(),
  new DeepSeekProvider(),
  new OpenRouterProvider(),
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

export function getProviderForModel(modelId: string): BaseProvider {
  const provider = providers.find(p => p.getModel(modelId));

  if (!provider) {
    throw new ModelNotFoundError(modelId);
  }

  return provider;
}

export function getModelsByCapability(capability: keyof ModelConfig['capabilities']): ModelConfig[] {
  return providers.flatMap(provider => provider.getModelsByCapability(capability));
}

export function getReasoningModels(): ModelConfig[] {
  return getModelsByCapability('reasoning');
}

/**
 * Legacy function for backward compatibility with string prompts
 * Automatically converts string prompts to structured messages
 * @param prompt String prompt to send to model
 * @param modelId Model identifier
 * @returns Promise resolving to model response with config
 */
export async function callModel(prompt: string, modelId: string): Promise<ModelResponse & { modelConfig: ModelConfig }> {
  const messages: ModelMessage[] = [{ role: 'user', content: prompt }];
  return callModelWithMessages(messages, modelId);
}

/**
 * New structured message function for advanced prompt engineering
 * Supports proper system/user/context role separation
 * @param messages Array of structured messages with roles
 * @param modelId Model identifier  
 * @param options Optional generation parameters
 * @returns Promise resolving to model response with config
 */
export async function callModelWithMessages(messages: ModelMessage[], modelId: string, options?: CallOptions): Promise<ModelResponse & { modelConfig: ModelConfig }> {
  const provider = getProviderForModel(modelId);
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
      return await provider.callModel(messages, modelConfig.model, options);
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
export { OpenAIProvider, AnthropicProvider, GoogleProvider, DeepSeekProvider, OpenRouterProvider };