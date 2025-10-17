/**
 *
 * Author: gpt-5-codex
 * Date: October 17, 2025 at 19:05 UTC
 * PURPOSE: Debate export hook that sources persisted turn history and jury annotations to keep downloads/clipboard
 *          output aligned with the backend debate session record.
 * SRP/DRY check: Pass - Focused on export orchestration while reusing shared utilities and session data types.
 */

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

interface DebateExportParams {
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
        ...(turn.tokenUsage.reasoning !== undefined
          ? { reasoning: turn.tokenUsage.reasoning }
          : {}),
      }
    : undefined;

  if (!tokenUsage) {
    return {
      content: turn.content,
      status: 'success',
      responseTime: turn.durationMs ?? 0,
      reasoning: turn.reasoning,
      tokenUsage: undefined,
      cost: undefined,
    } as ModelResponse;
  }

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
    cost: costTotal !== undefined
      ? {
          input: costInput,
          output: costOutput,
          total: costTotal,
          ...(costReasoning !== undefined ? { reasoning: costReasoning } : {}),
        }
      : undefined,
  } as ModelResponse;
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
      const model = modelLookup.get(turn.modelId);
      const fallbackModel: AIModel = model ?? {
        id: turn.modelId,
        name: turn.modelName ?? turn.modelId,
        provider: 'Unknown',
        color: '#000000',
        premium: false,
        cost: { input: '$0.0000', output: '$0.0000' },
        supportsTemperature: true,
        responseTime: { speed: 'moderate', estimate: 'N/A' },
        apiModelName: turn.modelId,
        modelType: 'chat',
      };

      return {
        model: fallbackModel,
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
    } satisfies ExportData;
  }, []);

  const exportMarkdown = useCallback((params: DebateExportParams) => {
    const exportData = buildExportData(params);
    if (!exportData) return;

    const markdown = generateMarkdownExport(exportData);
    const filename = generateSafeFilename(`debate-${params.useCustomTopic ? params.customTopic || params.selectedTopic : params.selectedTopic}`, 'md');
    downloadFile(markdown, filename, 'text/markdown');

    toast({
      title: 'Debate Exported',
      description: 'Downloaded as markdown file',
    });
  }, [buildExportData, toast]);

  const copyToClipboardExport = useCallback(async (params: DebateExportParams): Promise<boolean> => {
    const exportData = buildExportData(params);
    if (!exportData) return false;

    const markdown = generateMarkdownExport(exportData);
    const success = await copyToClipboard(markdown);

    toast({
      title: success ? 'Copied to Clipboard' : 'Copy Failed',
      description: success ? 'Debate exported as markdown' : 'Could not copy to clipboard',
      variant: success ? 'default' : 'destructive',
    });

    return success;
  }, [buildExportData, toast]);

  return {
    exportMarkdown,
    copyToClipboard: copyToClipboardExport,
  };
}
