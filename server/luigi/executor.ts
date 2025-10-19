/*
 * Author: Codex using GPT-5
 * Date: 2025-10-04T10:28:15Z
 * PURPOSE: Luigi executor service orchestrating agent runs via external REST agent runner.
 * SRP/DRY check: Pass - encapsulates Luigi run lifecycle without touching routing or UI concerns.
 * shadcn/ui: Pass - backend only.
 */

import { callAgentByRest, type AgentRunRequest, type AgentRunResponse } from "../services/agent-runner";
import { storage } from "../storage";
import type { LuigiRun, LuigiMessage, LuigiArtifact } from "@shared/schema";
import type { LuigiRunStatus, LuigiStageId, LuigiStageStatus } from "@shared/luigi-types";
import { LUIGI_STAGES } from "@shared/luigi-types";

const VALID_STAGE_IDS = new Set<string>(LUIGI_STAGES.map((stage) => stage.id));
const DEFAULT_STAGE_ID = (LUIGI_STAGES[0]?.id ?? 'start-time-task') as LuigiStageId;

function asLuigiStageId(value: unknown): LuigiStageId | null {
  if (typeof value !== 'string') {
    return null;
  }
  return VALID_STAGE_IDS.has(value) ? (value as LuigiStageId) : null;
}

function normalizeArtifactData(data: unknown): Record<string, unknown> | undefined {
  if (data === null || typeof data === 'undefined') {
    return undefined;
  }

  if (typeof data === 'object' && !Array.isArray(data)) {
    return data as Record<string, unknown>;
  }

  return { value: data };
}

export interface LuigiRunParams {
  missionName: string;
  objective: string;
  constraints?: string;
  successCriteria?: string;
  stakeholderNotes?: string;
}

export interface LuigiExecutorOptions {
  orchestratorAgentId?: string;
  restBaseUrl: string;
  restApiKey?: string;
  timeoutMs?: number;
}

export interface LuigiRunContext {
  run: LuigiRun;
  messages: LuigiMessage[];
  artifacts: LuigiArtifact[];
}

type LuigiStageSnapshot = {
  status: LuigiStageStatus;
  startedAt?: string;
  completedAt?: string;
  blockingReason?: string;
};

type StageMap = Record<string, LuigiStageSnapshot>;

export class LuigiExecutor {
  private readonly orchestratorAgentId: string;
  private readonly restBaseUrl: string;
  private readonly restApiKey?: string;
  private readonly timeoutMs: number;

  constructor(options: LuigiExecutorOptions) {
    this.orchestratorAgentId = options.orchestratorAgentId ?? "luigi-master-orchestrator";
    this.restBaseUrl = options.restBaseUrl;
    this.restApiKey = options.restApiKey;
    this.timeoutMs = options.timeoutMs ?? 600000; // default 10 minutes
  }

  async createRun(params: LuigiRunParams): Promise<LuigiRunContext> {
    const run = await storage.createLuigiRun({
      missionName: params.missionName,
      objective: params.objective,
      constraints: params.constraints ?? null,
      successCriteria: params.successCriteria ?? null,
      stakeholderNotes: params.stakeholderNotes ?? null,
      userPrompt: this.buildPrompt(params),
      status: "pending",
      currentStageId: null,
      stages: this.initializeStageMap(),
      totalCostCents: null,
    });

    return this.fetchContext(run.id);
  }

  async startRun(runId: string): Promise<LuigiRunContext> {
    const run = await storage.getLuigiRun(runId);
    if (!run) {
      throw new Error(`Luigi run ${runId} not found`);
    }

    if (run.status !== "running") {
      await storage.updateLuigiRun(runId, {
        status: "running",
        updatedAt: new Date(),
      });

      void this.launchOrchestrator(runId).catch(async (error: unknown) => {
        await storage.updateLuigiRun(runId, {
          status: "failed",
          updatedAt: new Date(),
        });
        await storage.appendLuigiMessage({
          runId,
          role: "system",
          content: `Luigi run failed: ${error instanceof Error ? error.message : String(error)}`,
        });
      });
    }

    return this.fetchContext(runId);
  }

  private async launchOrchestrator(runId: string): Promise<void> {
    const run = await storage.getLuigiRun(runId);
    if (!run) throw new Error("Run not found during orchestrator launch");

    await storage.appendLuigiMessage({
      runId,
      role: "system",
      content: "Luigi orchestrator launching...",
    });

    const payload: AgentRunRequest = {
      agentId: this.orchestratorAgentId,
      input: {
        runId,
        missionName: run.missionName,
        objective: run.objective,
        constraints: run.constraints ?? undefined,
        successCriteria: run.successCriteria ?? undefined,
        stakeholderNotes: run.stakeholderNotes ?? undefined,
      },
    };

    const response = await callAgentByRest(payload, {
      baseUrl: this.restBaseUrl,
      apiKey: this.restApiKey,
      timeoutMs: this.timeoutMs,
    });

    await this.handleAgentResponse(runId, response);
  }

  private async handleAgentResponse(runId: string, response: AgentRunResponse): Promise<void> {
    const run = await storage.getLuigiRun(runId);
    if (!run) throw new Error("Run not found while handling response");

    const status: LuigiRunStatus = response.status === "completed"
      ? "completed"
      : response.status === "failed"
        ? "failed"
        : "running";

    const stageSnapshots: StageMap | undefined = response.stageSnapshots as StageMap | undefined;

    const nextStageId = asLuigiStageId(response.currentStageId)
      ?? asLuigiStageId(run.currentStageId)
      ?? null;

    await storage.updateLuigiRun(runId, {
      status,
      updatedAt: new Date(),
      completedAt: status === "completed" ? new Date() : undefined,
      totalCostCents: response.costCents ?? run.totalCostCents ?? null,
      stages: stageSnapshots ?? run.stages,
      currentStageId: nextStageId,
    });

    if (response.messages) {
      for (const message of response.messages) {
        await storage.appendLuigiMessage({
          runId,
          role: message.role,
          agentId: message.agentId,
          stageId: asLuigiStageId(message.stageId) ?? undefined,
          content: message.content,
          reasoning: message.reasoning,
        });
      }
    }

    if (response.artifacts) {
      for (const artifact of response.artifacts) {
        const stageId = asLuigiStageId(artifact.stageId)
          ?? asLuigiStageId(run.currentStageId)
          ?? DEFAULT_STAGE_ID;
        await storage.saveLuigiArtifact({
          runId,
          stageId,
          type: artifact.type,
          title: artifact.title,
          description: artifact.description,
          data: normalizeArtifactData(artifact.data),
        });
      }
    }

    if (response.nextAction === "await_user") {
      await storage.appendLuigiMessage({
        runId,
        role: "system",
        content: "Luigi orchestrator is awaiting user input.",
      });
    }
  }

  async submitUserReply(runId: string, content: string): Promise<LuigiMessage> {
    const message = await storage.appendLuigiMessage({
      runId,
      role: "user",
      content,
    });

    const payload: AgentRunRequest = {
      agentId: this.orchestratorAgentId,
      input: { runId, userReply: content },
    };

    await callAgentByRest(payload, {
      baseUrl: this.restBaseUrl,
      apiKey: this.restApiKey,
      timeoutMs: this.timeoutMs,
    });

    return message;
  }

  async pauseRun(runId: string): Promise<LuigiRunContext> {
    await storage.updateLuigiRun(runId, { status: "paused", updatedAt: new Date() });
    return this.fetchContext(runId);
  }

  async resumeRun(runId: string): Promise<LuigiRunContext> {
    await storage.updateLuigiRun(runId, { status: "running", updatedAt: new Date() });
    void this.launchOrchestrator(runId);
    return this.fetchContext(runId);
  }

  async cancelRun(runId: string): Promise<LuigiRunContext> {
    await storage.updateLuigiRun(runId, {
      status: "cancelled",
      completedAt: new Date(),
      updatedAt: new Date(),
    });
    await storage.appendLuigiMessage({
      runId,
      role: "system",
      content: "Luigi run cancelled by user.",
    });
    return this.fetchContext(runId);
  }

  async fetchContext(runId: string): Promise<LuigiRunContext> {
    const run = await storage.getLuigiRun(runId);
    if (!run) {
      throw new Error(`Luigi run ${runId} not found`);
    }
    const [messages, artifacts] = await Promise.all([
      storage.getLuigiMessages(runId),
      storage.getLuigiArtifacts(runId),
    ]);

    return { run, messages, artifacts };
  }

  private buildPrompt(params: LuigiRunParams): string {
    return [
      `Mission Name: ${params.missionName}`,
      `Objective: ${params.objective}`,
      params.constraints ? `Constraints: ${params.constraints}` : null,
      params.successCriteria ? `Success Criteria: ${params.successCriteria}` : null,
      params.stakeholderNotes ? `Stakeholder Notes: ${params.stakeholderNotes}` : null,
    ].filter(Boolean).join('\n');
  }

  private initializeStageMap(): StageMap {
    const map: StageMap = {};
    for (const stage of LUIGI_STAGES) {
      map[stage.id] = { status: 'idle' };
    }
    return map;
  }
}
