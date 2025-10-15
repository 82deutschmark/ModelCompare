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
 *
 * Author: Cascade
 * Date: October 15, 2025
 * PURPOSE: Refactored debate component using custom hooks and modular components for better maintainability
 * SRP/DRY check: Pass - Single responsibility for debate orchestration, no duplication with other mode components
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
import { useDebateState } from "@/hooks/useDebateState";
import { useDebatePrompts } from "@/hooks/useDebatePrompts";
import { useDebateExport } from "@/hooks/useDebateExport";
import { DebateService } from "@/services/debateService";
import { DebateSetupPanel } from "@/components/debate/DebateSetupPanel";
import { DebateControls } from "@/components/debate/DebateControls";
import { DebateMessageList } from "@/components/debate/DebateMessageList";

export default function Debate() {
  const { toast } = useToast();
  const { theme, toggleTheme } = useTheme();
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Use the new state management hook
  const debateState = useDebateState();

  // Use the new prompts hook
  const { debateData, loading: debateLoading, error: debateError, generateDebatePrompts } = useDebatePrompts();

  // Use the new export hook
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
      selectedTopic: debateState.selectedTopic,
      customTopic: debateState.customTopic,
      useCustomTopic: debateState.useCustomTopic,
      adversarialLevel: debateState.adversarialLevel,
      model1Id: debateState.model1Id,
      model2Id: debateState.model2Id,
    });
  }, [
    debateData,
    models,
    debateState.selectedTopic,
    debateState.customTopic,
    debateState.useCustomTopic,
    debateState.adversarialLevel,
    debateState.model1Id,
    debateState.model2Id,
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

  // Create debate session mutation
  const createDebateSessionMutation = useMutation({
    mutationFn: async (data: { topic: string; model1Id: string; model2Id: string; adversarialLevel: number }) => {
      const response = await apiRequest('POST', '/api/debate/session', data);
      return response.json();
    },
    onSuccess: (data) => {
      debateState.setDebateSessionId(data.id);
      toast({
        title: "Debate Session Created",
        description: "Starting debate with session tracking",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to Create Session",
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
      const isNegativeDebater = data.nextModelId === debateState.model2Id;
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
      const nextRound = debateState.currentRound + 1;

      debateState.setMessages([...debateState.messages, {
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
      }]);

      debateState.setCurrentRound(nextRound);

      const nextModel = debateService.getNextDebater(nextRound);
      toast({
        title: "Response Added!",
        description: `${model?.name} has responded. Click Continue for ${debateService.getModel(nextModel)?.name}'s turn.`,
      });
    },
    onError: (error) => {
      debateState.setIsRunning(false);
      toast({
        title: "Debate Continuation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Auto-scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [debateState.messages]);

  const continueDebate = async () => {
    if (!debateState.model1Id || !debateState.model2Id || !debateService) return;

    const lastMessage = debateState.messages[debateState.messages.length - 1];

    // Determine which model goes next
    const isModelBTurn = debateState.currentRound % 2 === 1;
    const nextModelId = isModelBTurn ? debateState.model2Id : debateState.model1Id;
    const nextRole = isModelBTurn ? 'NEGATIVE' : 'AFFIRMATIVE';

    // Get the model configuration for the next model
    const nextModelConfig = isModelBTurn ? debateState.model2Config : debateState.model1Config;

    // Determine previous response ID (model's OWN last turn, not opponent's)
    const previousResponseId = isModelBTurn
      ? debateState.modelBLastResponseId
      : debateState.modelALastResponseId;

    // Start streaming with configuration and session ID
    await startStream({
      modelId: nextModelId,
      topic: debateService.getTopicText(),
      role: nextRole,
      intensity: debateState.adversarialLevel,
      opponentMessage: lastMessage.content,
      previousResponseId: previousResponseId,
      turnNumber: debateState.currentRound + 1,
      sessionId: debateState.debateSessionId ?? undefined,
      model1Id: debateState.model1Id,
      model2Id: debateState.model2Id,
      // Pass model configuration
      reasoningEffort: nextModelConfig.reasoningEffort,
      reasoningSummary: nextModelConfig.reasoningSummary,
      textVerbosity: nextModelConfig.textVerbosity,
      temperature: nextModelConfig.temperature,
    });

    // When complete, add to messages and update response ID
    if (streamResponseId) {
      const model = debateService.getModel(nextModelId);
      const nextRound = debateState.currentRound + 1;

      debateState.setMessages([...debateState.messages, {
        id: `msg-${nextRound}`,
        modelId: nextModelId,
        modelName: model?.name || "Model",
        content: streamContent,
        reasoning: streamReasoning,
        timestamp: Date.now(),
        round: Math.ceil(nextRound / 2),
        responseTime: 0,
        tokenUsage: streamTokenUsage,
        cost: streamCost,
        modelConfig: {
          capabilities: nextModelConfig.enableReasoning ? { reasoning: true, multimodal: false, functionCalling: false, streaming: true } : { reasoning: false, multimodal: false, functionCalling: false, streaming: false },
          pricing: { inputPerMillion: 0, outputPerMillion: 0 } // Will be filled from API response
        }
      }]);

      // Update the correct model's response ID
      if (isModelBTurn) {
        debateState.setModelBLastResponseId(streamResponseId);
      } else {
        debateState.setModelALastResponseId(streamResponseId);
      }

      debateState.setCurrentRound(nextRound);
    }
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

    // First, create a debate session
    await createDebateSessionMutation.mutateAsync({
      topic: prompts.topicText,
      model1Id: debateState.model1Id,
      model2Id: debateState.model2Id,
      adversarialLevel: debateState.adversarialLevel
    });

    // Then start streaming for Model A's opening with configuration
    if (debateState.debateSessionId) {
      await startStream({
        modelId: debateState.model1Id,
        topic: prompts.topicText,
        role: 'AFFIRMATIVE',
        intensity: debateState.adversarialLevel,
        opponentMessage: null, // No opponent yet
        previousResponseId: null, // First turn
        turnNumber: 1,
        sessionId: debateState.debateSessionId ?? undefined,
        model1Id: debateState.model1Id,
        model2Id: debateState.model2Id,
        // Pass model configuration
        reasoningEffort: debateState.model1Config.reasoningEffort,
        reasoningSummary: debateState.model1Config.reasoningSummary,
        textVerbosity: debateState.model1Config.textVerbosity,
        temperature: debateState.model1Config.temperature,
        maxTokens: debateState.model1Config.maxTokens
      });

      // When complete, add to messages and store response ID
      if (streamResponseId) {
        const model1 = debateService.getModel(debateState.model1Id);
        debateState.setMessages([{
          id: `msg-1`,
          modelId: debateState.model1Id,
          modelName: model1?.name || "Model 1",
          content: streamContent,
          reasoning: streamReasoning,
          timestamp: Date.now(),
          round: 1,
          responseTime: 0, // Not tracked in streaming
          tokenUsage: streamTokenUsage,
          cost: streamCost,
          modelConfig: {
            capabilities: debateState.model1Config.enableReasoning ? { reasoning: true, multimodal: false, functionCalling: false, streaming: true } : { reasoning: false, multimodal: false, functionCalling: false, streaming: false },
            pricing: { inputPerMillion: 0, outputPerMillion: 0 } // Will be filled from API response
          }
        }]);
        debateState.setModelALastResponseId(streamResponseId);
        debateState.setCurrentRound(1);
        debateState.setShowSetup(false);
      }
    }
  };

  const handleResetDebate = () => {
    debateState.reset();
    toast({
      title: "Debate Reset",
      description: "All debate data has been cleared.",
    });
  };

  const handleExportMarkdown = () => {
    exportMarkdown({
      messages: debateState.messages,
      models,
      selectedTopic: debateState.selectedTopic,
      customTopic: debateState.customTopic,
      useCustomTopic: debateState.useCustomTopic,
    });
  };

  const handleCopyToClipboard = async () => {
    await copyToClipboard({
      messages: debateState.messages,
      models,
      selectedTopic: debateState.selectedTopic,
      customTopic: debateState.customTopic,
      useCustomTopic: debateState.useCustomTopic,
    });
  };

  const totalCost = debateService?.calculateTotalCost(debateState.messages) || 0;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <AppNavigation
        title="AI Model Debate Mode"
        subtitle="Structured, user-controlled debates (Robert's Rules)"
        icon={MessageSquare}
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Setup Panel */}
        {debateState.showSetup && (
          <DebateSetupPanel
            debateData={debateData}
            debateLoading={debateLoading}
            debateError={debateError}
            models={models}
            selectedTopic={debateState.selectedTopic}
            setSelectedTopic={debateState.setSelectedTopic}
            customTopic={debateState.customTopic}
            setCustomTopic={debateState.setCustomTopic}
            useCustomTopic={debateState.useCustomTopic}
            setUseCustomTopic={debateState.setUseCustomTopic}
            adversarialLevel={debateState.adversarialLevel}
            setAdversarialLevel={debateState.setAdversarialLevel}
            model1Id={debateState.model1Id}
            setModel1Id={debateState.setModel1Id}
            model2Id={debateState.model2Id}
            setModel2Id={debateState.setModel2Id}
            model1Config={debateState.model1Config}
            setModel1Config={debateState.setModel1Config}
            model2Config={debateState.model2Config}
            setModel2Config={debateState.setModel2Config}
            onStartDebate={handleStartDebate}
            isStreaming={isStreaming}
          />
        )}

        {/* System Prompts Preview - TODO: Extract this into a separate component */}
        {debateState.showSystemPrompts && (debateState.model1Id || debateState.model2Id) && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="w-5 h-5" />
                <span>System Prompts Preview</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {(() => {
                  const prompts = generateDebatePrompts({
                    selectedTopic: debateState.selectedTopic,
                    customTopic: debateState.customTopic,
                    useCustomTopic: debateState.useCustomTopic,
                    adversarialLevel: debateState.adversarialLevel,
                  });
                  return (
                    <>
                      <div>
                        <h4 className="font-medium mb-2">Opening Statement (Model 1 - Affirmative):</h4>
                        <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-3 rounded border overflow-x-auto whitespace-pre-wrap">
                          {prompts.affirmativePrompt}
                        </pre>
                      </div>
                      <div>
                        <h4 className="font-medium mb-2">Opening Statement (Model 2 - Negative):</h4>
                        <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-3 rounded border overflow-x-auto whitespace-pre-wrap">
                          {prompts.negativePrompt}
                        </pre>
                      </div>
                      <div>
                        <h4 className="font-medium mb-2">Rebuttal Template:</h4>
                        <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-3 rounded border overflow-x-auto whitespace-pre-wrap">
                          {prompts.rebuttalTemplate.replace('{RESPONSE}', '[Previous opponent message will appear here]')}
                        </pre>
                      </div>
                    </>
                  );
                })()}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Debate Progress and Controls */}
        {debateState.messages.length > 0 && (
          <Card className="mb-6">
            <CardContent className="pt-6">
              <DebateControls
                currentRound={debateState.currentRound}
                totalCost={totalCost}
                messagesCount={debateState.messages.length}
                showSetup={debateState.showSetup}
                setShowSetup={debateState.setShowSetup}
                onExportMarkdown={handleExportMarkdown}
                onCopyToClipboard={handleCopyToClipboard}
                onResetDebate={handleResetDebate}
                isPending={continueDebateMutation.isPending}
                nextModelName={debateService?.getModel(debateService.getNextDebater(debateState.currentRound))?.name}
              />
            </CardContent>
          </Card>
        )}

        {/* Show streaming content in real-time */}
        {isStreaming && (
          <div className="space-y-4 mb-4">
            <StreamingDisplay
              reasoning={streamReasoning}
              content={streamContent}
              isStreaming={isStreaming}
              error={streamError}
              modelName={debateService?.getModel(debateService.getNextDebater(debateState.currentRound))?.name}
              modelProvider={debateService?.getModel(debateService.getNextDebater(debateState.currentRound))?.provider}
              progress={streamProgress}
              estimatedCost={streamEstimatedCost}
            />

            <StreamingControls
              isStreaming={isStreaming}
              progress={streamProgress}
              error={streamError}
              estimatedCost={streamEstimatedCost}
              onCancel={cancelStream}
              onPause={pauseStream}
              onResume={resumeStream}
            />
          </div>
        )}

        {/* Messages */}
        {debateState.messages.length > 0 && (
          <DebateMessageList
            messages={debateState.messages}
            models={models}
            model1Id={debateState.model1Id}
            model2Id={debateState.model2Id}
            currentRound={debateState.currentRound}
            isStreaming={isStreaming}
            onContinueDebate={continueDebate}
          />
        )}

        {/* Empty State */}
        {debateState.messages.length === 0 && !debateState.showSetup && (
          <Card>
            <CardContent className="text-center py-12">
              <MessageSquare className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Ready for Debate</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Configure your debate setup above and start a 10-round AI model debate.
              </p>
              <Button onClick={() => debateState.setShowSetup(true)} variant="outline">
                Show Setup Panel
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
