/*
 * Author: GPT-5 Codex
 * Date: 2025-10-17 22:58 UTC
 * PURPOSE: Debate mode orchestrator that hydrates persisted turn history, reconciles streaming updates, and coordinates the
 *          modern streaming handshake while keeping exports, history, and jury controls aligned.
 * SRP/DRY check: Pass - Component composes hooks/services to manage debate state without duplicating underlying logic.
 */

import { useRef, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageSquare, Settings } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { StreamingDisplay } from "@/components/StreamingDisplay";
import { StreamingControls } from "@/components/StreamingControls";
import { AppNavigation } from "@/components/AppNavigation";
import { apiRequest } from "@/lib/queryClient";
import type { AIModel } from '@/types/ai-models';
import { useDebateSetup } from "@/hooks/useDebateSetup";
import {
  useDebateSession,
  ROBERTS_RULES_PHASES,
  type DebatePhase,
  type DebateSessionSummary,
  type DebateSessionHydration,
} from "@/hooks/useDebateSession";
import { useDebateStreaming } from "@/hooks/useDebateStreaming";
import { useDebatePrompts } from "@/hooks/useDebatePrompts";
import { useDebateExport } from "@/hooks/useDebateExport";
import { DebateService } from "@/services/debateService";
import { DebateSetupPanel } from "@/components/debate/DebateSetupPanel";
import { DebateControls } from "@/components/debate/DebateControls";
import { DebateMessageList } from "@/components/debate/DebateMessageList";
import { DebateHistoryDrawer } from "@/components/debate/DebateHistoryDrawer";

interface CreateDebateSessionResponse {
  id: string;
  topic: string;
  model1Id: string;
  model2Id: string;
  adversarialLevel: number;
}

export default function Debate() {
  const { toast } = useToast();
  const chatEndRef = useRef<HTMLDivElement>(null);

  const debateSetup = useDebateSetup();
  const debateSession = useDebateSession();
  const debateStreaming = useDebateStreaming();

  const { debateData, loading: debateLoading, error: debateError, generateDebatePrompts } = useDebatePrompts();
  const { exportMarkdown, copyToClipboard } = useDebateExport();

  const { data: models = [] } = useQuery({
    queryKey: ['/api/models'],
    queryFn: async () => {
      const response = await fetch('/api/models');
      if (!response.ok) throw new Error('Failed to fetch models');
      return response.json() as Promise<AIModel[]>;
    },
  });

  const debateService = useMemo(() => {
    if (!debateData || models.length === 0) return null;
    return new DebateService({
      debateData,
      models,
      selectedTopic: debateSetup.selectedTopic,
      customTopic: debateSetup.customTopic,
      useCustomTopic: debateSetup.useCustomTopic,
      adversarialLevel: debateSetup.adversarialLevel,
      model1Id: debateSetup.model1Id,
      model2Id: debateSetup.model2Id,
    });
  }, [
    debateData,
    models,
    debateSetup.selectedTopic,
    debateSetup.customTopic,
    debateSetup.useCustomTopic,
    debateSetup.adversarialLevel,
    debateSetup.model1Id,
    debateSetup.model2Id,
  ]);

  // Create debate session mutation; streaming kickoff happens in handleStartDebate to leverage latest dependencies
  const createDebateSessionMutation = useMutation({
    mutationFn: async (data: { topic: string; model1Id: string; model2Id: string; adversarialLevel: number }) => {
      const response = await apiRequest('POST', '/api/debate/session', data);
      return response.json() as Promise<CreateDebateSessionResponse>;
    },
  });

  const normalizeSummary = (session: any): DebateSessionSummary => {
    const totalCostNumber = typeof session.totalCost === 'number'
      ? session.totalCost
      : Number(session.totalCost ?? 0);

    const jurySource = session.jurySummary || session.juryVerdict || session.jury || null;
    const jury = jurySource
      ? {
          verdict: jurySource.verdict ?? jurySource.label ?? undefined,
          summary: jurySource.summary ?? jurySource.reason ?? (typeof jurySource === 'string' ? jurySource : undefined),
          winnerModelId: jurySource.winnerModelId ?? jurySource.winner ?? undefined,
          score: typeof jurySource.score === 'number' ? jurySource.score : undefined,
          confidence: typeof jurySource.confidence === 'number' ? jurySource.confidence : undefined,
        }
      : undefined;

    const turnCount = Array.isArray(session.turnHistory)
      ? session.turnHistory.length
      : typeof session.turnCount === 'number'
        ? session.turnCount
        : undefined;

    return {
      id: session.id,
      topic: session.topic ?? session.topicText ?? 'Debate',
      model1Id: session.model1Id,
      model2Id: session.model2Id,
      adversarialLevel: session.adversarialLevel,
      totalCost: Number.isNaN(totalCostNumber) ? 0 : totalCostNumber,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      durationMs: session.durationMs,
      turnCount,
      jury,
    };
  };

  const loadDebateSessionsMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/debate/sessions');
      if (!response.ok) throw new Error('Failed to load debate sessions');
      return response.json();
    },
    onSuccess: (data) => {
      const sessionsArray = Array.isArray(data) ? data : [];
      const normalized = sessionsArray.map(normalizeSummary);
      debateSession.setExistingDebateSessions(normalized);
    },
    onError: (error) => {
      toast({
        title: "Failed to Load Sessions",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const sessionDetailsQuery = useQuery({
    queryKey: ['/api/debate/session', debateSession.debateSessionId],
    enabled: Boolean(debateSession.debateSessionId),
    refetchOnWindowFocus: false,
    queryFn: async (): Promise<DebateSessionHydration> => {
      if (!debateSession.debateSessionId) {
        throw new Error('No debate session selected');
      }
      const response = await fetch(`/api/debate/session/${debateSession.debateSessionId}`);
      if (!response.ok) throw new Error('Failed to fetch debate session');
      return response.json();
    },
  });

  useEffect(() => {
    loadDebateSessionsMutation.mutate();
  }, []);

  useEffect(() => {
    if (!chatEndRef.current) return;
    try {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    } catch (error) {
      console.debug('Chat scroll error:', error);
    }
  }, [debateSession.messages]);

  useEffect(() => {
    if (
      debateStreaming.responseId &&
      debateStreaming.content &&
      debateSession.messages.length === 0
    ) {
      const model1 = debateService?.getModel(debateSetup.model1Id);
      const initialMessage = {
        id: "msg-1",
        modelId: debateSetup.model1Id,
        modelName: model1?.name ?? "Model 1",
        content: debateStreaming.content,
        reasoning: debateStreaming.reasoning,
        reasoningChunks: debateStreaming.reasoningChunks.map(chunk => ({ ...chunk })),
        contentChunks: debateStreaming.contentChunks.map(chunk => ({ ...chunk })),
        timestamp: Date.now(),
        round: 1,
        turnNumber: 1,
        responseId: debateStreaming.responseId,
        responseTime: 0,
        tokenUsage: debateStreaming.tokenUsage,
        cost: debateStreaming.cost,
        modelConfig: {
          capabilities: {
            reasoning: Boolean(debateSetup.model1Config.enableReasoning),
            multimodal: false,
            functionCalling: false,
            streaming: true,
          },
          pricing: {
            inputPerMillion: 0,
            outputPerMillion: 0,
          },
        },
      };

      debateSession.addMessage(initialMessage);
      debateSession.setModelALastResponseId(debateStreaming.responseId);
      debateSession.setCurrentRound(1);
      debateSetup.setShowSetup(false);
    }
  }, [
    debateStreaming.responseId,
    debateStreaming.content,
    debateStreaming.reasoning,
    debateStreaming.reasoningChunks,
    debateStreaming.contentChunks,
    debateStreaming.tokenUsage,
    debateStreaming.cost,
    debateSession.messages.length,
    debateSession.addMessage,
    debateSession.setModelALastResponseId,
    debateSession.setCurrentRound,
    debateSetup.setShowSetup,
    debateService,
    debateSetup.model1Id,
    debateSetup.model1Config.enableReasoning,
    debateSetup.model1Config.maxTokens
  ]);

  useEffect(() => {
    if (
      debateStreaming.responseId &&
      debateStreaming.content &&
      debateSession.messages.length > 0 &&
      debateStreaming.responseId !== debateSession.modelALastResponseId &&
      debateStreaming.responseId !== debateSession.modelBLastResponseId
    ) {
      const isModelBTurn = debateSession.currentRound % 2 === 1;
      const nextModelId = isModelBTurn ? debateSetup.model2Id : debateSetup.model1Id;
      const nextModelConfig = isModelBTurn ? debateSetup.model2Config : debateSetup.model1Config;
      const model = debateService?.getModel(nextModelId);
      const nextTurn = debateSession.currentRound + 1;

      debateSession.addMessage({
        id: `msg-${nextTurn}`,
        modelId: nextModelId,
        modelName: model?.name || "Model",
        content: debateStreaming.content,
        reasoning: debateStreaming.reasoning,
        reasoningChunks: debateStreaming.reasoningChunks.map(chunk => ({ ...chunk })),
        contentChunks: debateStreaming.contentChunks.map(chunk => ({ ...chunk })),
        timestamp: Date.now(),
        round: Math.ceil(nextTurn / 2),
        turnNumber: nextTurn,
        responseId: debateStreaming.responseId,
        responseTime: 0,
        tokenUsage: debateStreaming.tokenUsage,
        cost: debateStreaming.cost,
        modelConfig: {
          capabilities: nextModelConfig.enableReasoning
            ? { reasoning: true, multimodal: false, functionCalling: false, streaming: true }
            : { reasoning: false, multimodal: false, functionCalling: false, streaming: true },
          pricing: { inputPerMillion: 0, outputPerMillion: 0 },
        },
      });

      if (isModelBTurn) {
        debateSession.setModelBLastResponseId(debateStreaming.responseId);
      } else {
        debateSession.setModelALastResponseId(debateStreaming.responseId);
      }

      debateSession.setCurrentRound(nextTurn);
    }
  }, [
    debateStreaming.responseId,
    debateStreaming.content,
    debateStreaming.reasoning,
    debateStreaming.reasoningChunks,
    debateStreaming.contentChunks,
    debateStreaming.tokenUsage,
    debateStreaming.cost,
    debateSession.messages.length,
    debateSession.currentRound,
    debateService,
    debateSetup.model1Id,
    debateSetup.model2Id,
    debateSetup.model1Config.enableReasoning,
    debateSetup.model2Config.enableReasoning,
    debateSetup.model2Config.enableReasoning
  ]);

  useEffect(() => {
    if (!sessionDetailsQuery.data || models.length === 0) return;
    const modelLookup = new Map(models.map(model => [model.id, { name: model.name, provider: model.provider }]));
    debateSession.hydrateFromSession(sessionDetailsQuery.data, modelLookup);

    debateSetup.setModel1Id(sessionDetailsQuery.data.model1Id);
    debateSetup.setModel2Id(sessionDetailsQuery.data.model2Id);
    debateSetup.setUseCustomTopic(true);
    debateSetup.setCustomTopic(sessionDetailsQuery.data.topic);
    debateSetup.setSelectedTopic('custom');
    debateSetup.setAdversarialLevel(sessionDetailsQuery.data.adversarialLevel);
    debateSetup.setShowSetup(false);
  }, [sessionDetailsQuery.data, models]);

  useEffect(() => {
    if (!debateStreaming.responseId || !debateSession.debateSessionId) return;
    sessionDetailsQuery.refetch();
    loadDebateSessionsMutation.mutate();
  }, [
    debateStreaming.responseId,
    debateSession.debateSessionId,
    sessionDetailsQuery.refetch,
    loadDebateSessionsMutation.mutate,
  ]);

  const continueDebate = async () => {
    if (!debateSession.isFloorOpen()) {
      toast({
        title: "Floor Closed",
        description: "Reopen the debate floor before continuing to the next turn.",
        variant: "destructive",
      });
      return;
    }

    if (!debateSetup.model1Id || !debateSetup.model2Id || !debateService) return;
    if (debateSession.messages.length === 0) return;

    const resume = debateSession.getResumeContext({
      model1Id: debateSetup.model1Id,
      model2Id: debateSetup.model2Id,
    });

    const lastMessage = debateSession.messages[debateSession.messages.length - 1];
    const nextModelConfig = resume.isModelBTurn ? debateSetup.model2Config : debateSetup.model1Config;

    await debateStreaming.startStream({
      modelId: resume.nextModelId,
      topic: debateService.getTopicText(),
      role: resume.isModelBTurn ? 'NEGATIVE' : 'AFFIRMATIVE',
      intensity: debateSetup.adversarialLevel,
      opponentMessage: lastMessage.content,
      previousResponseId: resume.previousResponseId,
      turnNumber: resume.nextTurnNumber,
      sessionId: debateSession.debateSessionId ?? undefined,
      model1Id: debateSetup.model1Id,
      model2Id: debateSetup.model2Id,
      reasoningEffort: nextModelConfig.reasoningEffort,
      reasoningSummary: nextModelConfig.reasoningSummary,
      textVerbosity: nextModelConfig.textVerbosity,
      temperature: nextModelConfig.temperature,
      maxTokens: nextModelConfig.maxTokens,
    });
  };

  const handleStartDebate = async () => {
    if (!debateService?.canStartDebate()) {
      toast({
        title: "Select Both Models",
        description: "Please select two models for the debate.",
        variant: "destructive",
      });
      return;
    }

    const prompts = debateService.generatePrompts();

    debateSession.setSessionMetadata({
      topic: prompts.topicText,
      model1Id: debateSetup.model1Id,
      model2Id: debateSetup.model2Id,
      adversarialLevel: debateSetup.adversarialLevel,
    });

    try {
      const sessionData = await createDebateSessionMutation.mutateAsync({
        topic: prompts.topicText,
        model1Id: debateSetup.model1Id,
        model2Id: debateSetup.model2Id,
        adversarialLevel: debateSetup.adversarialLevel,
      });

      debateSession.setDebateSessionId(sessionData.id);
      debateSession.setSessionMetadata({
        topic: sessionData.topic,
        model1Id: sessionData.model1Id,
        model2Id: sessionData.model2Id,
        adversarialLevel: sessionData.adversarialLevel,
      });
      debateSession.updateJurySummary(null);

      toast({
        title: "Debate Session Created",
        description: "Starting debate with session tracking",
      });

      await debateStreaming.startStream({
        modelId: debateSetup.model1Id,
        topic: prompts.topicText,
        role: 'AFFIRMATIVE',
        intensity: debateSetup.adversarialLevel,
        opponentMessage: null,
        previousResponseId: null,
        turnNumber: 1,
        sessionId: sessionData.id,
        model1Id: debateSetup.model1Id,
        model2Id: debateSetup.model2Id,
        reasoningEffort: debateSetup.model1Config.reasoningEffort,
        reasoningSummary: debateSetup.model1Config.reasoningSummary,
        textVerbosity: debateSetup.model1Config.textVerbosity,
        temperature: debateSetup.model1Config.temperature,
        maxTokens: debateSetup.model1Config.maxTokens,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create debate session';
      toast({
        title: "Failed to Create Session",
        description: message,
        variant: "destructive",
      });
    }
  };

  const handleResetDebate = () => {
    debateSetup.resetSetup();
    debateSession.resetSession();
    toast({
      title: "Debate Reset",
      description: "All debate data has been cleared.",
    });
  };

  const handleExportMarkdown = () => {
    exportMarkdown({
      turnHistory: debateSession.turnHistory,
      models,
      selectedTopic: debateSetup.selectedTopic,
      customTopic: debateSetup.customTopic,
      useCustomTopic: debateSetup.useCustomTopic,
      jurySummary: debateSession.jurySummary,
    });
  };

  const handleCopyToClipboard = async () => {
    await copyToClipboard({
      turnHistory: debateSession.turnHistory,
      models,
      selectedTopic: debateSetup.selectedTopic,
      customTopic: debateSetup.customTopic,
      useCustomTopic: debateSetup.useCustomTopic,
      jurySummary: debateSession.jurySummary,
    });
  };

  const handleSelectHistorySession = (session: DebateSessionSummary) => {
    debateSession.resetSession();
    debateSession.setSessionMetadata({
      topic: session.topic,
      model1Id: session.model1Id,
      model2Id: session.model2Id,
      adversarialLevel: session.adversarialLevel ?? debateSetup.adversarialLevel,
    });
    debateSession.setDebateSessionId(session.id);
    debateSession.updateJurySummary(session.jury ?? null);

    debateSetup.setModel1Id(session.model1Id);
    debateSetup.setModel2Id(session.model2Id);
    debateSetup.setUseCustomTopic(true);
    debateSetup.setCustomTopic(session.topic);
    debateSetup.setSelectedTopic('custom');
    if (session.adversarialLevel !== undefined) {
      debateSetup.setAdversarialLevel(session.adversarialLevel);
    }
    debateSetup.setShowSetup(false);
  };

  const totalCost = debateSession.calculateTotalCost();

  const currentPhase = debateSession.getCurrentPhase();
  const floorOpen = debateSession.isFloorOpen();
  const juryPending = debateSession.hasUnresolvedJuryTasks();
  const continueDisabledReason = !floorOpen
    ? 'The debate floor is closed. Reopen the floor to allow the next speaker.'
    : undefined;

  const handleAdvancePhase = () => {
    if (juryPending) {
      toast({
        title: "Jury Review Required",
        description: "Resolve outstanding jury notes before advancing the debate phase.",
        variant: "destructive",
      });
      return;
    }

    if (debateStreaming.isStreaming) {
      toast({
        title: "Streaming In Progress",
        description: "Wait for the current response to finish before changing phases.",
        variant: "destructive",
      });
      return;
    }

    debateSession.advancePhase();
  };

  const stageSpeakers = useMemo(() => {
    const model1 = debateService?.getModel(debateSetup.model1Id ?? '')?.name || 'Affirmative';
    const model2 = debateService?.getModel(debateSetup.model2Id ?? '')?.name || 'Negative';
    return [
      {
        modelId: debateSetup.model1Id ?? 'affirmative-placeholder',
        modelName: model1,
        role: 'Affirmative',
      },
      {
        modelId: debateSetup.model2Id ?? 'negative-placeholder',
        modelName: model2,
        role: 'Negative',
      },
    ];
  }, [debateService, debateSetup.model1Id, debateSetup.model2Id]);

  const activeSpeakers = useMemo(
    () =>
      stageSpeakers.filter(
        speaker => speaker.modelId === debateSetup.model1Id || speaker.modelId === debateSetup.model2Id
      ),
    [stageSpeakers, debateSetup.model1Id, debateSetup.model2Id]
  );

  const phaseMetadata: Record<DebatePhase, { label: string; description: string }> = {
    OPENING_STATEMENTS: {
      label: 'Opening Statements',
      description: 'Establishes each model\'s primary case and burden.',
    },
    REBUTTALS: {
      label: 'Rebuttals',
      description: 'Floor opens for alternating rebuttals and counterpoints.',
    },
    CLOSING_ARGUMENTS: {
      label: 'Closing Arguments',
      description: 'Final summaries before the jury renders its verdict.',
    },
  };

  const stagePhases = useMemo(
    () =>
      ROBERTS_RULES_PHASES.map(phase => ({
        id: phase,
        label: phaseMetadata[phase].label,
        description: phaseMetadata[phase].description,
        speakers: stageSpeakers,
      })),
    [stageSpeakers]
  );

  useEffect(() => {
    if (activeSpeakers.length > 0) {
      debateSession.initializeJury(
        activeSpeakers.map(speaker => ({ modelId: speaker.modelId, modelName: speaker.modelName }))
      );
    }
  }, [activeSpeakers, debateSession.initializeJury]);

  const nextSpeakerId = useMemo(() => {
    if (!debateService || activeSpeakers.length === 0) return null;
    return debateService.getNextDebater(debateSession.currentRound);
  }, [debateService, debateSession.currentRound, activeSpeakers.length]);

  const currentSpeaker = useMemo(() => {
    if (!nextSpeakerId) {
      return stageSpeakers[0] ?? null;
    }
    return activeSpeakers.find(speaker => speaker.modelId === nextSpeakerId) ?? null;
  }, [activeSpeakers, nextSpeakerId, stageSpeakers]);

  const rebuttalQueue = useMemo(() => {
    const queueSource = activeSpeakers.length > 0 ? activeSpeakers : stageSpeakers;
    if (!floorOpen) {
      return [];
    }
    if (!currentSpeaker) {
      return queueSource;
    }
    return queueSource.filter(speaker => speaker.modelId !== currentSpeaker.modelId);
  }, [activeSpeakers, currentSpeaker, floorOpen, stageSpeakers]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <AppNavigation
        title="AI Model Debate Mode"
        subtitle="Structured, user-controlled debates (Robert's Rules)"
        icon={MessageSquare}
      />

      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-3">
        {debateSetup.showSetup && (
          <DebateSetupPanel
            debateData={debateData}
            debateLoading={debateLoading}
            debateError={debateError}
            models={models}
            selectedTopic={debateSetup.selectedTopic}
            setSelectedTopic={debateSetup.setSelectedTopic}
            customTopic={debateSetup.customTopic}
            setCustomTopic={debateSetup.setCustomTopic}
            useCustomTopic={debateSetup.useCustomTopic}
            setUseCustomTopic={debateSetup.setUseCustomTopic}
            adversarialLevel={debateSetup.adversarialLevel}
            setAdversarialLevel={debateSetup.setAdversarialLevel}
            model1Id={debateSetup.model1Id}
            setModel1Id={debateSetup.setModel1Id}
            model2Id={debateSetup.model2Id}
            setModel2Id={debateSetup.setModel2Id}
            model1Config={debateSetup.model1Config}
            setModel1Config={debateSetup.setModel1Config}
            model2Config={debateSetup.model2Config}
            setModel2Config={debateSetup.setModel2Config}
            onStartDebate={handleStartDebate}
            isStreaming={debateStreaming.isStreaming}
          />
        )}

        {debateSetup.showSystemPrompts && (debateSetup.model1Id || debateSetup.model2Id) && (
          <Card className="mb-3">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center space-x-2 text-sm">
                <Settings className="w-4 h-4" />
                <span>System Prompts Preview</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                {(() => {
                  const prompts = generateDebatePrompts({
                    selectedTopic: debateSetup.selectedTopic,
                    customTopic: debateSetup.customTopic,
                    useCustomTopic: debateSetup.useCustomTopic,
                    adversarialLevel: debateSetup.adversarialLevel,
                  });
                  return (
                    <>
                      <div>
                        <h4 className="text-xs font-medium mb-1">Opening (Model 1):</h4>
                        <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded border overflow-x-auto whitespace-pre-wrap">
                          {prompts.affirmativePrompt}
                        </pre>
                      </div>
                      <div>
                        <h4 className="text-xs font-medium mb-1">Opening (Model 2):</h4>
                        <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded border overflow-x-auto whitespace-pre-wrap">
                          {prompts.negativePrompt}
                        </pre>
                      </div>
                      <div>
                        <h4 className="text-xs font-medium mb-1">Rebuttal Template:</h4>
                        <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded border overflow-x-auto whitespace-pre-wrap">
                          {prompts.rebuttalTemplate.replace('{RESPONSE}', '[Previous opponent message]')}
                        </pre>
                      </div>
                    </>
                  );
                })()}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-3">
          <div className="xl:col-span-1 space-y-3">
            <DebateHistoryDrawer
              sessions={debateSession.existingDebateSessions}
              onRefresh={() => loadDebateSessionsMutation.mutate()}
              isRefreshing={loadDebateSessionsMutation.isPending}
              onSelectSession={handleSelectHistorySession}
              activeSessionId={debateSession.debateSessionId}
            />

            {debateSession.messages.length > 0 && (
              <Card className="p-3">
                <DebateControls
                  currentRound={debateSession.currentRound}
                  totalCost={totalCost}
                  messagesCount={debateSession.messages.length}
                  showSetup={debateSetup.showSetup}
                  setShowSetup={debateSetup.setShowSetup}
                  onExportMarkdown={handleExportMarkdown}
                  onCopyToClipboard={handleCopyToClipboard}
                  onResetDebate={handleResetDebate}
                  isPending={debateStreaming.isStreaming}
                  nextModelName={debateService?.getModel(
                    debateService.getNextDebater(debateSession.currentRound)
                  )?.name}
                  currentPhase={currentPhase}
                  onAdvancePhase={handleAdvancePhase}
                  isFloorOpen={floorOpen}
                  onToggleFloor={debateSession.toggleFloor}
                  hasJuryPending={juryPending}
                />
              </Card>
            )}

            {debateStreaming.isStreaming && (
              <Card className="p-3">
                <StreamingControls
                  isStreaming={debateStreaming.isStreaming}
                  error={debateStreaming.error}
                  progress={debateStreaming.progress}
                  estimatedCost={debateStreaming.estimatedCost}
                />
              </Card>
            )}
          </div>

          <div className="xl:col-span-3 space-y-3">
            {debateStreaming.isStreaming && (
              <StreamingDisplay
                reasoning={debateStreaming.reasoning}
                content={debateStreaming.content}
                isStreaming={debateStreaming.isStreaming}
                error={debateStreaming.error}
                modelName={debateService?.getModel(
                  debateService.getNextDebater(debateSession.currentRound)
                )?.name}
                modelProvider={debateService?.getModel(
                  debateService.getNextDebater(debateSession.currentRound)
                )?.provider}
                progress={debateStreaming.progress}
                estimatedCost={debateStreaming.estimatedCost}
              />
            )}

            {debateSession.messages.length > 0 && (
              <DebateMessageList
                messages={debateSession.messages}
                models={models}
                model1Id={debateSetup.model1Id}
                model2Id={debateSetup.model2Id}
                currentRound={debateSession.currentRound}
                isStreaming={debateStreaming.isStreaming}
                onContinueDebate={continueDebate}
              />
            )}

            {debateSession.messages.length === 0 && !debateSetup.showSetup && (
              <Card className="p-8">
                <CardContent className="text-center py-8">
                  <MessageSquare className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                  <h3 className="text-base font-medium text-gray-900 dark:text-white mb-2">Ready for Debate</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    Configure your debate setup and start a 10-round AI model debate.
                  </p>
                  <Button onClick={() => debateSetup.setShowSetup(true)} variant="outline" size="sm">
                    Show Setup Panel
                  </Button>
                </CardContent>
              </Card>
            )}

            <div ref={chatEndRef} />
          </div>
        </div>
      </div>
    </div>
  );
}
