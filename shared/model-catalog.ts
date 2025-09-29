/**
 * Model Catalog - Single source of truth for UI/display metadata about models
 *
 * What: Centralized catalog describing model display info (name overrides, colors,
 *       formatted pricing strings, and rough response-time estimates).
 * How: Export a simple catalog keyed by provider model IDs used by providers
 *       (e.g., "gpt-5-2025-08-07"). Backend routes can merge this with
 *       provider ModelConfig when returning /api/models. Frontend can optionally
 *       use the attached `ui` field for display-only concerns.
 * Used by: server/routes.ts enriches /api/models responses. Client may read
 *       `ui` to render consistent names/colors/cost strings.
 * Author: Cascade
 */

export type ModelDisplay = {
  key: string;              // same as provider model id
  name: string;             // display name
  color: string;            // Tailwind color class
  premium: boolean;         // whether to badge as premium
  cost: {                   // formatted per-million token costs for display only
    input: string;
    output: string;
  };
  provider: 'OpenAI' | 'Anthropic' | 'Gemini' | 'DeepSeek' | 'OpenRouter';
  responseTime: { speed: 'fast' | 'moderate' | 'slow'; estimate: string };
  supportsTemperature?: boolean;
  supportsReasoning?: boolean;
};

// Minimal subset extracted and normalized from the previously copied models.ts.
// Only include models that exist in our current providers to avoid mismatches.
export const MODEL_CATALOG: Record<string, ModelDisplay> = {
  // OpenAI
  'gpt-5-2025-08-07': {
    key: 'gpt-5-2025-08-07',
    name: 'GPT-5',
    color: 'bg-emerald-500',
    premium: true,
    cost: { input: '$1.25', output: '$10.00' },
    provider: 'OpenAI',
    responseTime: { speed: 'moderate', estimate: '1-2 min' },
    supportsTemperature: false,
    supportsReasoning: true,
  },
  'gpt-5-mini-2025-08-07': {
    key: 'gpt-5-mini-2025-08-07',
    name: 'GPT-5 Mini',
    color: 'bg-indigo-500',
    premium: true,
    cost: { input: '$0.25', output: '$2.00' },
    provider: 'OpenAI',
    responseTime: { speed: 'moderate', estimate: '30-60 sec' },
    supportsTemperature: false,
    supportsReasoning: true,
  },
  'gpt-5-nano-2025-08-07': {
    key: 'gpt-5-nano-2025-08-07',
    name: 'GPT-5 Nano',
    color: 'bg-teal-500',
    premium: false,
    cost: { input: '$0.05', output: '$0.40' },
    provider: 'OpenAI',
    responseTime: { speed: 'fast', estimate: '<30 sec' },
    supportsTemperature: false,
    supportsReasoning: true,
  },
  'gpt-4.1-nano-2025-04-14': {
    key: 'gpt-4.1-nano-2025-04-14',
    name: 'GPT-4.1 Nano',
    color: 'bg-blue-500',
    premium: false,
    cost: { input: '$0.50', output: '$2.00' },
    provider: 'OpenAI',
    responseTime: { speed: 'fast', estimate: '<30 sec' },
    supportsTemperature: true,
  },
  'gpt-4.1-mini-2025-04-14': {
    key: 'gpt-4.1-mini-2025-04-14',
    name: 'GPT-4.1 Mini',
    color: 'bg-purple-500',
    premium: false,
    cost: { input: '$1.00', output: '$4.00' },
    provider: 'OpenAI',
    responseTime: { speed: 'moderate', estimate: '30-60 sec' },
    supportsTemperature: true,
  },
  'gpt-4o-mini-2024-07-18': {
    key: 'gpt-4o-mini-2024-07-18',
    name: 'GPT-4o Mini',
    color: 'bg-orange-500',
    premium: false,
    cost: { input: '$0.15', output: '$0.60' },
    provider: 'OpenAI',
    responseTime: { speed: 'moderate', estimate: '30-60 sec' },
    supportsTemperature: true,
  },
  'o4-mini-2025-04-16': {
    key: 'o4-mini-2025-04-16',
    name: 'o4-mini',
    color: 'bg-pink-500',
    premium: true,
    cost: { input: '$1.10', output: '$4.40' },
    provider: 'OpenAI',
    responseTime: { speed: 'moderate', estimate: '1-3 min' },
    supportsReasoning: true,
  },
  'o3-2025-04-16': {
    key: 'o3-2025-04-16',
    name: 'o3-2025-04-16',
    color: 'bg-green-500',
    premium: true,
    cost: { input: '$2', output: '$8' },
    provider: 'OpenAI',
    responseTime: { speed: 'slow', estimate: '3-5+ min' },
    supportsReasoning: true,
  },
  'o3-mini-2025-01-31': {
    key: 'o3-mini-2025-01-31',
    name: 'o3-mini',
    color: 'bg-red-500',
    premium: true,
    cost: { input: '$1.10', output: '$4.40' },
    provider: 'OpenAI',
    responseTime: { speed: 'moderate', estimate: '1-2 min' },
    supportsTemperature: false,
    supportsReasoning: true,
  },
  'gpt-4.1-2025-04-14': {
    key: 'gpt-4.1-2025-04-14',
    name: 'GPT-4.1',
    color: 'bg-yellow-500',
    premium: true,
    cost: { input: '$2.00', output: '$8.00' },
    provider: 'OpenAI',
    responseTime: { speed: 'moderate', estimate: '1-2 min' },
  },

  // Anthropic
  'claude-sonnet-4-20250514': {
    key: 'claude-sonnet-4-20250514',
    name: 'Claude Sonnet 4',
    color: 'bg-indigo-500',
    premium: true,
    cost: { input: '$3.00', output: '$15.00' },
    provider: 'Anthropic',
    responseTime: { speed: 'moderate', estimate: '1-3 min' },
    supportsReasoning: true,
  },
  'claude-3-7-sonnet-20250219': {
    key: 'claude-3-7-sonnet-20250219',
    name: 'Claude 3.7 Sonnet',
    color: 'bg-indigo-400',
    premium: false,
    cost: { input: '$3.00', output: '$15.00' },
    provider: 'Anthropic',
    responseTime: { speed: 'moderate', estimate: '1-2 min' },
    supportsReasoning: true,
  },
  'claude-3-5-sonnet-20241022': {
    key: 'claude-3-5-sonnet-20241022',
    name: 'Claude 3.5 Sonnet',
    color: 'bg-violet-500',
    premium: false,
    cost: { input: '$3.00', output: '$15.00' },
    provider: 'Anthropic',
    responseTime: { speed: 'moderate', estimate: '1-2 min' },
    supportsReasoning: true,
  },
  'claude-3-5-haiku-20241022': {
    key: 'claude-3-5-haiku-20241022',
    name: 'Claude 3.5 Haiku',
    color: 'bg-violet-400',
    premium: false,
    cost: { input: '$0.80', output: '$4.00' },
    provider: 'Anthropic',
    responseTime: { speed: 'moderate', estimate: '30-60 sec' },
    supportsReasoning: true,
  },
  'claude-3-haiku-20240307': {
    key: 'claude-3-haiku-20240307',
    name: 'Claude 3 Haiku',
    color: 'bg-purple-400',
    premium: false,
    cost: { input: '$0.25', output: '$1.25' },
    provider: 'Anthropic',
    responseTime: { speed: 'fast', estimate: '<60 sec' },
  },

  // Google Gemini
  'gemini-2.5-pro': {
    key: 'gemini-2.5-pro',
    name: 'Gemini 2.5 Pro',
    color: 'bg-teal-600',
    premium: true,
    cost: { input: '$2.50', output: '$8.00' },
    provider: 'Gemini',
    responseTime: { speed: 'moderate', estimate: '1-2 min' },
    supportsReasoning: true,
  },
  'gemini-2.5-flash': {
    key: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    color: 'bg-teal-500',
    premium: false,
    cost: { input: '$0.70', output: '$2.10' },
    provider: 'Gemini',
    responseTime: { speed: 'moderate', estimate: '30-60 sec' },
    supportsReasoning: true,
  },
  'gemini-2.5-flash-lite': {
    key: 'gemini-2.5-flash-lite',
    name: 'Gemini 2.5 Flash-Lite',
    color: 'bg-teal-400',
    premium: false,
    cost: { input: '$0.35', output: '$1.05' },
    provider: 'Gemini',
    responseTime: { speed: 'fast', estimate: '<30 sec' },
    supportsReasoning: true,
  },
  'gemini-2.0-flash': {
    key: 'gemini-2.0-flash',
    name: 'Gemini 2.0 Flash',
    color: 'bg-teal-300',
    premium: false,
    cost: { input: '$0.20', output: '$0.60' },
    provider: 'Gemini',
    responseTime: { speed: 'fast', estimate: '<30 sec' },
  },
  'gemini-2.0-flash-lite': {
    key: 'gemini-2.0-flash-lite',
    name: 'Gemini 2.0 Flash-Lite',
    color: 'bg-teal-200',
    premium: false,
    cost: { input: '$0.10', output: '$0.30' },
    provider: 'Gemini',
    responseTime: { speed: 'fast', estimate: '<30 sec' },
    supportsReasoning: true,
  },

  // DeepSeek
  'deepseek-reasoner': {
    key: 'deepseek-reasoner',
    name: 'DeepSeek R1 Reasoner',
    color: 'bg-cyan-800',
    premium: true,
    cost: { input: '$0.55', output: '$2.19' },
    provider: 'DeepSeek',
    responseTime: { speed: 'slow', estimate: '5-10 min' },
    supportsReasoning: true,
  },
  'deepseek-chat': {
    key: 'deepseek-chat',
    name: 'DeepSeek V3 Chat',
    color: 'bg-cyan-600',
    premium: false,
    cost: { input: '$0.27', output: '$1.10' },
    provider: 'DeepSeek',
    responseTime: { speed: 'moderate', estimate: '30-90 sec' },
  },



  // OpenRouter
  // OpenRouter - Grok models (migrated from deprecated xAI provider)
  'openrouter/grok-4': {
    key: 'openrouter/grok-4',
    name: 'Grok 4 (via OpenRouter)',
    color: 'bg-slate-800',
    premium: true,
    cost: { input: '$5.00', output: '$15.00' },
    provider: 'OpenRouter',
    responseTime: { speed: 'slow', estimate: '3-5+ min' },
    supportsReasoning: true,
  },
  'openrouter/grok-3': {
    key: 'openrouter/grok-3',
    name: 'Grok 3 (via OpenRouter)',
    color: 'bg-slate-700',
    premium: true,
    cost: { input: '$3.00', output: '$15.00' },
    provider: 'OpenRouter',
    responseTime: { speed: 'slow', estimate: '3-5+ min' },
    supportsReasoning: true,
  },
  'openrouter/grok-3-mini': {
    key: 'openrouter/grok-3-mini',
    name: 'Grok 3 Mini (via OpenRouter)',
    color: 'bg-slate-600',
    premium: false,
    cost: { input: '$0.50', output: '$2.00' },
    provider: 'OpenRouter',
    responseTime: { speed: 'moderate', estimate: '1-2 min' },
  },
  'openrouter/grok-3-fast': {
    key: 'openrouter/grok-3-fast',
    name: 'Grok 3 Fast (via OpenRouter)',
    color: 'bg-slate-500',
    premium: false,
    cost: { input: '$1.00', output: '$4.00' },
    provider: 'OpenRouter',
    responseTime: { speed: 'fast', estimate: '30-60 sec' },
  },
  'openrouter/grok-3-mini-fast': {
    key: 'openrouter/grok-3-mini-fast',
    name: 'Grok 3 Mini Fast (via OpenRouter)',
    color: 'bg-slate-400',
    premium: false,
    cost: { input: '$0.25', output: '$1.00' },
    provider: 'OpenRouter',
    responseTime: { speed: 'fast', estimate: '15-30 sec' },
  },
  // OpenRouter - Premium frontier models
  'openrouter/qwen-3-235b': {
    key: 'openrouter/qwen-3-235b',
    name: 'Qwen 3 235B (via OpenRouter)',
    color: 'bg-orange-600',
    premium: true,
    cost: { input: '$0.15', output: '$0.85' },
    provider: 'OpenRouter',
    responseTime: { speed: 'moderate', estimate: '1-2 min' },
    supportsReasoning: true,
  },
  'openrouter/llama-4-maverick': {
    key: 'openrouter/llama-4-maverick',
    name: 'Llama 4 Maverick (via OpenRouter)',
    color: 'bg-blue-700',
    premium: true,
    cost: { input: '$0.80', output: '$2.40' },
    provider: 'OpenRouter',
    responseTime: { speed: 'moderate', estimate: '1-2 min' },
    supportsReasoning: true,
  },
  'openrouter/llama-3.3-70b': {
    key: 'openrouter/llama-3.3-70b',
    name: 'Llama 3.3 70B (via OpenRouter)',
    color: 'bg-blue-600',
    premium: false,
    cost: { input: '$0.60', output: '$0.60' },
    provider: 'OpenRouter',
    responseTime: { speed: 'moderate', estimate: '1-2 min' },
  },
  'openrouter/mistral-large': {
    key: 'openrouter/mistral-large',
    name: 'Mistral Large (via OpenRouter)',
    color: 'bg-rose-600',
    premium: false,
    cost: { input: '$2.00', output: '$6.00' },
    provider: 'OpenRouter',
    responseTime: { speed: 'moderate', estimate: '1-2 min' },
  },
  'openrouter/command-r-plus': {
    key: 'openrouter/command-r-plus',
    name: 'Command R+ (via OpenRouter)',
    color: 'bg-emerald-600',
    premium: false,
    cost: { input: '$2.50', output: '$10.00' },
    provider: 'OpenRouter',
    responseTime: { speed: 'moderate', estimate: '1-2 min' },
  },
};

export function getDisplayForModelId(modelId: string): ModelDisplay | undefined {
  return MODEL_CATALOG[modelId];
}
