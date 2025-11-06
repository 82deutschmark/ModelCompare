/*
 * Author: gpt-5-codex
 * Date: 2025-11-06T03:49:34Z
 * PURPOSE: Manage ARC agent run lifecycle including persistence, OpenAI SDK execution,
 *          and message/artifact fan-out for the agent workspace.
 * SRP/DRY check: Pass - executor coordinates storage with SDK responses without touching routing/UI concerns.
 */

import type { ArcRun, ArcMessage, ArcArtifact } from '@shared/schema';
import { ARC_STAGES, type ArcStageId, type ArcStageStatus, type ArcRunStatus } from '@shared/arc-types';
import { storage } from '../storage';
import type { AgentRunResponse, AgentMessage, AgentArtifact } from '../services/agent-runner';
import { runArcAgentWithSdk, type ArcSdkRunOptions } from './openai-sdk-runner';

export interface CreateArcRunParams {
  taskId: string;
  challengeName: string;
  puzzleDescription: string;
  puzzlePayload: Record<string, unknown>;
  targetPatternSummary?: string;
  evaluationFocus?: string;
}

export interface ArcExecutorOptions {
  model: string;
  maxTurns?: number;
}

export interface ArcRunContext {
  run: ArcRun;
  messages: ArcMessage[];
  artifacts: ArcArtifact[];
}

export class ArcExecutor {
  private readonly sdkOptions: ArcSdkRunOptions;

  constructor(options: ArcExecutorOptions) {
    this.sdkOptions = {
      model: options.model,
      maxTurns: options.maxTurns ?? 4,
    };
  }

  async createRun(params: CreateArcRunParams): Promise<ArcRunContext> {
    const stageMap = this.initializeStageMap();
    const run = await storage.createArcRun({
      taskId: params.taskId,
      challengeName: params.challengeName,
      puzzleDescription: params.puzzleDescription,
      puzzlePayload: params.puzzlePayload,
      targetPatternSummary: params.targetPatternSummary ?? null,
      evaluationFocus: params.evaluationFocus ?? null,
      status: 'pending',
      currentStageId: null,
      stages: stageMap,
      totalCostCents: null,
    });
    return this.fetchContext(run.id);
  }

  async startRun(runId: string): Promise<ArcRunContext> {
    const run = await storage.getArcRun(runId);
    if (!run) {
      throw new Error(`ARC run ${runId} not found`);
    }

    if (run.status === 'pending') {
      await storage.updateArcRun(runId, {
        status: 'running',
        updatedAt: new Date(),
      });
      void this.launch(runId).catch((error) => this.handleLaunchError(runId, error));
    }

    return this.fetchContext(runId);
  }

  async fetchContext(runId: string): Promise<ArcRunContext> {
    const [run, messages, artifacts] = await Promise.all([
      storage.getArcRun(runId),
      storage.getArcMessages(runId, 200),
      storage.getArcArtifacts(runId),
    ]);

    if (!run) {
      throw new Error(`ARC run ${runId} not found`);
    }

    return { run, messages, artifacts };
  }

  async submitUserReply(runId: string, content: string): Promise<ArcMessage> {
    const userMessage = await storage.appendArcMessage({
      runId,
      role: 'user',
      content,
    });

    const run = await storage.getArcRun(runId);
    if (!run) {
      throw new Error(`ARC run ${runId} not found for reply`);
    }

    await storage.updateArcRun(runId, {
      status: 'running',
      updatedAt: new Date(),
    });

    void this.launch(runId, content).catch((error) => this.handleLaunchError(runId, error));

    return userMessage;
  }

  async cancelRun(runId: string): Promise<ArcRunContext> {
    const run = await storage.updateArcRun(runId, {
      status: 'cancelled',
      updatedAt: new Date(),
      completedAt: new Date(),
    });

    if (!run) {
      throw new Error(`ARC run ${runId} not found for cancel`);
    }

    await storage.appendArcMessage({
      runId,
      role: 'system',
      content: 'Run cancelled by user.',
    });

    return this.fetchContext(runId);
  }

  private initializeStageMap(): Record<ArcStageId, { status: ArcStageStatus; id: ArcStageId }> {
    return ARC_STAGES.reduce<Record<ArcStageId, { status: ArcStageStatus; id: ArcStageId }>>((acc, stage) => {
      acc[stage.id as ArcStageId] = { id: stage.id as ArcStageId, status: 'idle' };
      return acc;
    }, {} as Record<ArcStageId, { status: ArcStageStatus; id: ArcStageId }>);
  }

  private async launch(runId: string, userReply?: string): Promise<void> {
    const run = await storage.getArcRun(runId);
    if (!run) {
      throw new Error('Run not found during ARC launch');
    }

    const response = await runArcAgentWithSdk({
      run,
      options: this.sdkOptions,
      userReply,
    });

    await this.handleAgentResponse(runId, response);
  }

  private async handleAgentResponse(runId: string, response: AgentRunResponse): Promise<void> {
    const run = await storage.getArcRun(runId);
    if (!run) {
      throw new Error('Run not found while handling ARC response');
    }

    const status = this.deriveStatus(response);
    const stageSnapshots = (response.stageSnapshots as Record<string, any> | undefined) ?? run.stages;

    await storage.updateArcRun(runId, {
      status,
      currentStageId: (response.currentStageId as ArcStageId | null) ?? run.currentStageId ?? null,
      stages: stageSnapshots,
      updatedAt: new Date(),
      totalCostCents: response.costCents ?? run.totalCostCents ?? null,
      completedAt: status === 'completed' || status === 'failed' ? new Date() : undefined,
    });

    if (response.messages) {
      for (const message of response.messages) {
        await storage.appendArcMessage(this.translateAgentMessage(runId, message));
      }
    }

    if (response.artifacts) {
      for (const artifact of response.artifacts) {
        await storage.saveArcArtifact(this.translateAgentArtifact(runId, artifact));
      }
    }
  }

  private translateAgentMessage(runId: string, message: AgentMessage) {
    const role = message.role === 'user' ? 'user'
      : message.role === 'tool' ? 'tool'
      : 'researcher';
    return {
      runId,
      role,
      stageId: message.stageId as ArcStageId | undefined,
      agentId: message.agentId,
      content: message.content,
      reasoning: message.reasoning,
      metadata: message.role === 'tool' ? { toolName: message.agentId } : undefined,
    };
  }

  private translateAgentArtifact(runId: string, artifact: AgentArtifact) {
    return {
      runId,
      stageId: (artifact.stageId as ArcStageId | undefined) ?? 'solution-synthesis',
      type: artifact.type === 'markdown' || artifact.type === 'json' || artifact.type === 'chart' || artifact.type === 'table'
        ? artifact.type
        : 'dataset',
      title: artifact.title,
      description: artifact.description,
      data: artifact.data as Record<string, unknown> | undefined,
    };
  }

  private deriveStatus(response: AgentRunResponse): ArcRunStatus {
    if (response.status === 'failed') {
      return 'failed';
    }
    if (response.status === 'completed') {
      return 'completed';
    }
    if (response.nextAction === 'await_user') {
      return 'awaiting_input';
    }
    return 'running';
  }

  private async handleLaunchError(runId: string, error: unknown): Promise<void> {
    await storage.updateArcRun(runId, {
      status: 'failed',
      updatedAt: new Date(),
      completedAt: new Date(),
    });
    await storage.appendArcMessage({
      runId,
      role: 'system',
      content: `ARC agent failed: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}
