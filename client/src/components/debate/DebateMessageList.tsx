/*
 * Author: GPT-5 Codex
 * Date: 2025-10-17 19:24 UTC
 * PURPOSE: Render debate messages while wiring debate-specific log drawers and continue controls.
 * SRP/DRY check: Pass - Component focuses on list composition and actions, delegating card rendering.
 */

import { Play, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { AIModel } from '@/types/ai-models';
import type { DebateMessage } from '@/hooks/useDebateSession';
import { DebateMessageCard } from '@/components/debate/DebateMessageCard';

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
  return (
    <div className="space-y-4">
      {messages.map((message, index) => {
        const seatColor = message.modelId === model1Id
          ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
          : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
        const opponentMessagesForTurn = messages.filter(m => m.modelId !== message.modelId);

        return (
          <div
            key={message.id}
            id={message.id}
            className={`${message.modelId === model1Id ? 'ml-0 mr-8' : 'ml-8 mr-0'}`}
          >
            {/* Debate side indicator */}
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

            <DebateMessageCard
              message={message}
              models={models}
              seatColor={seatColor}
              opponentMessages={opponentMessagesForTurn}
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
        );
      })}
    </div>
  );
}
