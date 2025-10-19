// * Author: GPT-5 Codex
// * Date: 2025-10-17 19:47 UTC
// * PURPOSE: Rebuild debate export hook post-merge to emit debate turn history exports aligned with new session state and jury summaries.
// * SRP/DRY check: Pass - Hook focuses on export orchestration while reusing shared export utilities.

import { useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import {
  generateMarkdownExport,
  downloadFile,
  generateSafeFilename,
  copyToClipboard,
  type ExportData,
} from '@/lib/exportUtils';
import type { AIModel, ModelResponse } from '@/types/ai-models';
import type { DebateTurnHistoryEntry, DebateTurnJuryAnnotation } from '@/hooks/useDebateSession';

export interface DebateExportParams {
  turnHistory: DebateTurnHistoryEntry[];
  models: AIModel[];
  selectedTopic: string;
  customTopic: string;
  useCustomTopic: boolean;
  jurySummary?: DebateTurnJuryAnnotation | null;
}

export interface DebateExportState {
  exportMarkdown: (params: DebateExportParams) => void;
  copyToClipboard: (params: DebateExportParams) => Promise<boolean>;
}

function mapTurnToResponse(turn: DebateTurnHistoryEntry): ModelResponse {
  const tokenUsage = turn.tokenUsage
    ? {
        input: turn.tokenUsage.input ?? 0,
        output: turn.tokenUsage.output ?? 0,
        ...(turn.tokenUsage.reasoning !== undefined ? { reasoning: turn.tokenUsage.reasoning } : {}),
      }
    : undefined;

  let costTotal: number | undefined;
  let costInput = 0;
  let costOutput = 0;
  let costReasoning: number | undefined;

  if (typeof turn.cost === 'number') {
    costTotal = turn.cost;
  } else if (turn.cost) {
    costTotal = turn.cost.total ?? 0;
    costInput = turn.cost.input ?? 0;
    costOutput = turn.cost.output ?? 0;
    costReasoning = turn.cost.reasoning;
  }

  return {
    content: turn.content,
    status: 'success',
    responseTime: turn.durationMs ?? 0,
    reasoning: turn.reasoning,
    tokenUsage,
    cost:
      costTotal !== undefined
        ? {
            input: costInput,
            output: costOutput,
            total: costTotal,
            ...(costReasoning !== undefined ? { reasoning: costReasoning } : {}),
          }
        : undefined,
  };
}

function buildFallbackModel(id: string, name?: string): AIModel {
  const modelName = name ?? id;
  return {
    id,
    name: modelName,
    provider: 'Unknown',
    color: '#000000',
    premium: false,
    cost: { input: '$0.0000', output: '$0.0000' },
    supportsTemperature: true,
    responseTime: { speed: 'moderate', estimate: 'N/A' },
    apiModelName: id,
    modelType: 'chat',
  };
}

export function useDebateExport(): DebateExportState {
  const { toast } = useToast();

  const buildExportData = useCallback((params: DebateExportParams): ExportData | null => {
    const { turnHistory, models, selectedTopic, customTopic, useCustomTopic, jurySummary } = params;

    if (turnHistory.length === 0) {
      return null;
    }

    const topicText = useCustomTopic && customTopic ? customTopic : selectedTopic || 'Debate Topic';
    const modelLookup = new Map(models.map(model => [model.id, model]));

    const timeline = turnHistory.map(turn => {
      const model = modelLookup.get(turn.modelId) ?? buildFallbackModel(turn.modelId, turn.modelName);

      return {
        model,
        response: mapTurnToResponse(turn),
        turnNumber: turn.turn,
        jury: turn.jury,
        createdAt: turn.createdAt,
      };
    });

    return {
      prompt: `Debate Topic: ${topicText}`,
      timestamp: new Date(),
      models: timeline,
      mode: 'debate',
      jurySummary: jurySummary ?? null,
    };
  }, []);

  const exportMarkdown = useCallback(
    (params: DebateExportParams) => {
      const exportData = buildExportData(params);
      if (!exportData) {
        toast({
          title: 'Nothing to Export',
          description: 'Start the debate before exporting the transcript.',
          variant: 'destructive',
        });
        return;
      }

      const topicText = params.useCustomTopic && params.customTopic
        ? params.customTopic
        : params.selectedTopic || 'debate';

      const markdown = generateMarkdownExport(exportData);
      const filename = generateSafeFilename(`debate-${topicText}`, 'md');
      downloadFile(markdown, filename, 'text/markdown');

      toast({
        title: 'Debate Exported',
        description: 'Transcript downloaded as a markdown file.',
      });
    },
    [buildExportData, toast]
  );

  const copyToClipboardExport = useCallback(
    async (params: DebateExportParams): Promise<boolean> => {
      const exportData = buildExportData(params);
      if (!exportData) {
        toast({
          title: 'Nothing to Copy',
          description: 'Record at least one turn before copying the debate.',
          variant: 'destructive',
        });
        return false;
      }

      const markdown = generateMarkdownExport(exportData);
      const success = await copyToClipboard(markdown);

      toast({
        title: success ? 'Copied to Clipboard' : 'Copy Failed',
        description: success
          ? 'Debate transcript copied as markdown.'
          : 'Unable to copy debate transcript.',
        variant: success ? 'default' : 'destructive',
      });

      return success;
    },
    [buildExportData, toast]
  );

  return {
    exportMarkdown,
    copyToClipboard: copyToClipboardExport,
  };
}
