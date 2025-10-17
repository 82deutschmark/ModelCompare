// * Author: GPT-5 Codex
// * Date: 2025-10-17 19:47 UTC
// * PURPOSE: Clean debate transcript list post-merge, delegating rendering to DebateMessageCard while guarding continue controls.
// * SRP/DRY check: Pass - Component focuses on list composition and continue button state.

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
  disableContinue?: boolean;
  disableReason?: string;
}

export function DebateMessageList({
  messages,
  models,
  model1Id,
  model2Id,
  currentRound,
  isStreaming,
  onContinueDebate,
  disableContinue = false,
  disableReason,
}: DebateMessageListProps) {
  return (
    <div className="space-y-4">
      {messages.map((message, index) => {
        const seatColor =
          message.modelId === model1Id
            ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
            : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
        const opponentMessages = messages.filter(m => m.modelId !== message.modelId);
        const continueDisabled = isStreaming || disableContinue;
        const nextModelId = currentRound % 2 === 1 ? model2Id : model1Id;
        const nextModelName = models.find(model => model.id === nextModelId)?.name ?? 'Next Model';

        return (
          <div
            key={message.id}
            id={message.id}
            className={message.modelId === model1Id ? 'ml-0 mr-8' : 'ml-8 mr-0'}
          >
            <div className="flex items-center space-x-2 mb-2">
              <div
                className={`w-3 h-3 rounded-full ${
                  message.modelId === model1Id ? 'bg-blue-500' : 'bg-green-500'
                }`}
              />
              <Badge variant="outline" className="text-xs">
                {message.modelId === model1Id ? 'Affirmative' : 'Negative'} · Round {message.round}
              </Badge>
            </div>

            <DebateMessageCard
              message={message}
              models={models}
              seatColor={seatColor}
              opponentMessages={opponentMessages}
            />

            {index === messages.length - 1 && currentRound > 0 && (
              <div className="mt-4 space-y-2">
                <Button
                  onClick={onContinueDebate}
                  size="sm"
                  className="w-full bg-green-600 hover:bg-green-700"
                  disabled={continueDisabled}
                >
                  {isStreaming ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Streaming response...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      Continue · {nextModelName}
                    </>
                  )}
                </Button>
                {disableReason && continueDisabled && !isStreaming && (
                  <p className="text-xs text-muted-foreground text-center">{disableReason}</p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
