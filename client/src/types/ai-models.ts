/**
 * AI Models Type Definitions - Frontend Model Interfaces and Provider Mappings
 * 
 * This module contains TypeScript type definitions specific to the frontend
 * application for AI model management and response handling. It provides:
 * 
 * - Model interface definitions for UI components
 * - Provider grouping mappings for organized model selection
 * - Response status types and result interfaces
 * - Frontend-specific type extensions for UI state management
 * 
 * These types complement the shared schema definitions and provide additional
 * frontend-specific typing for component props, state management, and UI logic.
 * 
 * Author: Replit Agent
 * Date: August 9, 2025
 */

export interface AIModel {
  id: string;
  name: string;
  provider: string;
  model: string;
}

export interface ModelResponse {
  content: string;
  status: 'success' | 'error' | 'loading';
  responseTime: number;
  error?: string;
  reasoning?: string;
}

export interface ComparisonResult {
  id: string;
  responses: Record<string, ModelResponse>;
}

export const providerGroups = {
  'OpenAI': ['openai-gpt-5', 'openai-gpt-4.1', 'openai-gpt-4.1-mini', 'openai-o4-mini', 'openai-gpt-4o', 'openai-gpt-4o-mini'],
  'Anthropic': ['anthropic-claude-opus-4.1', 'anthropic-claude-sonnet-4', 'anthropic-claude-3.7-sonnet', 'anthropic-claude-3.5-haiku'],
  'Google': ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.0-flash'],
  'DeepSeek': ['deepseek-chat', 'deepseek-reasoner'],
  'xAI': ['grok-4', 'grok-2-1212', 'grok-2-vision-1212'],
};
