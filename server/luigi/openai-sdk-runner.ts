/**
 * Author: ChatGPT-4.1
 * Date: 2025-10-24T23:05:00Z
 * PURPOSE: Bridge Luigi orchestrator execution onto the OpenAI Agents SDK while
 *          emitting responses compatible with the existing agent runner contract.
 * SRP/DRY check: Pass - encapsulates SDK invocation logic without touching
 *                routing, storage orchestration, or REST fallback paths.
 */

import { z } from 'zod';
import { LUIGI_STAGES } from '@shared/luigi-types';
import type { LuigiMessage, LuigiRun } from '@shared/schema';
import type { LuigiStageId, LuigiStageStatus } from '@shared/luigi-types';
import { storage } from '../storage';
import type { AgentRunResponse } from '../services/agent-runner';
import {
  getOpenAiResponsesClient,
  type JsonSchemaDefinition,
} from '../services/openai-responses-client';

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

const orchestratorResponseSchema = z.object({
  briefingMarkdown: z.string().min(1),
  stageUpdates: z.record(
    z.object({
      status: z.string().optional(),
      summary: z.string().optional(),
      blockingReason: z.string().optional(),
    })
  ).optional(),
  requiredInputs: z.array(z.string()).optional(),
  risks: z.array(z.string()).optional(),
  nextAction: z.enum(['await_user', 'continue']).default('await_user'),
});

const ORCHESTRATOR_JSON_SCHEMA: JsonSchemaDefinition = {
  name: 'luigi_orchestrator_payload',
  schema: {
    type: 'object',
    properties: {
      briefingMarkdown: { type: 'string' },
      stageUpdates: {
        type: 'object',
        additionalProperties: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            summary: { type: 'string' },
            blockingReason: { type: 'string' },
          },
          additionalProperties: false,
        },
      },
      requiredInputs: {
        type: 'array',
        items: { type: 'string' },
      },
      risks: {
        type: 'array',
        items: { type: 'string' },
      },
      nextAction: {
        type: 'string',
        enum: ['await_user', 'continue'],
      },
    },
    required: ['briefingMarkdown', 'nextAction'],
    additionalProperties: false,
  },
};

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
  const prompt = composeStructuredPrompt({
    instructions: buildOrchestratorInstructions(options.maxTurns),
    sections: promptSections,
  });

  const responsesClient = getOpenAiResponsesClient();
  const { parsed, rawText, usage } = await responsesClient.createJsonResponse({
    model: options.model,
    prompt,
    schema: orchestratorResponseSchema,
    schemaDefinition: ORCHESTRATOR_JSON_SCHEMA,
    metadata: {
      runId: run.id,
      agent: 'luigi-orchestrator',
      missionName: run.missionName,
    },
    maxOutputTokens: 5000,
  });
  const nowIso = new Date().toISOString();
  const seededSnapshots = markInitialStage(stageSnapshots, nowIso);
  const enrichedSnapshots = mergeStageSnapshots(seededSnapshots, parsed.stageUpdates, nowIso);
  const messageContent = buildOrchestratorMessage(parsed);

  return {
    status: 'running',
    currentStageId: 'start-time-task',
    stageSnapshots: enrichedSnapshots,
    messages: [
      {
        role: 'orchestrator',
        agentId: 'luigi-master-orchestrator',
        content: messageContent,
      },
    ],
    artifacts: [
      {
        stageId: 'start-time-task',
        type: 'markdown',
        title: 'Luigi Orchestrator Briefing',
        description: 'Structured orchestration briefing generated via OpenAI Responses API.',
        data: {
          markdown: parsed.briefingMarkdown,
          requiredInputs: parsed.requiredInputs ?? [],
          risks: parsed.risks ?? [],
          stageUpdates: parsed.stageUpdates ?? {},
          raw: rawText,
        },
      },
    ],
    nextAction: parsed.nextAction,
    costCents: usage.costCents,
  };
}

function buildOrchestratorInstructions(maxTurns?: number): string {
  const base = `You are the Luigi Master Orchestrator. Coordinate stage leads, aggregate validated information, and surface action items.
Return a JSON object with the following structure:
{
  "briefingMarkdown": "Markdown summary covering Stage Progress, Key Risks, Required Inputs, and Recommended Actions",
  "stageUpdates": {
    "<stage-id>": {
      "status": "idle|in-progress|completed|blocked|failed",
      "summary": "concise update",
      "blockingReason": "optional detail when blocked"
    }
  },
  "requiredInputs": ["things the team needs"],
  "risks": ["top risks"],
  "nextAction": "await_user" | "continue"
}
Ensure briefingMarkdown uses GitHub-flavoured Markdown, references human-readable stage names, and stays within 250 words.`;
  if (maxTurns && Number.isFinite(maxTurns)) {
    return `${base}\nLimit your internal planning iterations to at most ${maxTurns} before returning the JSON response.`;
  }
  return base;
}

function composeStructuredPrompt(params: { instructions: string; sections: string[] }): string {
  const context = params.sections.map((section) => section.trim()).filter(Boolean).join('\n\n');
  return [
    '### Core Instructions',
    params.instructions.trim(),
    '',
    '### Context',
    context,
    '',
    '### Output Requirements',
    'Return only a JSON object that matches the schema described above. Do not include markdown fences or commentary outside the JSON payload.',
  ].join('\n');
}

function mergeStageSnapshots(
  base: StageSnapshotRecord,
  updates: Record<string, { status?: string; summary?: string; blockingReason?: string }> | undefined,
  timestampIso: string,
): StageSnapshotRecord {
  if (!updates || Object.keys(updates).length === 0) {
    return base;
  }

  const merged: StageSnapshotRecord = { ...base };

  for (const [rawStageId, update] of Object.entries(updates)) {
    const stageId = rawStageId as LuigiStageId;
    const existing = merged[stageId] ?? { status: 'idle' as LuigiStageStatus };
    const status = update.status ? normalizeStageStatus(update.status) : existing.status ?? 'idle';

    merged[stageId] = {
      status,
      startedAt: existing.startedAt ?? timestampIso,
      completedAt: status === 'completed' ? timestampIso : existing.completedAt,
      blockingReason: update.blockingReason ?? existing.blockingReason,
      summary: update.summary ?? existing.summary,
    };
  }

  return merged;
}

function buildOrchestratorMessage(parsed: z.infer<typeof orchestratorResponseSchema>): string {
  const sections: string[] = [parsed.briefingMarkdown.trim()];

  if (parsed.risks && parsed.risks.length > 0) {
    sections.push('## Key Risks', parsed.risks.map((risk) => `- ${risk}`).join('\n'));
  }

  if (parsed.requiredInputs && parsed.requiredInputs.length > 0) {
    sections.push('## Required Inputs', parsed.requiredInputs.map((item) => `- ${item}`).join('\n'));
  }

  return sections.join('\n\n');
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
