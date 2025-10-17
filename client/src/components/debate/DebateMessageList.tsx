/**
 *
 * Author: gpt-5-codex
 * Date: October 17, 2025 at 19:00 UTC
 * PURPOSE: Debate transcript renderer wired to the shared useDebateSession message type so persisted turns and
 *          streaming updates display consistently with continue/resume controls.
 * SRP/DRY check: Pass - Presentation-only component leveraging shared message types without duplicating business logic.
 */

import { Play, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MessageCard, type MessageCardData } from '@/components/MessageCard';
import type { AIModel } from '@/types/ai-models';
import type { DebateMessage } from '@/hooks/useDebateSession';

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
          streaming: true,
        },
        pricing: message.modelConfig?.pricing,
      },
    };
  };

  return (
    <div className="space-y-4">
      {messages.map((message, index) => (
        <div
          key={message.id}
          className={`${message.modelId === model1Id ? 'ml-0 mr-8' : 'ml-8 mr-0'}`}
        >
          <div className="flex items-center space-x-2 mb-2">
            <div
              className={`w-3 h-3 rounded-full ${
                message.modelId === model1Id ? 'bg-blue-500' : 'bg-green-500'
              }`}
            />
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
                    Continue - {
                      models.find(m => m.id === (currentRound % 2 === 1 ? model2Id : model1Id))?.name || 'Next Model'
                    }
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
