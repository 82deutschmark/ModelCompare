/**
 * Author: Claude Code using Sonnet 4
 * Date: 2025-09-14
 * PURPOSE: Centralized model configuration - single source of truth for all AI models.
 * This file contains the comprehensive model data array from arc-explainer, adapted for ModelCompare.
 * It provides unified model definitions, capabilities, pricing, and provider information.
 * Used by: server/routes.ts for /api/models endpoint, client components for display
 * SRP/DRY check: Pass - Single responsibility (model definitions), eliminates duplication
 * shadcn/ui: Pass - This is a data file, UI components will use shadcn/ui
 */

export interface ModelConfig {
  key: string;
  name: string;
  color: string;
  premium: boolean;
  cost: { input: string; output: string };
  supportsTemperature: boolean;
  provider: string;
  responseTime: { speed: 'fast' | 'moderate' | 'slow'; estimate: string };
  isReasoning?: boolean;
  apiModelName: string;
  modelType: string;
  contextWindow?: number;
  maxOutputTokens?: number;
  releaseDate?: string;
  requiresPromptFormat?: boolean;
  supportsStructuredOutput?: boolean;
}

export const MODELS: ModelConfig[] = [
  // OpenAI Models
  {
    key: 'gpt-4.1-nano-2025-04-14',
    name: 'GPT-4.1 Nano',
    color: 'bg-blue-500',
    premium: false,
    cost: { input: '$0.10', output: '$0.40' },
    supportsTemperature: true,
    provider: 'OpenAI',
    responseTime: { speed: 'fast', estimate: '<30 sec' },
    apiModelName: 'gpt-4.1-nano-2025-04-14',
    modelType: 'gpt5_chat',
    contextWindow: 1000000,
    releaseDate: "2025-04"
  },
  {
    key: 'gpt-4.1-mini-2025-04-14',
    name: 'GPT-4.1 Mini',
    color: 'bg-purple-500',
    premium: false,
    cost: { input: '$0.40', output: '$1.60' },
    supportsTemperature: true,
    provider: 'OpenAI',
    responseTime: { speed: 'moderate', estimate: '30-60 sec' },
    apiModelName: 'gpt-4.1-mini-2025-04-14',
    modelType: 'gpt5_chat',
    contextWindow: 1000000,
    releaseDate: "2025-04"
  },
  {
    key: 'gpt-4o-mini-2024-07-18',
    name: 'GPT-4o Mini',
    color: 'bg-orange-500',
    premium: false,
    cost: { input: '$0.15', output: '$0.60' },
    supportsTemperature: true,
    provider: 'OpenAI',
    responseTime: { speed: 'moderate', estimate: '30-60 sec' },
    apiModelName: 'gpt-4o-mini-2024-07-18',
    modelType: 'gpt5_chat',
    contextWindow: 128000,
    releaseDate: "2024-07"
  },
  {
    key: 'o3-mini-2025-01-31',
    name: 'o3-mini',
    color: 'bg-red-500',
    premium: true,
    cost: { input: '$1.10', output: '$4.40' },
    supportsTemperature: false,
    provider: 'OpenAI',
    responseTime: { speed: 'moderate', estimate: '1-2 min' },
    isReasoning: true,
    apiModelName: 'o3-mini-2025-01-31',
    modelType: 'o3_o4',
    contextWindow: 200000,
    releaseDate: "2025-01"
  },
  {
    key: 'o4-mini-2025-04-16',
    name: 'o4-mini',
    color: 'bg-pink-500',
    premium: true,
    cost: { input: '$1.10', output: '$4.40' },
    supportsTemperature: false,
    provider: 'OpenAI',
    responseTime: { speed: 'moderate', estimate: '1-3 min' },
    isReasoning: true,
    apiModelName: 'o4-mini-2025-04-16',
    modelType: 'o3_o4',
    contextWindow: 200000,
    releaseDate: "2025-04"
  },
  {
    key: 'o3-2025-04-16',
    name: 'o3-2025-04-16',
    color: 'bg-green-500',
    premium: true,
    cost: { input: '$2', output: '$8' },
    supportsTemperature: false,
    provider: 'OpenAI',
    responseTime: { speed: 'slow', estimate: '3-5+ min' },
    isReasoning: true,
    apiModelName: 'o3-2025-04-16',
    modelType: 'o3_o4',
    contextWindow: 400000,
    releaseDate: "2025-04"
  },
  {
    key: 'gpt-4.1-2025-04-14',
    name: 'GPT-4.1',
    color: 'bg-yellow-500',
    premium: true,
    cost: { input: '$2.00', output: '$8.00' },
    supportsTemperature: true,
    provider: 'OpenAI',
    responseTime: { speed: 'moderate', estimate: '1-2 min' },
    apiModelName: 'gpt-4.1-2025-04-14',
    modelType: 'gpt5_chat',
    contextWindow: 1000000,
    releaseDate: "2025-04"
  },
  {
    key: 'gpt-5-2025-08-07',
    name: 'GPT-5',
    color: 'bg-emerald-500',
    premium: true,
    cost: { input: '$1.25', output: '$10.00' },
    supportsTemperature: false,
    provider: 'OpenAI',
    responseTime: { speed: 'moderate', estimate: '1-2 min' },
    isReasoning: true,
    apiModelName: 'gpt-5-2025-08-07',
    modelType: 'gpt5',
    contextWindow: 400000,
    releaseDate: "2025-08"
  },
  {
    key: 'gpt-5-chat-latest',
    name: 'GPT-5 Chat',
    color: 'bg-amber-500',
    premium: false,
    cost: { input: '$1.25', output: '$10.00' },
    supportsTemperature: false,
    provider: 'OpenAI',
    responseTime: { speed: 'fast', estimate: '<30 sec' },
    isReasoning: false,
    apiModelName: 'gpt-5-chat-latest',
    modelType: 'gpt5_chat',
    contextWindow: 256000,
    releaseDate: "2025-08"
  },
  {
    key: 'gpt-5-mini-2025-08-07',
    name: 'GPT-5 Mini',
    color: 'bg-indigo-500',
    premium: true,
    cost: { input: '$0.25', output: '$2.00' },
    supportsTemperature: false,
    provider: 'OpenAI',
    responseTime: { speed: 'moderate', estimate: '30-60 sec' },
    isReasoning: true,
    apiModelName: 'gpt-5-mini-2025-08-07',
    modelType: 'gpt5',
    contextWindow: 400000,
    releaseDate: "2025-08"
  },
  {
    key: 'gpt-5-nano-2025-08-07',
    name: 'GPT-5 Nano',
    color: 'bg-teal-500',
    premium: false,
    cost: { input: '$0.05', output: '$0.40' },
    supportsTemperature: false,
    provider: 'OpenAI',
    responseTime: { speed: 'fast', estimate: '<30 sec' },
    isReasoning: true,
    apiModelName: 'gpt-5-nano-2025-08-07',
    modelType: 'gpt5',
    contextWindow: 400000,
    releaseDate: "2025-08"
  },

  // Anthropic Models
  {
    key: 'claude-sonnet-4-20250514',
    name: 'Claude Sonnet 4',
    color: 'bg-indigo-500',
    premium: true,
    cost: { input: '$3.00', output: '$15.00' },
    supportsTemperature: true,
    provider: 'Anthropic',
    responseTime: { speed: 'moderate', estimate: '1-3 min' },
    isReasoning: true,
    apiModelName: 'claude-sonnet-4-20250514',
    modelType: 'claude',
    maxOutputTokens: 64000,
    releaseDate: "2025-05"
  },
  {
    key: 'claude-3-7-sonnet-20250219',
    name: 'Claude 3.7 Sonnet',
    color: 'bg-indigo-400',
    premium: false,
    cost: { input: '$3.00', output: '$15.00' },
    supportsTemperature: true,
    provider: 'Anthropic',
    responseTime: { speed: 'moderate', estimate: '1-2 min' },
    isReasoning: true,
    apiModelName: 'claude-3-7-sonnet-20250219',
    modelType: 'claude',
    maxOutputTokens: 20000,
    releaseDate: "2025-02"
  },
  {
    key: 'claude-3-5-sonnet-20241022',
    name: 'Claude 3.5 Sonnet',
    color: 'bg-violet-500',
    premium: false,
    cost: { input: '$3.00', output: '$15.00' },
    supportsTemperature: true,
    provider: 'Anthropic',
    responseTime: { speed: 'moderate', estimate: '1-2 min' },
    isReasoning: true,
    apiModelName: 'claude-3-5-sonnet-20241022',
    modelType: 'claude',
    maxOutputTokens: 8192,
    releaseDate: "2024-10"
  },
  {
    key: 'claude-3-5-haiku-20241022',
    name: 'Claude 3.5 Haiku',
    color: 'bg-violet-400',
    premium: false,
    cost: { input: '$0.80', output: '$4.00' },
    supportsTemperature: true,
    provider: 'Anthropic',
    responseTime: { speed: 'moderate', estimate: '30-60 sec' },
    isReasoning: true,
    apiModelName: 'claude-3-5-haiku-20241022',
    modelType: 'claude',
    maxOutputTokens: 4000,
    releaseDate: "2024-10"
  },
  {
    key: 'claude-3-haiku-20240307',
    name: 'Claude 3 Haiku',
    color: 'bg-purple-400',
    premium: false,
    cost: { input: '$0.25', output: '$1.25' },
    supportsTemperature: true,
    provider: 'Anthropic',
    responseTime: { speed: 'fast', estimate: '<60 sec' },
    isReasoning: true,
    apiModelName: 'claude-3-haiku-20240307',
    modelType: 'claude',
    maxOutputTokens: 4000,
    releaseDate: "2024-03"
  },

  // Google Gemini Models
  {
    key: 'gemini-2.5-pro',
    name: 'Gemini 2.5 Pro',
    color: 'bg-teal-600',
    premium: true,
    cost: { input: '$2.50', output: '$8.00' },
    supportsTemperature: true,
    provider: 'Gemini',
    responseTime: { speed: 'moderate', estimate: '1-2 min' },
    isReasoning: true,
    apiModelName: 'models/gemini-2.5-pro',
    modelType: 'gemini',
    contextWindow: 1000000,
    releaseDate: "2025-08"
  },
  {
    key: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    color: 'bg-teal-500',
    premium: false,
    cost: { input: '$0.70', output: '$2.10' },
    supportsTemperature: true,
    provider: 'Gemini',
    responseTime: { speed: 'moderate', estimate: '30-60 sec' },
    isReasoning: true,
    apiModelName: 'models/gemini-2.5-flash',
    modelType: 'gemini',
    contextWindow: 1000000,
    releaseDate: "2025-08"
  },
  {
    key: 'gemini-2.5-flash-lite',
    name: 'Gemini 2.5 Flash-Lite',
    color: 'bg-teal-400',
    premium: false,
    cost: { input: '$0.35', output: '$1.05' },
    supportsTemperature: true,
    provider: 'Gemini',
    responseTime: { speed: 'fast', estimate: '<30 sec' },
    isReasoning: true,
    apiModelName: 'models/gemini-2.5-flash-lite',
    modelType: 'gemini',
    contextWindow: 1000000,
    releaseDate: "2025-08"
  },
  {
    key: 'gemini-2.0-flash',
    name: 'Gemini 2.0 Flash',
    color: 'bg-teal-300',
    premium: false,
    cost: { input: '$0.20', output: '$0.60' },
    supportsTemperature: true,
    provider: 'Gemini',
    responseTime: { speed: 'fast', estimate: '<30 sec' },
    isReasoning: true,
    apiModelName: 'models/gemini-2.0-flash',
    modelType: 'gemini',
    contextWindow: 1000000,
    releaseDate: "2025-08"
  },
  {
    key: 'gemini-2.0-flash-lite',
    name: 'Gemini 2.0 Flash-Lite',
    color: 'bg-teal-200',
    premium: false,
    cost: { input: '$0.10', output: '$0.30' },
    supportsTemperature: true,
    provider: 'Gemini',
    responseTime: { speed: 'fast', estimate: '<30 sec' },
    isReasoning: true,
    apiModelName: 'models/gemini-2.0-flash-lite',
    modelType: 'gemini',
    contextWindow: 1000000,
    releaseDate: "2025-08"
  },

  // DeepSeek Models
  {
    key: 'deepseek-chat',
    name: 'DeepSeek Chat',
    color: 'bg-cyan-600',
    premium: false,
    cost: { input: '$0.14', output: '$0.28' },
    supportsTemperature: true,
    provider: 'DeepSeek',
    responseTime: { speed: 'moderate', estimate: '30-90 sec' },
    isReasoning: false,
    apiModelName: 'deepseek-chat',
    modelType: 'deepseek',
  },
  {
    key: 'deepseek-reasoner',
    name: 'DeepSeek Reasoner',
    color: 'bg-cyan-800',
    premium: true,
    cost: { input: '$0.55', output: '$2.19' },
    supportsTemperature: false,
    provider: 'DeepSeek',
    responseTime: { speed: 'slow', estimate: '5-10 min' },
    isReasoning: true,
    apiModelName: 'deepseek-reasoner',
    modelType: 'deepseek',
  },

  // xAI Grok Models (via OpenRouter)
  {
    key: 'x-ai/grok-4',
    name: 'Grok 4',
    color: 'bg-gray-900',
    premium: true,
    cost: { input: '$3.00', output: '$15.00' },
    supportsTemperature: true,
    provider: 'xAI',
    responseTime: { speed: 'slow', estimate: '3-5+ min' },
    isReasoning: true,
    apiModelName: 'x-ai/grok-4',
    modelType: 'openrouter',
    contextWindow: 256000,
    maxOutputTokens: 31000,
    releaseDate: "2025-07"
  },
  {
    key: 'x-ai/grok-4-fast:free',
    name: 'Grok 4 Fast',
    color: 'bg-orange-500',
    premium: false,
    cost: { input: '$0.00', output: '$0.00' },
    supportsTemperature: true,
    provider: 'xAI',
    responseTime: { speed: 'moderate', estimate: '1-2 min' },
    isReasoning: true,
    apiModelName: 'x-ai/grok-4-fast:free',
    modelType: 'openrouter',
    contextWindow: 128000,
    maxOutputTokens: 32000,
    releaseDate: "2025-07"
  },
  {
    key: 'x-ai/grok-3',
    name: 'Grok 3',
    color: 'bg-gray-600',
    premium: true,
    cost: { input: '$3.00', output: '$15.00' },
    supportsTemperature: true,
    provider: 'xAI',
    responseTime: { speed: 'slow', estimate: '3-5+ min' },
    isReasoning: true,
    apiModelName: 'x-ai/grok-3',
    modelType: 'openrouter',
    contextWindow: 256000,
    maxOutputTokens: 31000,
    releaseDate: "2024-11"
  },
  {
    key: 'x-ai/grok-3-mini',
    name: 'Grok 3 Mini',
    color: 'bg-gray-500',
    premium: false,
    cost: { input: '$0.30', output: '$0.50' },
    supportsTemperature: true,
    provider: 'xAI',
    responseTime: { speed: 'moderate', estimate: '1-2 min' },
    isReasoning: true,
    apiModelName: 'x-ai/grok-3-mini',
    modelType: 'openrouter',
    contextWindow: 256000,
    maxOutputTokens: 31000,
    releaseDate: "2024-11"
  }
];

// Utility functions for model lookups
export class ModelLookup {
  static getById(modelKey: string): ModelConfig | undefined {
    return MODELS.find(m => m.key === modelKey);
  }

  static getByProvider(provider: string): ModelConfig[] {
    return MODELS.filter(m => m.provider === provider);
  }

  static getByType(modelType: string): ModelConfig[] {
    return MODELS.filter(m => m.modelType === modelType);
  }

  static getAllProviders(): string[] {
    return Array.from(new Set(MODELS.map(m => m.provider)));
  }
}

// Model categorization sets for legacy compatibility
export const O3_O4_REASONING_MODELS = new Set(
  ModelLookup.getByType('o3_o4').map(m => m.key)
);

export const GPT5_REASONING_MODELS = new Set(
  ModelLookup.getByType('gpt5').map(m => m.key)
);

export const GPT5_CHAT_MODELS = new Set(
  ModelLookup.getByType('gpt5_chat').map(m => m.key)
);

export const MODELS_WITH_REASONING = new Set(
  MODELS.filter(m => m.isReasoning).map(m => m.key)
);

export const OPENAI_MODELS = new Set(
  ModelLookup.getByProvider('OpenAI').map(m => m.key)
);

export const ANTHROPIC_MODELS = new Set(
  ModelLookup.getByProvider('Anthropic').map(m => m.key)
);

export const GEMINI_MODELS = new Set(
  ModelLookup.getByProvider('Gemini').map(m => m.key)
);

export const DEEPSEEK_MODELS = new Set(
  ModelLookup.getByProvider('DeepSeek').map(m => m.key)
);

export const XAI_MODELS = new Set(
  ModelLookup.getByProvider('xAI').map(m => m.key)
);