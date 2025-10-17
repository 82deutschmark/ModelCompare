/*
 * Author: GPT-5 Codex
 * Date: 2025-10-17 19:18 UTC
 * PURPOSE: Wrap MessageCard with a debate-specific log drawer that replays reasoning chunks and analytics.
 * SRP/DRY check: Pass - Component coordinates debate message presentation and log replay without owning session state.
 */

import { useMemo, useState } from 'react';
import { MessageCard, type MessageCardData } from '@/components/MessageCard';
import { ReasoningTimeline } from '@/components/debate/ReasoningTimeline';
import {
  Drawer,
  DrawerTrigger,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Flame, Link as LinkIcon, FileText, Coins } from 'lucide-react';
import type { DebateMessage } from '@/hooks/useDebateSession';
import type { AIModel } from '@/types/ai-models';
import { computeInflectionThreshold, weightChunks } from '@/lib/chunkAnalytics';
import type { ContentStreamChunk, ReasoningStreamChunk } from '@/hooks/useAdvancedStreaming';

interface DebateMessageCardProps {
  message: DebateMessage;
  models: AIModel[];
  seatColor?: string;
  opponentMessages: DebateMessage[];
}

interface ChunkInsight<T extends ContentStreamChunk | ReasoningStreamChunk> {
  chunk: T;
  estimatedTokens: number;
  estimatedCost: number;
  cumulativeTokens: number;
  cumulativeCost: number;
  isInflection: boolean;
  opponentReference?: DebateMessage;
}

const toMessageCardData = (
  message: DebateMessage,
  models: AIModel[]
): MessageCardData => {
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
        streaming: true
      },
      pricing: message.modelConfig?.pricing
    }
  };
};

const selectOpponentReference = (chunkTimestamp: number, opponentMessages: DebateMessage[]): DebateMessage | undefined => {
  return opponentMessages.reduce<DebateMessage | undefined>((closest, candidate) => {
    if (candidate.timestamp > chunkTimestamp) {
      return closest;
    }
    if (!closest) {
      return candidate;
    }
    return candidate.timestamp > closest.timestamp ? candidate : closest;
  }, undefined);
};

const buildChunkInsights = <T extends ReasoningStreamChunk | ContentStreamChunk>(
  chunks: T[],
  totalTokens: number,
  totalCost: number,
  opponentMessages: DebateMessage[],
  inflectionThreshold: number
): ChunkInsight<T>[] => {
  const weighted = weightChunks(chunks);
  let runningTokens = 0;
  let runningCost = 0;

  return weighted.map(entry => {
    const estimatedTokens = totalTokens * entry.weight;
    const estimatedCost = totalCost * entry.weight;
    runningTokens += estimatedTokens;
    runningCost += estimatedCost;
    return {
      chunk: entry.chunk,
      estimatedTokens,
      estimatedCost,
      cumulativeTokens: runningTokens,
      cumulativeCost: runningCost,
      isInflection: entry.chunk.intensity >= inflectionThreshold,
      opponentReference: selectOpponentReference(entry.chunk.timestamp, opponentMessages)
    };
  });
};

const formatSeconds = (timestamp: number, base: number) => {
  const elapsed = (timestamp - base) / 1000;
  return `${elapsed.toFixed(2)}s`;
};

const formatTokenDelta = (value: number) => `${Math.round(value)}`;

const formatCostDelta = (value: number) => `$${value.toFixed(4)}`;

export function DebateMessageCard({
  message,
  models,
  seatColor,
  opponentMessages
}: DebateMessageCardProps) {
  const messageData = useMemo(() => toMessageCardData(message, models), [message, models]);
  const reasoningChunks = message.reasoningChunks ?? [];
  const contentChunks = message.contentChunks ?? [];

  const opponentMessagesSorted = useMemo(
    () => [...opponentMessages].sort((a, b) => a.timestamp - b.timestamp),
    [opponentMessages]
  );

  const reasoningTokenTotal = message.tokenUsage?.reasoning ?? 0;
  const outputTokenTotal = message.tokenUsage?.output ?? 0;
  const reasoningCostTotal = message.cost?.reasoning ?? 0;
  const contentCostTotal = Math.max((message.cost?.total ?? 0) - (message.cost?.reasoning ?? 0), 0);

  const reasoningThreshold = useMemo(
    () => computeInflectionThreshold(reasoningChunks),
    [reasoningChunks]
  );
  const contentThreshold = useMemo(
    () => computeInflectionThreshold(contentChunks),
    [contentChunks]
  );

  const baseTimestamp = useMemo(() => {
    const timestamps = [...reasoningChunks, ...contentChunks].map(chunk => chunk.timestamp);
    return timestamps.length ? Math.min(...timestamps) : message.timestamp;
  }, [reasoningChunks, contentChunks, message.timestamp]);

  const reasoningInsights = useMemo(
    () =>
      buildChunkInsights(
        reasoningChunks,
        reasoningTokenTotal,
        reasoningCostTotal,
        opponentMessagesSorted,
        reasoningThreshold
      ),
    [reasoningChunks, reasoningTokenTotal, reasoningCostTotal, opponentMessagesSorted, reasoningThreshold]
  );

  const contentInsights = useMemo(
    () =>
      buildChunkInsights(
        contentChunks,
        outputTokenTotal,
        contentCostTotal,
        opponentMessagesSorted,
        contentThreshold
      ),
    [contentChunks, outputTokenTotal, contentCostTotal, opponentMessagesSorted, contentThreshold]
  );

  const [selectedTimestamp, setSelectedTimestamp] = useState<number | undefined>(undefined);

  const handleChunkFocus = (timestamp: number) => {
    setSelectedTimestamp(timestamp);
  };

  return (
    <Drawer>
      <MessageCard
        message={messageData}
        variant="detailed"
        showHeader
        showFooter
        className="shadow-sm"
        seatColor={seatColor}
        footerActions={
          (reasoningChunks.length > 0 || contentChunks.length > 0) && (
            <DrawerTrigger asChild>
              <Button size="sm" variant="outline" className="h-8 text-xs font-semibold">
                <FileText className="mr-2 h-4 w-4" />
                View Log
              </Button>
            </DrawerTrigger>
          )
        }
      />

      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="text-left">
          <DrawerTitle className="flex items-center justify-between text-base">
            <span>{message.modelName} · Turn {message.round}</span>
            <Badge variant="outline" className="text-xs">
              {new Date(message.timestamp).toLocaleTimeString()}
            </Badge>
          </DrawerTitle>
          <DrawerDescription className="text-sm text-slate-600 dark:text-slate-300">
            Replay the model's private reasoning alongside spoken output. Token and cost deltas are approximated via chunk
            proportions to highlight expensive inflection points.
          </DrawerDescription>
        </DrawerHeader>

        <div className="px-4 pb-4 space-y-6">
          <ReasoningTimeline
            reasoningChunks={reasoningChunks}
            contentChunks={contentChunks}
            selectedTimestamp={selectedTimestamp}
            onScrub={setSelectedTimestamp}
          />

          <Separator />

          <div className="grid gap-4 md:grid-cols-2">
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-amber-700 dark:text-amber-300 flex items-center gap-2">
                  <Flame className="h-4 w-4" />
                  Reasoning Chunks
                </h3>
                <Badge variant="outline" className="text-xs">
                  {reasoningInsights.length} steps
                </Badge>
              </div>
              <ScrollArea className="h-72 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/30 p-3">
                <div className="space-y-3">
                  {reasoningInsights.map((insight, index) => (
                    <div
                      key={`reasoning-${insight.chunk.timestamp}-${index}`}
                      className={`rounded-md border px-3 py-2 text-xs shadow-sm transition-colors ${
                        insight.isInflection
                          ? 'border-amber-400/70 bg-amber-50 dark:border-amber-500/60 dark:bg-amber-900/20'
                          : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800'
                      }`}
                      onMouseEnter={() => handleChunkFocus(insight.chunk.timestamp)}
                    >
                      <div className="flex items-center justify-between font-medium text-slate-600 dark:text-slate-200">
                        <span>
                          Step {index + 1} · {formatSeconds(insight.chunk.timestamp, baseTimestamp)}
                        </span>
                        <span className="font-mono text-slate-500 dark:text-slate-300">
                          Δ{formatTokenDelta(insight.estimatedTokens)} tok · {formatCostDelta(insight.estimatedCost)}
                        </span>
                      </div>
                      <p className="mt-2 whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-slate-700 dark:text-slate-100">
                        {insight.chunk.delta.trim() || '…'}
                      </p>
                      {insight.opponentReference && (
                        <a
                          href={`#${insight.opponentReference.id}`}
                          className="mt-2 inline-flex items-center text-[11px] font-semibold text-sky-600 hover:text-sky-700 dark:text-sky-300"
                        >
                          <LinkIcon className="mr-1 h-3 w-3" />
                          Opponent: {insight.opponentReference.modelName} · Round {insight.opponentReference.round}
                        </a>
                      )}
                    </div>
                  ))}
                  {reasoningInsights.length === 0 && (
                    <p className="text-xs text-slate-500 dark:text-slate-400">No reasoning telemetry captured for this turn.</p>
                  )}
                </div>
              </ScrollArea>
            </section>

            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-sky-700 dark:text-sky-300 flex items-center gap-2">
                  <Coins className="h-4 w-4" />
                  Spoken Chunks
                </h3>
                <Badge variant="outline" className="text-xs">
                  {contentInsights.length} segments
                </Badge>
              </div>
              <ScrollArea className="h-72 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/30 p-3">
                <div className="space-y-3">
                  {contentInsights.map((insight, index) => (
                    <div
                      key={`content-${insight.chunk.timestamp}-${index}`}
                      className={`rounded-md border px-3 py-2 text-xs shadow-sm transition-colors ${
                        insight.isInflection
                          ? 'border-sky-400/70 bg-sky-50 dark:border-sky-500/60 dark:bg-sky-900/20'
                          : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800'
                      }`}
                      onMouseEnter={() => handleChunkFocus(insight.chunk.timestamp)}
                    >
                      <div className="flex items-center justify-between font-medium text-slate-600 dark:text-slate-200">
                        <span>
                          Segment {index + 1} · {formatSeconds(insight.chunk.timestamp, baseTimestamp)}
                        </span>
                        <span className="font-mono text-slate-500 dark:text-slate-300">
                          Δ{formatTokenDelta(insight.estimatedTokens)} tok · {formatCostDelta(insight.estimatedCost)}
                        </span>
                      </div>
                      <p className="mt-2 whitespace-pre-wrap text-[11px] leading-relaxed text-slate-700 dark:text-slate-100">
                        {insight.chunk.delta.trim() || '…'}
                      </p>
                      {insight.opponentReference && (
                        <a
                          href={`#${insight.opponentReference.id}`}
                          className="mt-2 inline-flex items-center text-[11px] font-semibold text-sky-600 hover:text-sky-700 dark:text-sky-300"
                        >
                          <LinkIcon className="mr-1 h-3 w-3" />
                          Responding to {insight.opponentReference.modelName}
                        </a>
                      )}
                    </div>
                  ))}
                  {contentInsights.length === 0 && (
                    <p className="text-xs text-slate-500 dark:text-slate-400">No streamed content chunks recorded.</p>
                  )}
                </div>
              </ScrollArea>
            </section>
          </div>
        </div>

        <DrawerFooter className="border-t border-slate-200 dark:border-slate-700">
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-300">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-amber-500/10 text-amber-700 dark:text-amber-200">
                Reasoning Δ Tokens ≈ {formatTokenDelta(reasoningTokenTotal)}
              </Badge>
              <Badge variant="secondary" className="bg-sky-500/10 text-sky-700 dark:text-sky-200">
                Output Δ Tokens ≈ {formatTokenDelta(outputTokenTotal)}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold">Estimated cost mix:</span>
              <span className="font-mono">{formatCostDelta(reasoningCostTotal)} reasoning</span>
              <span className="font-mono">{formatCostDelta(contentCostTotal)} spoken</span>
            </div>
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
