/*
 * Author: gpt-5-codex
 * Date: 2025-11-06T04:09:00Z
 * PURPOSE: Shared ARC agent types for runs, stages, messages, and artifacts.
 * SRP/DRY check: Pass - centralizes ARC agent contracts for reuse across client and server.
 */

export const LUIGI_STAGES = [
  { id: 'ingest-arc-task', label: 'Ingest ARC Task' },
  { id: 'pattern-discovery', label: 'Pattern Discovery' },
  { id: 'transformation-simulation', label: 'Transformation Simulation' },
  { id: 'generalization-evaluation', label: 'Generalization Evaluation' },
  { id: 'solution-synthesis', label: 'Solution Synthesis' },
  { id: 'critique-review', label: 'Critique & Review' },
  { id: 'deliverable-export', label: 'Deliverable Export' },
] as const;

export type LuigiStageId = typeof LUIGI_STAGES[number]['id'];

export type LuigiRunStatus =
  | 'pending'
  | 'running'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type LuigiStageStatus = 'idle' | 'in-progress' | 'completed' | 'blocked' | 'failed';

export interface LuigiStageState {
  id: LuigiStageId;
  status: LuigiStageStatus;
  startedAt?: string;
  completedAt?: string;
  blockingReason?: string;
  artifacts?: string[];
}

export interface LuigiRunSummary {
  id: string;
  userPrompt: string;
  status: LuigiRunStatus;
  currentStageId: LuigiStageId | null;
  stages: Record<LuigiStageId, LuigiStageState>;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  totalCostCents?: number;
}

export interface ArcExample {
  input: number[][];
  output?: number[][];
}

export interface CreateLuigiRunRequest {
  taskId: string;
  analysisBrief: string;
  trainingExamples: ArcExample[];
  evaluationExample?: ArcExample;
  workspaceNotes?: string;
}

export interface CreateLuigiRunResponse {
  run: LuigiRunSummary;
}

export interface LuigiRunResponse {
  run: LuigiRunSummary;
}

export type LuigiMessageRole =
  | 'system'
  | 'orchestrator'
  | 'stage-lead'
  | 'agent'
  | 'tool'
  | 'user';

export interface LuigiMessagePayload {
  runId: string;
  messageId: string;
  role: LuigiMessageRole;
  stageId?: LuigiStageId;
  agentId?: string;
  content: string;
  reasoning?: string;
  toolName?: string;
  createdAt: string;
}

export interface ListLuigiMessagesResponse {
  messages: LuigiMessagePayload[];
}

export interface LuigiUserReplyRequest {
  runId: string;
  content: string;
}

export type LuigiUserReplyResponse = LuigiMessagePayload;

export type LuigiArtifactType =
  | 'markdown'
  | 'json'
  | 'table'
  | 'chart'
  | 'file-reference';

export interface LuigiArtifactRecord {
  artifactId: string;
  runId: string;
  stageId: LuigiStageId;
  type: LuigiArtifactType;
  title: string;
  description?: string;
  storagePath?: string;
  data?: unknown;
  createdAt: string;
}

export interface ListLuigiArtifactsResponse {
  artifacts: LuigiArtifactRecord[];
}
