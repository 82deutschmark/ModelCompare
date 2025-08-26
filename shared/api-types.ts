/**
 * Shared API Types
 * Author: GPT-5 (medium reasoning)
 * Date: 2025-08-17
 *
 * What this file does: Centralizes request/response and model types shared by
 * client and server (GenerateRequest, UnifiedMessage, TokenUsage, Cost, etc.).
 * How it works: Types are imported by server/routes.ts and client call sites to
 * ensure consistent contracts for /api/generate and legacy endpoints.
 * How the project uses it: Frontend builds payloads for /api/generate with a
 * mode union that matches server allow-list, including new modes.
 */
export interface TokenUsage {
  input: number;
  output: number;
  reasoning?: number;
}

export interface Cost {
  total: number;
  input: number;
  output: number;
  reasoning?: number;
}

export interface ModelConfig {
  id: string;
  name: string;
  provider: string;
  maxTokens?: number;
  temperature?: number;
}

export interface ModelSeat {
  id: string;
  model: ModelConfig;
  label?: string;
}

export interface UnifiedMessageIn {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  createdAt: string;
}

export interface UnifiedMessage {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  seatId?: string;
  content: string;
  reasoning?: string;
  createdAt: string;
  
  type?: 'initial' | 'rebuttal' | 'creative' | 'debate' | 'comparison';
  round?: number;
  passNumber?: number;
  
  status?: 'pending' | 'streaming' | 'complete' | 'error';
  finishReason?: 'stop' | 'length' | 'tool' | 'content_filter' | 'error';
  
  parentId?: string;
  toolCall?: { name: string; arguments: unknown };
  toolResult?: unknown;
  
  tokenUsage?: TokenUsage;
  cost?: Cost;
  modelConfig?: ModelConfig;
}

export interface GenerateRequest {
  mode: 'creative' | 'battle' | 'debate' | 'compare' | 'research-synthesis' | 'plan-assessment' | 'vixra';
  sessionId?: string;
  template: string;
  variables: Record<string, string>;
  messages: UnifiedMessageIn[];
  seats: ModelSeat[];
  options?: {
    temperature?: number;
    maxTokens?: number;
    stream?: boolean;
  };
}

export interface SSEEvents {
  messageStart: { 
    messageId: string; 
    seatId: string; 
    createdAt: string; 
    resolvedPrompt?: string; 
  };
  delta: { 
    messageId: string; 
    text: string; 
    reasoning?: string; 
    tokens?: number; 
  };
  messageEnd: { 
    messageId: string; 
    finishReason: 'stop' | 'length' | 'tool' | 'content_filter' | 'error';
    tokenUsage: TokenUsage; 
    cost: Cost; 
    resolvedPrompt: string;
    modelConfig: ModelConfig;
  };
  error: { 
    messageId?: string; 
    code: string; 
    message: string; 
  };
}

export interface GenerateResponse {
  message: UnifiedMessage;
  tokenUsage: TokenUsage;
  cost: Cost;
  resolvedPrompt: string;
  variableMapping: Record<string, string>;
  warnings: string[];
}

export interface VariableDefinition {
  name: string;
  type: 'string' | 'number' | 'boolean';
  required: boolean;
  description?: string;
  defaultValue?: string;
  validation?: {
    minLength?: number;
    maxLength?: number;
    pattern?: string;
  };
}

export interface TemplateMetadata {
  filePath: string;
  lastModified: string;
  version: string;
  author?: string;
  description?: string;
}

export interface StructuredTemplate {
  id: string;
  name: string;
  mode: 'creative' | 'battle' | 'debate' | 'compare' | 'research-synthesis' | 'plan-assessment' | 'vixra';
  category: string;
  structure: {
    systemInstructions?: string;
    userTemplate: string;
    contextTemplate?: string;
    responseGuidelines?: string;
  };
  variables: VariableDefinition[];
  metadata: TemplateMetadata;
}

export interface ModelMessage {
  role: 'system' | 'user' | 'assistant' | 'context';
  content: string;
  metadata?: {
    templateId?: string;
    variables?: Record<string, string>;
  };
}

export interface CallOptions {
  maxTokens?: number;
  temperature?: number;
  model: string;
}

export interface PromptAudit {
  templateId: string;
  variables: Record<string, string>;
  resolvedSections: {
    systemInstructions?: string;
    userContent: string;
    contextContent?: string;
  };
  timestamp: string;
  messageStructure: ModelMessage[];
}