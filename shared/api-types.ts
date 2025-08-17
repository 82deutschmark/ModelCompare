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
  mode: 'creative' | 'battle' | 'debate' | 'compare';
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