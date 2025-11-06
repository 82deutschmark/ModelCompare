/*
 * Author: gpt-5-codex
 * Date: 2025-11-06T03:49:34Z
 * PURPOSE: Shared type definitions for the ARC agent workspace including runs, stages, messages, and artifacts.
 * SRP/DRY check: Pass - centralizes ARC workspace contracts for reuse across client and server without duplicating Luigi types.
 */

export const ARC_STAGES = [
  { id: 'puzzle-intake', label: 'Puzzle Intake' },
  { id: 'pattern-discovery', label: 'Pattern Discovery' },
  { id: 'transformation-design', label: 'Transformation Design' },
  { id: 'candidate-evaluation', label: 'Candidate Evaluation' },
  { id: 'solution-synthesis', label: 'Solution Synthesis' },
  { id: 'reflection', label: 'Reflection' },
] as const;

export type ArcStageId = typeof ARC_STAGES[number]['id'];

export type ArcRunStatus = 'pending' | 'running' | 'awaiting_input' | 'completed' | 'failed' | 'cancelled';

export type ArcStageStatus = 'idle' | 'in-progress' | 'completed' | 'blocked' | 'failed';

export interface ArcStageState {
  id?: ArcStageId;
  status: ArcStageStatus;
  startedAt?: string;
  completedAt?: string;
  summary?: string;
  blockingReason?: string;
}

export interface ArcRunSummary {
  id: string;
  taskId: string;
  challengeName: string;
  puzzleDescription: string;
  puzzlePayload: Record<string, unknown>;
  status: ArcRunStatus;
  currentStageId: ArcStageId | null;
  stages: Record<ArcStageId, ArcStageState>;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  totalCostCents?: number;
}

export interface CreateArcRunRequest {
  taskId: string;
  challengeName: string;
  puzzleDescription: string;
  puzzlePayload: Record<string, unknown>;
  targetPatternSummary?: string;
  evaluationFocus?: string;
}

export interface CreateArcRunResponse {
  run: ArcRunSummary;
}

export interface ArcRunResponse {
  run: ArcRunSummary;
}

export type ArcMessageRole = 'system' | 'researcher' | 'tool' | 'assistant' | 'user';

export interface ArcMessagePayload {
  id: string;
  runId: string;
  role: ArcMessageRole;
  stageId?: ArcStageId;
  agentId?: string;
  content: string;
  reasoning?: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

export interface ListArcMessagesResponse {
  messages: ArcMessagePayload[];
}

export interface ArcUserReplyRequest {
  runId: string;
  content: string;
}

export type ArcUserReplyResponse = ArcMessagePayload;

export type ArcArtifactType = 'markdown' | 'json' | 'grid' | 'chart' | 'dataset';

export interface ArcArtifactRecord {
  id: string;
  runId: string;
  stageId: ArcStageId;
  type: ArcArtifactType;
  title: string;
  description?: string;
  data?: unknown;
  createdAt: string;
}

export interface ListArcArtifactsResponse {
  artifacts: ArcArtifactRecord[];
}
