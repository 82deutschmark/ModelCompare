import { create } from 'zustand';
import { UnifiedMessage } from './api-types';

export interface AppState {
  originalPrompt: string;
  variables: Record<string, string>;
  messages: UnifiedMessage[];
  isProcessing: boolean;
  sessionStartedAt: string | null;
  activeSeatId?: string;
  
  setOriginalPrompt: (prompt: string) => void;
  setVariable: (key: string, value: string) => void;
  setVariables: (variables: Record<string, string>) => void;
  upsertMessage: (message: UnifiedMessage) => void;
  appendDelta: (messageId: string, text: string) => void;
  setStatus: (messageId: string, status: UnifiedMessage['status']) => void;
  setActiveSeat: (seatId: string) => void;
  clearMessages: () => void;
  setIsProcessing: (processing: boolean) => void;
}

export const selectors = {
  getLastAssistantMessage: (state: AppState, seatId?: string) => 
    state.messages
      .filter(m => m.role === 'assistant' && (!seatId || m.seatId === seatId))
      .slice(-1)[0],
      
  getCurrentResponse: (state: AppState, seatId?: string) => 
    selectors.getLastAssistantMessage(state, seatId)?.content || '',
    
  getTotals: (state: AppState) => 
    state.messages.reduce((acc, msg) => ({
      cost: acc.cost + (msg.cost?.total || 0),
      tokens: {
        input: acc.tokens.input + (msg.tokenUsage?.input || 0),
        output: acc.tokens.output + (msg.tokenUsage?.output || 0),
        reasoning: acc.tokens.reasoning + (msg.tokenUsage?.reasoning || 0)
      }
    }), { cost: 0, tokens: { input: 0, output: 0, reasoning: 0 } }),

  getMessagesBySeat: (state: AppState, seatId: string) =>
    state.messages.filter(m => m.seatId === seatId),

  getActiveMessages: (state: AppState) =>
    state.activeSeatId 
      ? state.messages.filter(m => m.seatId === state.activeSeatId)
      : state.messages,

  getStreamingMessage: (state: AppState, seatId?: string) =>
    state.messages.find(m => 
      m.status === 'streaming' && (!seatId || m.seatId === seatId)
    ),

  hasActiveSession: (state: AppState) =>
    state.sessionStartedAt !== null,

  getLatestMessagePerSeat: (state: AppState) => {
    const seatMessages: Record<string, UnifiedMessage> = {};
    state.messages.forEach(message => {
      if (message.seatId && message.role === 'assistant') {
        if (!seatMessages[message.seatId] || 
            new Date(message.createdAt) > new Date(seatMessages[message.seatId].createdAt)) {
          seatMessages[message.seatId] = message;
        }
      }
    });
    return seatMessages;
  }
};

export const useAppStore = create<AppState>((set, get) => ({
  originalPrompt: '',
  variables: {},
  messages: [],
  isProcessing: false,
  sessionStartedAt: null,
  
  setOriginalPrompt: (prompt) => set({ originalPrompt: prompt }),
  
  setVariable: (key, value) => set(state => ({ 
    variables: { ...state.variables, [key]: value } 
  })),
  
  setVariables: (variables) => set({ variables }),
  
  upsertMessage: (message) => set(state => ({
    messages: state.messages.find(m => m.id === message.id)
      ? state.messages.map(m => m.id === message.id ? message : m)
      : [...state.messages, message]
  })),
  
  appendDelta: (messageId, text) => set(state => ({
    messages: state.messages.map(m => 
      m.id === messageId 
        ? { ...m, content: m.content + text }
        : m
    )
  })),
  
  setStatus: (messageId, status) => set(state => ({
    messages: state.messages.map(m =>
      m.id === messageId ? { ...m, status } : m
    )
  })),
  
  setActiveSeat: (seatId) => set({ activeSeatId: seatId }),
  
  clearMessages: () => set({ 
    messages: [], 
    sessionStartedAt: null,
    isProcessing: false 
  }),
  
  setIsProcessing: (processing) => set({ isProcessing: processing })
}));