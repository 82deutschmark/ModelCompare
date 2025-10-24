/**
 * Author: ChatGPT-4.1
 * Date: 2025-10-24T23:05:00Z
 * PURPOSE: Bridge Luigi orchestrator execution onto the OpenAI Agents SDK while
 *          emitting responses compatible with the existing agent runner contract.
 * SRP/DRY check: Pass - encapsulates SDK invocation logic without touching
 *                routing, storage orchestration, or REST fallback paths.
 */

import { Agent, run as runAgent } from '@openai/agents-core';
import { LUIGI_STAGES } from '@shared/luigi-types';
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

export interface LuigiSdkRunParams {
  run: LuigiRun;
  userReply?: string;
  options: LuigiSdkRunOptions;
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

const orchestratorInstructions = `You are the Luigi Master Orchestrator. Coordinate stage leads,
aggregate validated information, and surface action items. Always respond in
GitHub-flavoured Markdown with the following sections only:

## Stage Progress
- Bullet list summarising the current status for each relevant stage.

## Key Risks
- Bullet list of the most pressing risks or uncertainties.

## Required Inputs
- Bullet list describing information or decisions needed from humans.

## Recommended Actions
- Bullet list of concrete next steps for the stage leads or stakeholders.

When referencing stages, use their human-friendly names. Stay concise (<= 250
words total) while maintaining clarity.`;

export async function runLuigiOrchestratorWithSdk(
  params: LuigiSdkRunParams,
): Promise<AgentRunResponse> {
  const { run, userReply, options } = params;
  const missionBrief = buildMissionBrief(run);
  const stageSnapshots = coerceStageSnapshots(run);
  const stageSummary = buildStageSummary(stageSnapshots);
  const history = await fetchConversationHistory(run.id);
  const conversationContext = buildConversationContext(history);

  const promptSections: string[] = [missionBrief, stageSummary];
  if (conversationContext) {
    promptSections.push(conversationContext);
  }
  if (userReply) {
    promptSections.push(`Latest stakeholder message:\n${userReply}`);
  }
  promptSections.push(
    'Deliver the requested sections using Markdown and reference specific stages where helpful.',
  );

  const agent = new Agent({
    name: 'Luigi Master Orchestrator',
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
    currentStageId: 'start-time-task',
    stageSnapshots: enrichedSnapshots,
    messages: [
      {
        role: 'orchestrator',
        agentId: 'luigi-master-orchestrator',
        content: finalOutput,
      },
    ],
    artifacts: [
      {
        stageId: 'start-time-task',
        type: 'markdown',
        title: 'Luigi Orchestrator Briefing',
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
    throw new Error(`Failed to load Luigi conversation history for run ${runId}: ${String(error)}`);
  }
}

function buildMissionBrief(run: LuigiRun): string {
  const lines: string[] = [
    `Mission Name: ${run.missionName}`,
    `Objective: ${run.objective}`,
  ];

  if (run.constraints) lines.push(`Constraints: ${run.constraints}`);
  if (run.successCriteria) lines.push(`Success Criteria: ${run.successCriteria}`);
  if (run.stakeholderNotes) lines.push(`Stakeholder Notes: ${run.stakeholderNotes}`);

  return `Mission Brief:\n${lines.join('\n')}`;
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
    case 'stage-lead':
      return 'Stage Lead';
    case 'orchestrator':
      return 'Orchestrator';
    case 'agent':
      return 'Agent';
    case 'user':
      return 'Stakeholder';
    default:
      return role;
  }
}

function stringifyFinalOutput(finalOutput: unknown): string {
  if (typeof finalOutput === 'string') {
    return finalOutput.trim();
  }

  return JSON.stringify(finalOutput, null, 2);
}

function markInitialStage(
  stages: StageSnapshotRecord,
  timestamp: string,
): StageSnapshotRecord {
  const updated: StageSnapshotRecord = { ...stages };
  const existing = updated['start-time-task'] ?? { status: 'idle' };
  updated['start-time-task'] = {
    ...existing,
    status: 'completed',
    startedAt: existing.startedAt ?? timestamp,
    completedAt: timestamp,
  };
  return updated;
}

function normalizeStageStatus(value: unknown): LuigiStageStatus {
  if (typeof value === 'string') {
    if (VALID_STAGE_STATUS_SET.has(value as LuigiStageStatus)) {
      return value as LuigiStageStatus;
    }
    if (value === 'complete') {
      return 'completed';
    }
    if (value === 'in_progress') {
      return 'in-progress';
    }
    if (value === 'blocking') {
      return 'blocked';
    }
    if (value === 'error') {
      return 'failed';
    }
  }

  return 'idle';
}
