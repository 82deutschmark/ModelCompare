/**
 * AI Providers Service - Multi-Provider AI Model Integration
 * 
 * This service module provides a unified interface for interacting with multiple
 * AI providers including OpenAI, Anthropic, Google Gemini, DeepSeek, and xAI Grok.
 * It abstracts the differences between provider APIs and provides:
 * 
 * - Unified model definitions with provider-specific configurations
 * - Parallel API calls to multiple models for comparison
 * - Error handling and graceful degradation per provider
 * - Response time tracking for performance analysis
 * - Secure API key management through environment variables
 * - Request/response normalization across different API formats
 * 
 * Each provider has its own implementation while conforming to a common interface
 * that enables seamless comparison of responses across different AI models.
 * 
 * Author: Replit Agent
 * Date: August 9, 2025
 */

import OpenAI from "openai";
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenAI } from "@google/genai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || ""
});

// The newest Anthropic model is "claude-sonnet-4-20250514", not "claude-3-7-sonnet-20250219", "claude-3-5-sonnet-20241022" nor "claude-3-sonnet-20240229"
const DEFAULT_MODEL_STR = "claude-sonnet-4-20250514";
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY_ENV_VAR || ""
});

// Note that the newest Gemini model series is "gemini-2.5-flash" or gemini-2.5-pro"
const gemini = new GoogleGenAI({ 
  apiKey: process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY_ENV_VAR || ""
});

const grok = new OpenAI({ 
  baseURL: "https://api.x.ai/v1", 
  apiKey: process.env.XAI_API_KEY || process.env.GROK_API_KEY || ""
});

const deepseek = new OpenAI({
  baseURL: "https://api.deepseek.com",
  apiKey: process.env.DEEPSEEK_API_KEY || ""
});

export interface AIModelConfig {
  id: string;
  name: string;
  provider: string;
  model: string;
}

export const availableModels: AIModelConfig[] = [
  // OpenAI Models (2025)
  { id: "openai-gpt-5", name: "GPT-5", provider: "OpenAI", model: "gpt-5" },
  { id: "openai-gpt-4.1", name: "GPT-4.1", provider: "OpenAI", model: "gpt-4.1" },
  { id: "openai-gpt-4.1-mini", name: "GPT-4.1 Mini", provider: "OpenAI", model: "gpt-4.1-mini" },
  { id: "openai-o4-mini", name: "o4-mini (Reasoning)", provider: "OpenAI", model: "o4-mini" },
  { id: "openai-gpt-4o", name: "GPT-4o", provider: "OpenAI", model: "gpt-4o" },
  { id: "openai-gpt-4o-mini", name: "GPT-4o Mini", provider: "OpenAI", model: "gpt-4o-mini" },
  
  // Anthropic Models (2025)
  { id: "anthropic-claude-opus-4.1", name: "Claude Opus 4.1", provider: "Anthropic", model: "claude-4-opus-2025-05-22" },
  { id: "anthropic-claude-sonnet-4", name: "Claude Sonnet 4", provider: "Anthropic", model: "claude-4-sonnet-2025-05-22" },
  { id: "anthropic-claude-3.7-sonnet", name: "Claude 3.7 Sonnet", provider: "Anthropic", model: "claude-3-7-sonnet-20250219" },
  { id: "anthropic-claude-3.5-haiku", name: "Claude 3.5 Haiku", provider: "Anthropic", model: "claude-3-5-haiku-20241022" },
  
  // Google Gemini Models (2025)
  { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro", provider: "Google", model: "gemini-2.5-pro" },
  { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash", provider: "Google", model: "gemini-2.5-flash" },
  { id: "gemini-2.5-flash-lite", name: "Gemini 2.5 Flash-Lite", provider: "Google", model: "gemini-2.5-flash-lite" },
  { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash", provider: "Google", model: "gemini-2.0-flash" },
  
  // DeepSeek Models (2025)
  { id: "deepseek-chat", name: "DeepSeek V3 Chat", provider: "DeepSeek", model: "deepseek-chat" },
  { id: "deepseek-reasoner", name: "DeepSeek R1 Reasoner", provider: "DeepSeek", model: "deepseek-reasoner" },
  
  // xAI Grok Models (2025)
  { id: "grok-4", name: "Grok 4", provider: "xAI", model: "grok-4" },
  { id: "grok-2-1212", name: "Grok 2", provider: "xAI", model: "grok-2-1212" },
  { id: "grok-2-vision-1212", name: "Grok 2 Vision", provider: "xAI", model: "grok-2-vision-1212" },
];

export async function callOpenAI(prompt: string, model: string): Promise<string> {
  const response = await openai.chat.completions.create({
    model: model,
    messages: [{ role: "user", content: prompt }],
    max_tokens: 2000,
  });
  
  return response.choices[0].message.content || "No response generated";
}

export async function callAnthropic(prompt: string, model: string): Promise<string> {
  const message = await anthropic.messages.create({
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }],
    model: model,
  });
  
  return Array.isArray(message.content) 
    ? message.content.map(block => block.type === 'text' ? block.text : '').join('')
    : message.content;
}

export async function callGemini(prompt: string, model: string): Promise<string> {
  const response = await gemini.models.generateContent({
    model: model,
    contents: prompt,
  });
  
  return response.text || "No response generated";
}

export async function callDeepSeek(prompt: string, model: string): Promise<string> {
  const response = await deepseek.chat.completions.create({
    model: model,
    messages: [{ role: "user", content: prompt }],
    max_tokens: 2000,
  });
  
  return response.choices[0].message.content || "No response generated";
}

export async function callGrok(prompt: string, model: string): Promise<string> {
  const response = await grok.chat.completions.create({
    model: model,
    messages: [{ role: "user", content: prompt }],
    max_tokens: 2000,
  });
  
  return response.choices[0].message.content || "No response generated";
}

export async function callAIModel(prompt: string, modelId: string): Promise<{ content: string; responseTime: number }> {
  const startTime = Date.now();
  const modelConfig = availableModels.find(m => m.id === modelId);
  
  if (!modelConfig) {
    throw new Error(`Model ${modelId} not found`);
  }
  
  let content: string;
  
  try {
    switch (modelConfig.provider) {
      case "OpenAI":
        content = await callOpenAI(prompt, modelConfig.model);
        break;
      case "Anthropic":
        content = await callAnthropic(prompt, modelConfig.model);
        break;
      case "Google":
        content = await callGemini(prompt, modelConfig.model);
        break;
      case "DeepSeek":
        content = await callDeepSeek(prompt, modelConfig.model);
        break;
      case "xAI":
        content = await callGrok(prompt, modelConfig.model);
        break;
      default:
        throw new Error(`Provider ${modelConfig.provider} not supported`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    throw new Error(`${modelConfig.provider} API error: ${errorMessage}`);
  }
  
  const responseTime = Date.now() - startTime;
  return { content, responseTime };
}
