// * Author: gpt-5-codex
// * Date: 2025-10-17 19:26 UTC
// * PURPOSE: Reconfigure debate stage layout, session phases, and jury workflow for structured Robert's Rules debates.
// * SRP/DRY check: Pass - Page orchestrates debate mode composition without duplicating child responsibilities.
/**
 * Debate Mode - Structured, Robert's Rules AI Model Debate Interface
 *
 * This component provides a streamlined interface for setting up and running
 * structured, user-controlled debates between AI models following Robert's Rules.
 * Features include:
 * - Topic presets or custom topic with explicit Pro/Con roles
 * - Adversarial intensity control (respectful → combative)
 * - Manual step control with visual progress tracking
 * - Real-time cost calculation and reasoning log display
 * - Clean debate-focused UI distinct from Battle and Compare modes
 * - Modular prompt loading from docs/debate-prompts.md (no hardcoded topics/instructions)
 */

import { useRef, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageSquare, Settings } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { useAdvancedStreaming, type StreamingOptions } from "@/hooks/useAdvancedStreaming";
import { MessageCard, type MessageCardData } from "@/components/MessageCard";
import { StreamingDisplay } from "@/components/StreamingDisplay";
import { StreamingControls } from "@/components/StreamingControls";
import { AppNavigation } from "@/components/AppNavigation";
import { apiRequest } from "@/lib/queryClient";
import { useTheme } from "@/components/ThemeProvider";
import type { AIModel, ModelResponse } from '@/types/ai-models';

// Import new hooks and components
import { useDebateSetup } from "@/hooks/useDebateSetup";
import { useDebateSession, ROBERTS_RULES_PHASES, type DebatePhase } from "@/hooks/useDebateSession";
import { useDebateStreaming } from "@/hooks/useDebateStreaming";
import { useDebatePrompts } from "@/hooks/useDebatePrompts";
import { useDebateExport } from "@/hooks/useDebateExport";
import { DebateService } from "@/services/debateService";
import { DebateSetupPanel } from "@/components/debate/DebateSetupPanel";
import { DebateControls } from "@/components/debate/DebateControls";
import { DebateMessageList } from "@/components/debate/DebateMessageList";
import { DebateStageLayout } from "@/components/debate/DebateStageLayout";
import { DebateStageTimeline } from "@/components/debate/DebateStageTimeline";
import { JuryScoreCard } from "@/components/debate/JuryScoreCard";

export default function Debate() {
  const { toast } = useToast();
  const { theme, toggleTheme } = useTheme();
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Use the new granular state management hooks
  const debateSetup = useDebateSetup();
  const debateSession = useDebateSession();
  const debateStreaming = useDebateStreaming();

  // Use the existing hooks for prompts and export
  const { debateData, loading: debateLoading, error: debateError, generateDebatePrompts } = useDebatePrompts();
  const { exportMarkdown, copyToClipboard } = useDebateExport();

  // Fetch available models
  const { data: models = [] } = useQuery({
    queryKey: ['/api/models'],
    queryFn: async () => {
      const response = await fetch('/api/models');
      if (!response.ok) throw new Error('Failed to fetch models');
      return response.json() as Promise<AIModel[]>;
    },
  });

  // Initialize debate service using useMemo
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

  const resolvedTopicText = useMemo(() => {
    if (debateService) {
      const topic = debateService.getTopicText();
      if (topic) {
        return topic;
      }
    }
    return debateSetup.useCustomTopic
      ? debateSetup.customTopic
      : debateSetup.selectedTopic;
  }, [
    debateService,
    debateSetup.customTopic,
    debateSetup.selectedTopic,
    debateSetup.useCustomTopic,
  ]);

  // Advanced streaming hook
  const {
    reasoning: streamReasoning,
    content: streamContent,
    isStreaming,
    error: streamError,
    responseId: streamResponseId,
    tokenUsage: streamTokenUsage,
    cost: streamCost,
    progress: streamProgress,
    estimatedCost: streamEstimatedCost,
    startStream,
    cancelStream,
    pauseStream,
    resumeStream
  } = useAdvancedStreaming();

  // Create debate session mutation with streaming logic in onSuccess
  const createDebateSessionMutation = useMutation({
    mutationFn: async (data: { topic: string; model1Id: string; model2Id: string; adversarialLevel: number }) => {
      const response = await apiRequest('POST', '/api/debate/session', data);
      return response.json();
    },
    onSuccess: async (data) => {
      debateSession.setDebateSessionId(data.id);
      toast({
        title: "Debate Session Created",
        description: "Starting debate with session tracking",
      });

      // Start streaming for Model A's opening with configuration
      if (!debateService) return;

      const prompts = debateService.generatePrompts();

      await debateStreaming.startStream({
        modelId: debateSetup.model1Id,
        topic: prompts.topicText,
        role: 'AFFIRMATIVE',
        intensity: debateSetup.adversarialLevel,
        opponentMessage: null, // No opponent yet
        previousResponseId: null, // First turn
        turnNumber: 1,
        sessionId: data.id,
        model1Id: debateSetup.model1Id,
        model2Id: debateSetup.model2Id,
        // Pass model configuration
        reasoningEffort: debateSetup.model1Config.reasoningEffort,
        reasoningSummary: debateSetup.model1Config.reasoningSummary,
        textVerbosity: debateSetup.model1Config.textVerbosity,
        temperature: debateSetup.model1Config.temperature,
        maxTokens: debateSetup.model1Config.maxTokens
      });

      // Message recording is now handled in useEffect when streaming completes
    },
    onError: (error) => {
      toast({
        title: "Failed to Create Session",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Load existing debate sessions mutation
  const loadDebateSessionsMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/debate/sessions');
      if (!response.ok) throw new Error('Failed to load debate sessions');
      return response.json();
    },
    onSuccess: (data) => {
      debateSession.setExistingDebateSessions(data);
    },
    onError: (error) => {
      toast({
        title: "Failed to Load Sessions",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Continue debate mutation with structured rebuttals
  const continueDebateMutation = useMutation({
    mutationFn: async (data: { battleHistory: any[]; nextModelId: string }) => {
      if (!debateService) throw new Error('Debate service not initialized');

      const prompts = debateService.generatePrompts();
      const isNegativeDebater = data.nextModelId === debateSetup.model2Id;
      const role = isNegativeDebater ? 'NEGATIVE' : 'AFFIRMATIVE';
      const position = isNegativeDebater ? 'AGAINST' : 'FOR';
      const currentTopic = prompts.topicText;

      // Get the most recent opponent message
      const lastMessage = data.battleHistory[data.battleHistory.length - 1];

      const rebuttalPrompt = debateService.buildRebuttalPrompt(
        lastMessage.content,
        role,
        position
      );

      const response = await apiRequest('POST', '/api/models/respond', {
        modelId: data.nextModelId,
        prompt: rebuttalPrompt
      });

      return { response: await response.json() as ModelResponse, modelId: data.nextModelId };
    },
    onSuccess: (data) => {
      if (!debateService) return;

      const model = debateService.getModel(data.modelId);
      const nextRound = debateSession.currentRound + 1;

      debateSession.addMessage({
        id: `msg-${nextRound}`,
        modelId: data.modelId,
        modelName: model?.name || "Model",
        content: data.response.content,
        timestamp: Date.now(),
        round: Math.ceil(nextRound / 2),
        responseTime: data.response.responseTime,
        reasoning: data.response.reasoning,
        systemPrompt: data.response.systemPrompt,
        tokenUsage: data.response.tokenUsage,
        cost: data.response.cost,
        modelConfig: data.response.modelConfig,
      });

      debateSession.setCurrentRound(nextRound);

      const nextModel = debateService.getNextDebater(nextRound);
      toast({
        title: "Response Added!",
        description: `${model?.name} has responded. Click Continue for ${debateService.getModel(nextModel)?.name}'s turn.`,
      });
    },
    onError: (error) => {
      debateSession.setIsRunning(false);
      toast({
        title: "Debate Continuation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Auto-scroll to bottom of chat
  // Add defensive guard to prevent browser extension MutationObserver errors
  useEffect(() => {
    if (!chatEndRef.current) return;
    try {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    } catch (error) {
      // Silently ignore scroll errors (browser extensions can interfere)
      console.debug('Chat scroll error:', error);
    }
  }, [debateSession.messages]);

  // Handle streaming completion for opening statement
  useEffect(() => {
    if (debateStreaming.responseId && debateStreaming.content && debateSession.messages.length === 0) {
      const model1 = debateService?.getModel(debateSetup.model1Id);
      debateSession.setMessages([{
        id: `msg-1`,
        modelId: debateSetup.model1Id,
        modelName: model1?.name || "Model 1",
        content: debateStreaming.content,
        reasoning: debateStreaming.reasoning,
        timestamp: Date.now(),
        round: 1,
        responseTime: 0,
        tokenUsage: debateStreaming.tokenUsage,
        cost: debateStreaming.cost,
        modelConfig: {
          capabilities: debateSetup.model1Config.enableReasoning ? { reasoning: true, multimodal: false, functionCalling: false, streaming: true } : { reasoning: false, multimodal: false, functionCalling: false, streaming: false },
          pricing: { inputPerMillion: 0, outputPerMillion: 0 }
        }
      }]);
      debateSession.setModelALastResponseId(debateStreaming.responseId);
      debateSession.setCurrentRound(1);
      debateSetup.setShowSetup(false);
    }
  }, [debateStreaming.responseId, debateStreaming.content, debateSession.messages.length, debateService, debateSetup.model1Id, debateSetup.model1Config.enableReasoning, debateSetup.model1Config.maxTokens]);

  // Handle streaming completion for subsequent turns
  useEffect(() => {
    if (debateStreaming.responseId && debateStreaming.content && debateSession.messages.length > 0 && debateStreaming.responseId !== debateSession.modelALastResponseId) {
      const lastMessage = debateSession.messages[debateSession.messages.length - 1];
      const isModelBTurn = debateSession.currentRound % 2 === 1;
      const nextModelId = isModelBTurn ? debateSetup.model2Id : debateSetup.model1Id;
      const nextModelConfig = isModelBTurn ? debateSetup.model2Config : debateSetup.model1Config;

      const model = debateService?.getModel(nextModelId);
      const nextRound = debateSession.currentRound + 1;

      debateSession.addMessage({
        id: `msg-${nextRound}`,
        modelId: nextModelId,
        modelName: model?.name || "Model",
        content: debateStreaming.content,
        reasoning: debateStreaming.reasoning,
        timestamp: Date.now(),
        round: Math.ceil(nextRound / 2),
        responseTime: 0,
        tokenUsage: debateStreaming.tokenUsage,
        cost: debateStreaming.cost,
        modelConfig: {
          capabilities: nextModelConfig.enableReasoning ? { reasoning: true, multimodal: false, functionCalling: false, streaming: true } : { reasoning: false, multimodal: false, functionCalling: false, streaming: false },
          pricing: { inputPerMillion: 0, outputPerMillion: 0 }
        }
      });

      // Update the correct model's response ID
      if (isModelBTurn) {
        debateSession.setModelBLastResponseId(debateStreaming.responseId);
      } else {
        debateSession.setModelALastResponseId(debateStreaming.responseId);
      }

      debateSession.setCurrentRound(nextRound);
    }
  }, [debateStreaming.responseId, debateStreaming.content, debateSession.messages.length, debateSession.currentRound, debateService, debateSetup.model1Id, debateSetup.model2Id, debateSetup.model1Config.enableReasoning, debateSetup.model2Config.enableReasoning]);

  // Load existing debate sessions on component mount
  useEffect(() => {
    loadDebateSessionsMutation.mutate();
  }, []);

  const continueDebate = async () => {
    if (debateSession.hasUnresolvedJuryTasks()) {
      toast({
        title: "Jury Review Required",
        description: "Complete jury scoring and notes before continuing to the next turn.",
        variant: "destructive",
      });
      return;
    }

    if (!debateSession.isFloorOpen()) {
      toast({
        title: "Floor Closed",
        description: "Reopen the debate floor before continuing to the next turn.",
        variant: "destructive",
      });
      return;
    }

    if (!debateSetup.model1Id || !debateSetup.model2Id || !debateService) return;

    const lastMessage = debateSession.messages[debateSession.messages.length - 1];

    // Determine which model goes next
    const isModelBTurn = debateSession.currentRound % 2 === 1;
    const nextModelId = isModelBTurn ? debateSetup.model2Id : debateSetup.model1Id;
    const nextRole = isModelBTurn ? 'NEGATIVE' : 'AFFIRMATIVE';

    // Get the model configuration for the next model
    const nextModelConfig = isModelBTurn ? debateSetup.model2Config : debateSetup.model1Config;

    // Determine previous response ID (model's OWN last turn, not opponent's)
    const previousResponseId = isModelBTurn
      ? debateSession.modelBLastResponseId
      : debateSession.modelALastResponseId;

    // Start streaming - message recording is handled in useEffect when streaming completes
    await debateStreaming.startStream({
      modelId: nextModelId,
      topic: debateService.getTopicText(),
      role: nextRole,
      intensity: debateSetup.adversarialLevel,
      opponentMessage: lastMessage.content,
      previousResponseId: previousResponseId,
      turnNumber: debateSession.currentRound + 1,
      sessionId: debateSession.debateSessionId ?? undefined,
      model1Id: debateSetup.model1Id,
      model2Id: debateSetup.model2Id,
      // Pass model configuration
      reasoningEffort: nextModelConfig.reasoningEffort,
      reasoningSummary: nextModelConfig.reasoningSummary,
      textVerbosity: nextModelConfig.textVerbosity,
      temperature: nextModelConfig.temperature,
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

    // Create debate session - streaming will start automatically in onSuccess
    await createDebateSessionMutation.mutateAsync({
      topic: prompts.topicText,
      model1Id: debateSetup.model1Id,
      model2Id: debateSetup.model2Id,
      adversarialLevel: debateSetup.adversarialLevel
    });
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
      messages: debateSession.messages,
      models,
      selectedTopic: debateSetup.selectedTopic,
      customTopic: debateSetup.customTopic,
      useCustomTopic: debateSetup.useCustomTopic,
      topicText: resolvedTopicText,
      juryAnnotations: debateSession.juryAnnotations,
      phases: Array.from(ROBERTS_RULES_PHASES),
      currentPhase,
    });
  };

  const handleCopyToClipboard = async () => {
    await copyToClipboard({
      messages: debateSession.messages,
      models,
      selectedTopic: debateSetup.selectedTopic,
      customTopic: debateSetup.customTopic,
      useCustomTopic: debateSetup.useCustomTopic,
      topicText: resolvedTopicText,
      juryAnnotations: debateSession.juryAnnotations,
      phases: Array.from(ROBERTS_RULES_PHASES),
      currentPhase,
    });
  };

  const totalCost = debateSession.calculateTotalCost();

  const currentPhase = debateSession.getCurrentPhase();
  const floorOpen = debateSession.isFloorOpen();
  const juryPending = debateSession.hasUnresolvedJuryTasks();
  const continueDisabledReason = juryPending
    ? 'Complete jury scoring before continuing to the next turn.'
    : !floorOpen
      ? 'The debate floor is closed. Reopen the floor to allow the next speaker.'
      : undefined;

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

  const currentSpeakerModel = useMemo(() => {
    if (!nextSpeakerId || !debateService) {
      return undefined;
    }
    return debateService.getModel(nextSpeakerId);
  }, [debateService, nextSpeakerId]);

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
        {/* Setup Panel - More Compact */}
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

        {/* System Prompts Preview - Only show when needed and make more compact */}
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

        <DebateStageLayout
          stageTimeline={
            <DebateStageTimeline
              phases={stagePhases}
              currentPhase={currentPhase}
              phaseTimestamps={debateSession.phaseTimestamps}
              floorOpen={floorOpen}
              currentSpeaker={currentSpeaker}
              rebuttalQueue={rebuttalQueue}
            />
          }
          liveFloor={
            <>
              {debateSession.messages.length > 0 && (
                <Card className="p-4">
                  <DebateControls
                    currentRound={debateSession.currentRound}
                    totalCost={totalCost}
                    messagesCount={debateSession.messages.length}
                    showSetup={debateSetup.showSetup}
                    setShowSetup={debateSetup.setShowSetup}
                    onExportMarkdown={handleExportMarkdown}
                  onCopyToClipboard={handleCopyToClipboard}
                  onResetDebate={handleResetDebate}
                  isPending={continueDebateMutation.isPending}
                  nextModelName={currentSpeaker?.modelName}
                  currentPhase={currentPhase}
                  onAdvancePhase={debateSession.advancePhase}
                  isFloorOpen={floorOpen}
                  onToggleFloor={debateSession.toggleFloor}
                  hasJuryPending={juryPending}
                  />
                </Card>
              )}

              {debateStreaming.isStreaming && (
                <Card className="p-4">
                  <StreamingControls
                    isStreaming={debateStreaming.isStreaming}
                    progress={debateStreaming.progress}
                    error={debateStreaming.error}
                    estimatedCost={debateStreaming.estimatedCost}
                    onCancel={debateStreaming.cancelStream}
                    onPause={debateStreaming.pauseStream}
                    onResume={debateStreaming.resumeStream}
                  />
                </Card>
              )}

              {debateStreaming.isStreaming && (
                <StreamingDisplay
                  reasoning={debateStreaming.reasoning}
                  content={debateStreaming.content}
                  isStreaming={debateStreaming.isStreaming}
                  error={debateStreaming.error}
                  modelName={currentSpeaker?.modelName}
                  modelProvider={currentSpeakerModel?.provider}
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
                  disableContinue={juryPending || !floorOpen}
                  disableReason={continueDisabledReason}
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
            </>
          }
          juryBench={
            <JuryScoreCard
              annotations={debateSession.juryAnnotations}
              onIncrement={debateSession.incrementJuryPoints}
              onDecrement={debateSession.decrementJuryPoints}
              onToggleTag={debateSession.toggleJuryTag}
              onUpdateNotes={debateSession.setJuryNotes}
              onMarkReviewed={debateSession.markJuryReviewed}
            />
          }
        />
      </div>
    </div>
  );
}
