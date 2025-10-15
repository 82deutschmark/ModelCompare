/**
 * Debate message list component for displaying debate exchanges
 *
 * Author: Cascade
 * Date: October 15, 2025
 * PURPOSE: Renders debate messages with proper formatting and continue buttons
 * SRP/DRY check: Pass - Single responsibility for message list rendering, no duplication with other message components
 */

import { Play, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MessageCard, type MessageCardData } from '@/components/MessageCard';
import type { AIModel } from '@/types/ai-models';

interface DebateMessage {
  id: string;
  modelId: string;
  modelName: string;
  content: string;
  timestamp: number;
  round: number;
  reasoning?: string;
  systemPrompt?: string;
  responseTime: number;
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

interface DebateMessageListProps {
  messages: DebateMessage[];
  models: AIModel[];
  model1Id: string;
  model2Id: string;
  currentRound: number;
  isStreaming: boolean;
  onContinueDebate: () => void;
}

export function DebateMessageList({
  messages,
  models,
  model1Id,
  model2Id,
  currentRound,
  isStreaming,
  onContinueDebate,
}: DebateMessageListProps) {
  // Convert DebateMessage to MessageCardData format
  const convertToMessageCardData = (message: DebateMessage): MessageCardData => {
    const model = models.find(m => m.id === message.modelId);

    return {
      id: message.id,
      modelName: message.modelName,
      modelId: message.modelId,
      content: message.content,
      reasoning: message.reasoning,
      systemPrompt: message.systemPrompt,
      responseTime: message.responseTime,
      round: message.round,
      timestamp: message.timestamp,
      type: 'debate',
      tokenUsage: message.tokenUsage,
      cost: message.cost,
      modelConfig: {
        provider: model?.provider,
        capabilities: message.modelConfig?.capabilities || {
          reasoning: !!message.reasoning,
          multimodal: false,
          functionCalling: false,
          streaming: false
        },
        pricing: message.modelConfig?.pricing
      }
    };
  };

  return (
    <div className="space-y-4">
      {messages.map((message, index) => (
        <div key={message.id} className={`${
          message.modelId === model1Id ? 'ml-0 mr-8' : 'ml-8 mr-0'
        }`}>
          {/* Debate side indicator */}
          <div className="flex items-center space-x-2 mb-2">
            <div className={`w-3 h-3 rounded-full ${
              message.modelId === model1Id ? 'bg-blue-500' : 'bg-green-500'
            }`} />
            <Badge variant="outline" className="text-xs">
              {message.modelId === model1Id ? 'Pro' : 'Con'} - Round {message.round}
            </Badge>
          </div>

          <MessageCard
            message={convertToMessageCardData(message)}
            variant="detailed"
            showHeader={true}
            showFooter={true}
            className="shadow-sm"
          />

          {/* Continue Button - Only show on the last message */}
          {index === messages.length - 1 && currentRound > 0 && (
            <div className="mt-4">
              <Button
                onClick={onContinueDebate}
                size="sm"
                className="bg-green-600 hover:bg-green-700 w-full"
                disabled={isStreaming}
              >
                {isStreaming ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Streaming response...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Continue - {models.find(m => m.id === (currentRound % 2 === 1 ? model2Id : model1Id))?.name}'s turn
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
