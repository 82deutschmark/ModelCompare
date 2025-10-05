/**
 * Author: Claude Code using Sonnet 4
 * Date: 2025-09-28 14:30:00
 * PURPOSE: Standardized test prompts for health checking different types of AI models
 * SRP and DRY check: Pass - Single responsibility for test prompt definitions, reusable across test suite
 * shadcn/ui: Pass - No UI components needed in test utilities
 */

import type { ModelMessage } from '../../server/providers/base.js';

export interface TestPrompt {
  messages: ModelMessage[];
  expectedPatterns: string[];
  description: string;
  timeoutMs: number;
}

/**
 * Basic health check prompt for standard chat models
 */
export const BASIC_HEALTH_CHECK: TestPrompt = {
  messages: [
    {
      role: 'user',
      content: 'Hello, please respond with exactly: "Health check successful"'
    }
  ],
  expectedPatterns: ['Health check successful'],
  description: 'Basic health check',
  timeoutMs: 60000 // 1 minute
};

/**
 * Reasoning capability test for models with supportsReasoning=true
 */
export const REASONING_HEALTH_CHECK: TestPrompt = {
  messages: [
    {
      role: 'user',
      content: 'What is 15 + 27? Please show your work and respond with the final answer.'
    }
  ],
  expectedPatterns: ['42', 'fifteen', 'twenty-seven', 'addition'],
  description: 'Reasoning capability check',
  timeoutMs: 180000 // 3 minutes for reasoning models
};

/**
 * Temperature support validation
 */
export const TEMPERATURE_VALIDATION: TestPrompt = {
  messages: [
    {
      role: 'user',
      content: 'Write a creative two-word description of the color blue.'
    }
  ],
  expectedPatterns: ['blue', 'color'], // Very loose validation since creativity varies
  description: 'Temperature parameter validation',
  timeoutMs: 60000
};

/**
 * System prompt handling test
 */
export const SYSTEM_PROMPT_TEST: TestPrompt = {
  messages: [
    {
      role: 'system',
      content: 'You are a helpful assistant. Always end your responses with "System prompt acknowledged."'
    },
    {
      role: 'user',
      content: 'Hello, how are you?'
    }
  ],
  expectedPatterns: ['System prompt acknowledged'],
  description: 'System prompt handling',
  timeoutMs: 60000
};

/**
 * Get appropriate test prompt based on model capabilities
 */
export function getTestPromptForModel(modelId: string, supportsReasoning?: boolean, supportsTemperature?: boolean): TestPrompt {
  // Premium reasoning models get the reasoning test
  if (supportsReasoning && (modelId.includes('gpt-5') || modelId.includes('o3') || modelId.includes('o4') ||
                           modelId.includes('deepseek-reasoner') || modelId.includes('claude-sonnet-4') ||
                           modelId.includes('grok-4'))) {
    return REASONING_HEALTH_CHECK;
  }

  // Temperature-supporting models get temperature validation
  if (supportsTemperature) {
    return TEMPERATURE_VALIDATION;
  }

  // Default to basic health check
  return BASIC_HEALTH_CHECK;
}

/**
 * Get timeout based on model speed category from catalog
 */
export function getTimeoutForModel(responseTime?: { speed: 'fast' | 'moderate' | 'slow'; estimate: string }): number {
  if (!responseTime) return BASIC_HEALTH_CHECK.timeoutMs;

  switch (responseTime.speed) {
    case 'fast':
      return 60000; // 1 minute
    case 'moderate':
      return 180000; // 3 minutes
    case 'slow':
      return 600000; // 10 minutes
    default:
      return BASIC_HEALTH_CHECK.timeoutMs;
  }
}