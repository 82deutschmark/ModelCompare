/*
 * Author: Codex using GPT-5
 * Date: 2025-10-04T01:44:52Z
 * PURPOSE: Shared type definitions for Luigi workspace API contracts covering runs, stages, messages, and artifacts.
 * SRP/DRY check: Pass - centralizes Luigi-specific shared types to avoid duplication across client and server.
 * shadcn/ui: Pass - no UI usage in shared types.
 */

export const LUIGI_STAGES = [
  { id: 'start-time-task', label: 'Start Time Task' },
  { id: 'setup-task', label: 'Setup Task' },
  { id: 'redline-gate-task', label: 'Redline Gate Task' },
  { id: 'premise-attack-task', label: 'Premise Attack Task' },
  { id: 'identify-purpose-task', label: 'Identify Purpose Task' },
  { id: 'make-assumptions-task', label: 'Make Assumptions Task' },
  { id: 'distill-assumptions-task', label: 'Distill Assumptions Task' },
  { id: 'review-assumptions-task', label: 'Review Assumptions Task' },
  { id: 'identify-risks-task', label: 'Identify Risks Task' },
  { id: 'risk-matrix-task', label: 'Risk Matrix Task' },
  { id: 'risk-mitigation-plan-task', label: 'Risk Mitigation Plan Task' },
  { id: 'currency-strategy-task', label: 'Currency Strategy Task' },
  { id: 'physical-locations-task', label: 'Physical Locations Task' },
  { id: 'strategic-decisions-markdown-task', label: 'Strategic Decisions Markdown Task' },
  { id: 'scenarios-markdown-task', label: 'Scenarios Markdown Task' },
  { id: 'expert-finder-task', label: 'Expert Finder Task' },
  { id: 'expert-criticism-task', label: 'Expert Criticism Task' },
  { id: 'expert-orchestrator-task', label: 'Expert Orchestrator Task' },
  { id: 'create-wbs-level-1', label: 'Create WBS Level 1' },
  { id: 'create-wbs-level-2', label: 'Create WBS Level 2' },
  { id: 'create-wbs-level-3', label: 'Create WBS Level 3' },
  { id: 'identify-wbs-task-dependencies', label: 'Identify WBS Task Dependencies' },
  { id: 'estimate-wbs-task-durations', label: 'Estimate WBS Task Durations' },
  { id: 'wbs-populate', label: 'WBS Populate' },
  { id: 'wbs-task-tooltip', label: 'WBS Task Tooltip' },
  { id: 'project-schedule-populator', label: 'Project Schedule Populator' },
  { id: 'project-schedule', label: 'Project Schedule' },
  { id: 'export-gantt-dhtmlx', label: 'Export Gantt DHTMLX' },
  { id: 'export-gantt-csv', label: 'Export Gantt CSV' },
  { id: 'export-gantt-mermaid', label: 'Export Gantt Mermaid' },
  { id: 'find-team-members', label: 'Find Team Members' },
  { id: 'enrich-team-members-contract-type', label: 'Enrich Team Members Contract Type' },
  { id: 'enrich-team-members-background', label: 'Enrich Team Members Background' },
  { id: 'enrich-team-members-environment', label: 'Enrich Team Members Environment' },
  { id: 'team-markdown-document-builder', label: 'Team Markdown Document Builder' },
  { id: 'review-team', label: 'Review Team' },
  { id: 'create-pitch', label: 'Create Pitch' },
  { id: 'convert-pitch-to-markdown', label: 'Convert Pitch To Markdown' },
  { id: 'executive-summary', label: 'Executive Summary' },
  { id: 'review-plan', label: 'Review Plan' },
  { id: 'report-generator', label: 'Report Generator' },
  { id: 'governance-phase-1-audit', label: 'Governance Phase 1 Audit' },
  { id: 'governance-phase-2-internal-bodies', label: 'Governance Phase 2 Internal Bodies' },
  { id: 'governance-phase-3-implementation-plan', label: 'Governance Phase 3 Implementation Plan' },
  { id: 'governance-phase-4-decision-matrix', label: 'Governance Phase 4 Decision Matrix' },
  { id: 'governance-phase-5-monitoring', label: 'Governance Phase 5 Monitoring' },
  { id: 'governance-phase-6-extra', label: 'Governance Phase 6 Extra' },
  { id: 'consolidate-governance', label: 'Consolidate Governance' },
  { id: 'data-collection', label: 'Data Collection' },
  { id: 'obtain-output-files', label: 'Obtain Output Files' },
  { id: 'pipeline-environment', label: 'Pipeline Environment' },
  { id: 'llm-executor', label: 'LLM Executor' },
  { id: 'wbs-json-exporter', label: 'WBS JSON Exporter' },
  { id: 'wbs-dot-exporter', label: 'WBS DOT Exporter' },
  { id: 'wbs-png-exporter', label: 'WBS PNG Exporter' },
  { id: 'wbs-pdf-exporter', label: 'WBS PDF Exporter' },
  { id: 'budget-estimation-task', label: 'Budget Estimation Task' },
  { id: 'cashflow-projection-task', label: 'Cashflow Projection Task' },
  { id: 'final-report-assembler', label: 'Final Report Assembler' }
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

export interface CreateLuigiRunRequest {
  missionName: string;
  objective: string;
  constraints?: string;
  successCriteria?: string;
  stakeholderNotes?: string;
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
