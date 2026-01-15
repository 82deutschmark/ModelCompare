/*
 * Author: gpt-5-codex
 * Date: 2025-11-06T04:10:00Z
 * PURPOSE: ARC agent executor orchestrating runs via REST or OpenAI Agents SDK pathways.
 * SRP/DRY check: Pass - encapsulates run lifecycle while delegating transport and storage responsibilities.
 */

import { callAgentByRest, type AgentRunRequest, type AgentRunResponse } from "../services/agent-runner";
import { runLuigiOrchestratorWithSdk, type LuigiSdkRunOptions } from "./openai-sdk-runner";
import { storage } from "../storage";
import type { LuigiRun, LuigiMessage, LuigiArtifact } from "@shared/schema";
import type { LuigiRunStatus, LuigiStageId, LuigiStageStatus, ArcExample } from "@shared/luigi-types";
import { LUIGI_STAGES } from "@shared/luigi-types";

const VALID_STAGE_IDS = new Set<string>(LUIGI_STAGES.map((stage) => stage.id));
const DEFAULT_STAGE_ID = (LUIGI_STAGES[0]?.id ?? "ingest-arc-task") as LuigiStageId;

function asLuigiStageId(value: unknown): LuigiStageId | null {
  if (typeof value !== "string") {
    return null;
  }
  return VALID_STAGE_IDS.has(value) ? (value as LuigiStageId) : null;
}

function normalizeArtifactData(data: unknown): Record<string, unknown> | undefined {
  if (data === null || typeof data === "undefined") {
    return undefined;
  }

  if (typeof data === "object" && !Array.isArray(data)) {
    return data as Record<string, unknown>;
  }

  return { value: data };
}

function stringifyExamples(examples: ArcExample[]): string {
  return JSON.stringify(examples, null, 2);
}

function stringifyExample(example?: ArcExample): string | null {
  if (!example) return null;
  return JSON.stringify(example, null, 2);
}

function parseExamples(raw?: string | null): ArcExample[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed as ArcExample[];
  } catch {
    return [];
  }
}

function parseExample(raw?: string | null): ArcExample | undefined {
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(raw) as ArcExample;
    return parsed;
  } catch {
    return undefined;
  }
}

export interface LuigiRunParams {
  taskId: string;
  analysisBrief: string;
  trainingExamples: ArcExample[];
  evaluationExample?: ArcExample;
  workspaceNotes?: string;
}

export interface LuigiExecutorOptions {
  orchestratorAgentId?: string;
  restBaseUrl?: string;
  restApiKey?: string;
  timeoutMs?: number;
  agentMode?: 'rest' | 'sdk';
  sdkOptions?: LuigiSdkRunOptions;
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
  private readonly agentMode: 'rest' | 'sdk';
  private readonly sdkOptions: LuigiSdkRunOptions;

  constructor(options: LuigiExecutorOptions) {
    this.orchestratorAgentId = options.orchestratorAgentId ?? "luigi-master-orchestrator";
    this.restBaseUrl = options.restBaseUrl ?? "http://localhost:8700";
    this.restApiKey = options.restApiKey;
    this.timeoutMs = options.timeoutMs ?? 600000; // default 10 minutes
    this.agentMode = options.agentMode ?? 'rest';
    this.sdkOptions = options.sdkOptions ?? { model: "openai/gpt-5", maxTurns: 4 };
  }

  async createRun(params: LuigiRunParams): Promise<LuigiRunContext> {
    const run = await storage.createLuigiRun({
      missionName: params.taskId,
      objective: params.analysisBrief,
      constraints: stringifyExamples(params.trainingExamples),
      successCriteria: stringifyExample(params.evaluationExample),
      stakeholderNotes: params.workspaceNotes ?? null,
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
          content: `ARC agent run failed: ${error instanceof Error ? error.message : String(error)}`,
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
      content: "ARC orchestrator launching...",
    });

    const trainingExamples = parseExamples(run.constraints);
    const evaluationExample = parseExample(run.successCriteria);

    if (this.agentMode === 'sdk') {
      const response = await runLuigiOrchestratorWithSdk({
        run,
        options: this.sdkOptions,
        arcContext: {
          taskId: run.missionName,
          analysisBrief: run.objective,
          trainingExamples,
          evaluationExample,
          workspaceNotes: run.stakeholderNotes ?? undefined,
        },
      });
      await this.handleAgentResponse(runId, response);
      return;
    }

    const payload: AgentRunRequest = {
      agentId: this.orchestratorAgentId,
      input: {
        runId,
        taskId: run.missionName,
        analysisBrief: run.objective,
        trainingExamples,
        evaluationExample,
        workspaceNotes: run.stakeholderNotes ?? undefined,
        userPrompt: run.userPrompt,
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
          storagePath: artifact.storagePath,
          data: normalizeArtifactData(artifact.data),
        });
      }
    }
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
    const sections = [
      `ARC Task ID: ${params.taskId}`,
      `Mission Brief: ${params.analysisBrief}`,
      `Training Examples (JSON):\n${stringifyExamples(params.trainingExamples)}`,
    ];

    if (params.evaluationExample) {
      sections.push(`Evaluation Example (JSON):\n${stringifyExample(params.evaluationExample)}`);
    }

    if (params.workspaceNotes) {
      sections.push(`Workspace Notes: ${params.workspaceNotes}`);
    }

    sections.push(
      'Guidance: Identify transformation rules, validate against training pairs, generalize to evaluation inputs, '
        + 'and emit final predictions alongside reasoning.'
    );

    return sections.join('\n\n');
  }

  private initializeStageMap(): StageMap {
    const map: StageMap = {};
    for (const stage of LUIGI_STAGES) {
      map[stage.id] = { status: 'idle' };
    }
    return map;
  }
}
