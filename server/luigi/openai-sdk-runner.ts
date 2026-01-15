/**
 * Author: gpt-5-codex (building on ChatGPT-4.1)
 * Date: 2025-11-06T04:10:30Z
 * PURPOSE: Bridge ARC agent orchestrator execution onto OpenAI Agents SDK while emitting Luigi-compatible responses.
 * SRP/DRY check: Pass - encapsulates SDK invocation logic without touching routing or storage orchestration.
 */

import { Agent, run as runAgent } from '@openai/agents-core';
import { LUIGI_STAGES, type ArcExample } from '@shared/luigi-types';
import type { LuigiMessage, LuigiRun } from '@shared/schema';
import type { LuigiStageId, LuigiStageStatus } from '@shared/luigi-types';
import { storage } from '../storage';
import type { AgentRunResponse } from '../services/agent-runner';

const HISTORY_LIMIT = 12;
const STAGE_LABELS = new Map(LUIGI_STAGES.map((stage) => [stage.id, stage.label]));

export interface LuigiSdkRunOptions {
  model: string;
  maxTurns?: number;
}

export interface LuigiArcContext {
  taskId: string;
  analysisBrief: string;
  trainingExamples: ArcExample[];
  evaluationExample?: ArcExample;
  workspaceNotes?: string;
}

export interface LuigiSdkRunParams {
  run: LuigiRun;
  userReply?: string;
  options: LuigiSdkRunOptions;
  arcContext?: LuigiArcContext;
}

type StageSnapshot = {
  status: LuigiStageStatus;
  startedAt?: string;
  completedAt?: string;
  blockingReason?: string;
};

type StageSnapshotRecord = Partial<Record<LuigiStageId, StageSnapshot>>;

const VALID_STAGE_STATUSES: readonly LuigiStageStatus[] = ['idle', 'in-progress', 'completed', 'blocked', 'failed'];
const VALID_STAGE_STATUS_SET = new Set<LuigiStageStatus>(VALID_STAGE_STATUSES);

const orchestratorInstructions = `You are the ARC Orchestrator. Coordinate specialised agents to solve ARC puzzles by:
- Extracting transformation hypotheses from training pairs.
- Validating transformations across all examples and highlighting conflicts.
- Generalising to evaluation grids with reasoning for each output.
Always respond in GitHub-flavoured Markdown with the following sections only:

## Stage Progress
- Bullet list summarising the current status for each relevant stage.

## Key Hypotheses
- Bullet list describing active transformation hypotheses and their support.

## Required Inputs
- Bullet list of additional data or clarifications needed.

## Proposed Outputs
- Bullet list of predicted outputs (JSON arrays) with concise justification.

Keep responses concise (<= 250 words) while preserving clarity.`;

export async function runLuigiOrchestratorWithSdk(
  params: LuigiSdkRunParams,
): Promise<AgentRunResponse> {
  const { run, userReply, options, arcContext } = params;
  const missionBrief = buildMissionBrief(run, arcContext);
  const stageSnapshots = coerceStageSnapshots(run);
  const stageSummary = buildStageSummary(stageSnapshots);
  const history = await fetchConversationHistory(run.id);
  const conversationContext = buildConversationContext(history);

  const promptSections: string[] = [missionBrief, stageSummary];
  if (conversationContext) {
    promptSections.push(conversationContext);
  }
  if (userReply) {
    promptSections.push(`Latest human feedback:\n${userReply}`);
  }
  promptSections.push(
    'Deliver the requested sections using Markdown and include JSON arrays for any predicted outputs.'
  );

  const agent = new Agent({
    name: 'ARC Master Orchestrator',
    instructions: orchestratorInstructions,
    model: options.model,
  });

  const result = await runAgent(agent, promptSections.join('\n\n'), {
    maxTurns: options.maxTurns,
  });

  const finalOutput = stringifyFinalOutput(result.finalOutput);
  const nowIso = new Date().toISOString();
  const enrichedSnapshots = markInitialStage(stageSnapshots, nowIso);

  return {
    status: 'running',
    currentStageId: 'ingest-arc-task',
    stageSnapshots: enrichedSnapshots,
    messages: [
      {
        role: 'orchestrator',
        agentId: 'arc-master-orchestrator',
        content: finalOutput,
      },
    ],
    artifacts: [
      {
        stageId: 'ingest-arc-task',
        type: 'markdown',
        title: 'ARC Orchestrator Briefing',
        description: 'Markdown briefing generated via OpenAI Agents SDK.',
        data: { markdown: finalOutput },
      },
    ],
    nextAction: 'await_user',
  };
}

async function fetchConversationHistory(runId: string): Promise<LuigiMessage[]> {
  try {
    const messages = await storage.getLuigiMessages(runId, HISTORY_LIMIT);
    return messages;
  } catch (error) {
    throw new Error(`Failed to load ARC conversation history for run ${runId}: ${String(error)}`);
  }
}

function parseExamples(raw?: string | null): ArcExample[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as ArcExample[]) : [];
  } catch {
    return [];
  }
}

function parseExample(raw?: string | null): ArcExample | undefined {
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as ArcExample;
  } catch {
    return undefined;
  }
}

function buildMissionBrief(run: LuigiRun, context?: LuigiArcContext): string {
  const taskId = context?.taskId ?? run.missionName;
  const analysisBrief = context?.analysisBrief ?? run.objective;
  const trainingExamples = context?.trainingExamples ?? parseExamples(run.constraints);
  const evaluationExample = context?.evaluationExample ?? parseExample(run.successCriteria);
  const workspaceNotes = context?.workspaceNotes ?? run.stakeholderNotes ?? undefined;

  const lines: string[] = [
    `ARC Task ID: ${taskId}`,
    `Mission Brief: ${analysisBrief}`,
    `Training Examples (JSON):\n${JSON.stringify(trainingExamples, null, 2)}`,
  ];

  if (evaluationExample) {
    lines.push(`Evaluation Example (JSON):\n${JSON.stringify(evaluationExample, null, 2)}`);
  }

  if (workspaceNotes) {
    lines.push(`Workspace Notes: ${workspaceNotes}`);
  }

  return `Mission Brief:\n${lines.join('\n\n')}`;
}

function coerceStageSnapshots(run: LuigiRun): StageSnapshotRecord {
  const snapshot: StageSnapshotRecord = {};
  const stages = run.stages;

  if (!stages || typeof stages !== 'object') {
    return snapshot;
  }

  for (const [rawStageId, state] of Object.entries(stages as Record<string, any>)) {
    if (!state || typeof state !== 'object') {
      continue;
    }

    const stageId = rawStageId as LuigiStageId;
    const status = normalizeStageStatus(state.status);

    snapshot[stageId] = {
      status,
      ...(typeof state.startedAt === 'string' ? { startedAt: state.startedAt } : {}),
      ...(typeof state.completedAt === 'string' ? { completedAt: state.completedAt } : {}),
      ...(typeof state.blockingReason === 'string'
        ? { blockingReason: state.blockingReason }
        : {}),
    };
  }

  return snapshot;
}

function buildStageSummary(stages: StageSnapshotRecord): string {
  if (Object.keys(stages).length === 0) {
    return 'Stage Overview:\n- No stage progress recorded yet.';
  }

  const lines = Object.entries(stages)
    .map(([stageId, state]) => {
      const label = STAGE_LABELS.get(stageId as LuigiStageId) ?? stageId;
      const blocking = state.blockingReason ? ` (blocker: ${state.blockingReason})` : '';
      return `- ${label}: ${state.status}${blocking}`;
    })
    .join('\n');

  return `Stage Overview:\n${lines}`;
}

function buildConversationContext(messages: LuigiMessage[]): string {
  const relevantRoles = new Set(['orchestrator', 'stage-lead', 'agent', 'user']);
  const recent = messages
    .filter((message) => relevantRoles.has(message.role))
    .slice(-HISTORY_LIMIT)
    .map((message) => `${formatRole(message.role)}: ${message.content}`);

  if (recent.length === 0) {
    return '';
  }

  return `Conversation History:${recent.map((line) => `\n${line}`).join('')}`;
}

function formatRole(role: string): string {
  switch (role) {
    case 'orchestrator':
      return 'Orchestrator';
    case 'stage-lead':
      return 'Stage Lead';
    case 'agent':
      return 'Agent';
    case 'user':
      return 'User';
    default:
      return 'System';
  }
}

function normalizeStageStatus(status: unknown): LuigiStageStatus {
  if (typeof status !== 'string') {
    return 'idle';
  }

  if (VALID_STAGE_STATUS_SET.has(status as LuigiStageStatus)) {
    return status as LuigiStageStatus;
  }

  return 'idle';
}

function markInitialStage(stages: StageSnapshotRecord, timestamp: string): StageSnapshotRecord {
  const clone: StageSnapshotRecord = { ...stages };
  if (!clone['ingest-arc-task']) {
    clone['ingest-arc-task'] = { status: 'in-progress', startedAt: timestamp };
  }
  return clone;
}

function stringifyFinalOutput(finalOutput: unknown): string {
  if (typeof finalOutput === 'string') {
    return finalOutput;
  }
  try {
    return JSON.stringify(finalOutput, null, 2);
  } catch (error) {
    return `Unable to stringify orchestrator output: ${String(error)}`;
  }
}
