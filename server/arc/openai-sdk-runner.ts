/*
 * Author: gpt-5-codex
 * Date: 2025-11-06T03:49:34Z
 * PURPOSE: Execute ARC agent reasoning flows with the OpenAI Agents SDK and translate
 *          results into the generic AgentRunResponse contract for storage + UI layers.
 * SRP/DRY check: Pass - isolates SDK invocation, parsing, and stage normalization for ARC runs.
 */

import { z } from 'zod';
import { ARC_STAGES, type ArcStageId, type ArcStageStatus } from '@shared/arc-types';
import type { ArcRun, ArcMessage } from '@shared/schema';
import type { AgentRunResponse } from '../services/agent-runner';
import { storage } from '../storage';
import {
  getOpenAiResponsesClient,
  type JsonSchemaDefinition,
} from '../services/openai-responses-client';

const ARC_STAGE_STATUS: readonly ArcStageStatus[] = ['idle', 'in-progress', 'completed', 'blocked', 'failed'];
const ARC_STAGE_STATUS_SET = new Set<ArcStageStatus>(ARC_STAGE_STATUS);

const parsedResponseSchema = z.object({
  stages: z.array(z.object({
    id: z.string(),
    status: z.string(),
    summary: z.string().optional(),
    blockingReason: z.string().optional(),
  })).optional(),
  reasoning: z.string(),
  finalAnswer: z.string(),
  answerGrid: z.array(z.array(z.number())).optional(),
  confidence: z.number().min(0).max(1).optional(),
  nextAction: z.enum(['await_user', 'continue', 'complete']).default('complete'),
});

const ARC_AGENT_JSON_SCHEMA: JsonSchemaDefinition = {
  name: 'arc_agent_payload',
  schema: {
    type: 'object',
    properties: {
      stages: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            status: { type: 'string' },
            summary: { type: 'string' },
            blockingReason: { type: 'string' },
          },
          required: ['id', 'status'],
          additionalProperties: false,
        },
      },
      reasoning: { type: 'string' },
      finalAnswer: { type: 'string' },
      answerGrid: {
        type: 'array',
        items: {
          type: 'array',
          items: { type: 'number' },
        },
      },
      confidence: { type: 'number', minimum: 0, maximum: 1 },
      nextAction: {
        type: 'string',
        enum: ['await_user', 'continue', 'complete'],
      },
    },
    required: ['reasoning', 'finalAnswer', 'nextAction'],
    additionalProperties: false,
  },
};

export interface ArcSdkRunOptions {
  model: string;
  maxTurns?: number;
}

export interface ArcSdkRunParams {
  run: ArcRun;
  options: ArcSdkRunOptions;
  userReply?: string;
}

export async function runArcAgentWithSdk(params: ArcSdkRunParams): Promise<AgentRunResponse> {
  const { run, options, userReply } = params;
  const history = await loadConversationHistory(run.id);
  const prompt = composeStructuredPrompt({
    instructions: buildInstructions(options.maxTurns),
    task: buildPrompt(run, history, userReply),
  });

  const responsesClient = getOpenAiResponsesClient();
  const { parsed, rawText, usage } = await responsesClient.createJsonResponse({
    model: options.model,
    prompt,
    schema: parsedResponseSchema,
    schemaDefinition: ARC_AGENT_JSON_SCHEMA,
    metadata: {
      runId: run.id,
      arcTaskId: run.taskId,
      agent: 'arc',
    },
    maxOutputTokens: 6000,
  });
  const stageSnapshots = normalizeStageSnapshots(parsed.stages);
  const currentStage = selectCurrentStage(stageSnapshots);
  const artifactData = buildArtifactData(parsed, rawText);

  return {
    status: parsed.nextAction === 'complete' ? 'completed' : 'running',
    currentStageId: currentStage,
    stageSnapshots,
    messages: [
      {
        role: 'agent',
        content: buildAgentMessage(parsed),
      },
    ],
    artifacts: [
      {
        stageId: currentStage ?? 'solution-synthesis',
        type: 'markdown',
        title: 'ARC Reasoning Report',
        description: 'Consolidated reasoning and candidate solution for the ARC puzzle.',
        data: artifactData,
      },
    ],
    nextAction: parsed.nextAction === 'await_user' ? 'await_user' : 'continue',
    costCents: usage.costCents,
  };
}

async function loadConversationHistory(runId: string): Promise<ArcMessage[]> {
  const messages = await storage.getArcMessages(runId, 20);
  return messages;
}

function buildPrompt(run: ArcRun, history: ArcMessage[], userReply?: string): string {
  const historySection = history
    .filter((message) => ['assistant', 'researcher', 'user', 'tool'].includes((message.role as string) ?? ''))
    .map((message) => `${capitalizeRole(message.role ?? 'assistant')}: ${message.content}`)
    .join('\n');

  const sections: string[] = [
    `ARC Task ID: ${run.taskId}`,
    `Challenge Name: ${run.challengeName}`,
    `Puzzle Brief: ${run.puzzleDescription}`,
    `Puzzle Payload (JSON): ${JSON.stringify(run.puzzlePayload, null, 2)}`,
  ];

  if (run.targetPatternSummary) {
    sections.push(`Target Pattern Summary: ${run.targetPatternSummary}`);
  }

  if (run.evaluationFocus) {
    sections.push(`Evaluation Focus: ${run.evaluationFocus}`);
  }

  if (historySection) {
    sections.push(`Recent Conversation:\n${historySection}`);
  }

  if (userReply) {
    sections.push(`Latest Human Input: ${userReply}`);
  }

  sections.push('Respond with JSON adhering to the specified schema.');

  return sections.join('\n\n');
}

function buildInstructions(maxTurns?: number): string {
  const base = `You are an ARC (Abstraction and Reasoning Corpus) specialist. Given a puzzle payload,
identify transformation rules, propose candidate solutions, and report a final answer.
Always respond with a JSON object matching this schema:
{
  "stages": [
    { "id": "puzzle-intake", "status": "in-progress|completed|blocked|failed|idle", "summary": "..." }
  ],
  "reasoning": "step-by-step explanation",
  "finalAnswer": "Concise description of the predicted output",
  "answerGrid": [[ints]] (optional grid representation),
  "confidence": 0.0-1.0 (optional),
  "nextAction": "await_user" | "continue" | "complete"
}
Use stage identifiers from the provided list only.
If additional information is required from a human, set nextAction to "await_user" and explain why in reasoning.`;
  if (maxTurns && Number.isFinite(maxTurns)) {
    return `${base}\nLimit your internal deliberation to at most ${maxTurns} iterations before finalising the JSON response.`;
  }
  return base;
}

function composeStructuredPrompt(params: { instructions: string; task: string }): string {
  return [
    '### Core Instructions',
    params.instructions.trim(),
    '',
    '### Task Input',
    params.task.trim(),
    '',
    '### Output Requirements',
    'Return a JSON object that exactly matches the schema above. Do not include markdown fences or additional commentary.',
  ].join('\n');
}

function normalizeStageSnapshots(stages?: Array<{ id: string; status: string; summary?: string; blockingReason?: string }>) {
  const snapshot: Record<string, { status: ArcStageStatus; summary?: string; blockingReason?: string; completedAt?: string; startedAt?: string }> = {};
  const nowIso = new Date().toISOString();
  const incoming = stages ?? [];

  for (const stage of ARC_STAGES) {
    const match = incoming.find((item) => item.id === stage.id);
    const status = normalizeStageStatus(match?.status);
    snapshot[stage.id] = {
      status,
      summary: match?.summary,
      blockingReason: match?.blockingReason,
      startedAt: status !== 'idle' ? nowIso : undefined,
      completedAt: status === 'completed' ? nowIso : undefined,
    };
  }

  return snapshot;
}

function normalizeStageStatus(raw?: string): ArcStageStatus {
  if (!raw) return 'idle';
  if (ARC_STAGE_STATUS_SET.has(raw as ArcStageStatus)) {
    return raw as ArcStageStatus;
  }
  switch (raw) {
    case 'in_progress':
    case 'progress':
      return 'in-progress';
    case 'complete':
      return 'completed';
    case 'blocked':
    case 'awaiting_input':
      return 'blocked';
    case 'error':
      return 'failed';
    default:
      return 'idle';
  }
}

function selectCurrentStage(stages: Record<string, { status: ArcStageStatus }>): ArcStageId | null {
  for (const stage of ARC_STAGES) {
    const state = stages[stage.id];
    if (state?.status === 'in-progress' || state?.status === 'blocked') {
      return stage.id as ArcStageId;
    }
  }
  const completed = [...ARC_STAGES].reverse().find((stage) => stages[stage.id]?.status === 'completed');
  return completed ? (completed.id as ArcStageId) : null;
}

function buildAgentMessage(parsed: z.infer<typeof parsedResponseSchema>): string {
  const lines: string[] = [
    '## Reasoning',
    parsed.reasoning,
    '',
    '## Final Answer',
    parsed.finalAnswer,
  ];

  if (parsed.confidence !== undefined) {
    lines.push('', `Confidence: ${(parsed.confidence * 100).toFixed(1)}%`);
  }

  if (parsed.nextAction === 'await_user') {
    lines.push('', '⚠️ Awaiting additional human input to continue.');
  }

  return lines.join('\n');
}

function buildArtifactData(parsed: z.infer<typeof parsedResponseSchema>, raw: string) {
  return {
    reasoning: parsed.reasoning,
    finalAnswer: parsed.finalAnswer,
    answerGrid: parsed.answerGrid,
    confidence: parsed.confidence,
    raw,
  };
}

function capitalizeRole(role: string): string {
  return role.charAt(0).toUpperCase() + role.slice(1);
}
