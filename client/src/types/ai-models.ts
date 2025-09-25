/**
 * Author: Claude Code using Sonnet 4
 * Date: 2025-01-14
 * PURPOSE: Frontend AI model type definitions compatible with new centralized model configuration.
 * Updated to match shared/models.ts structure for consistency and proper UI rendering.
 * SRP/DRY check: Pass - Single responsibility for frontend type definitions
 * shadcn/ui: Pass - Types support shadcn/ui component integration
 */

// Re-export the shared ModelConfig for compatibility
export type { ModelConfig } from '@shared/api-types';

export interface AIModel {
  id: string;
  name: string;
  provider: string;
  color: string;
  premium: boolean;
  cost: { input: string; output: string };
  supportsTemperature: boolean;
  responseTime: { speed: 'fast' | 'moderate' | 'slow'; estimate: string };
  isReasoning?: boolean;
  apiModelName: string;
  modelType: string;
  contextWindow?: number;
  maxOutputTokens?: number;
  releaseDate?: string;
  requiresPromptFormat?: boolean;
  supportsStructuredOutput?: boolean;

  // Legacy compatibility fields for existing components
  model?: string;
  knowledgeCutoff?: string;
  capabilities?: {
    reasoning: boolean;
    multimodal: boolean;
    functionCalling: boolean;
    streaming: boolean;
  };
  pricing?: {
    inputPerMillion: number;
    outputPerMillion: number;
    reasoningPerMillion?: number;
  };
  limits?: {
    maxTokens: number;
    contextWindow: number;
  };
}

export interface ModelResponse {
  content: string;
  status: 'success' | 'error' | 'loading';
  responseTime: number;
  error?: string;
  reasoning?: string;
  systemPrompt?: string;
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

export interface ComparisonResult {
  id: string;
  responses: Record<string, ModelResponse>;
}

export const providerGroups = {
  'OpenAI': ['openai-gpt-5', 'openai-gpt-4.1', 'openai-gpt-4.1-mini', 'openai-o4-mini', 'openai-gpt-4o', 'openai-gpt-4o-mini'],
  'Anthropic': ['anthropic-claude-3.5-haiku', 'anthropic-claude-sonnet-4', 'anthropic-claude-3.7-sonnet', 'anthropic-claude-3.5-haiku'],
  'Google': ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.0-flash'],
  'DeepSeek': ['deepseek-chat', 'deepseek-reasoner'],
  'xAI': ['grok-4', 'grok-3', 'grok-3-mini'],
};
