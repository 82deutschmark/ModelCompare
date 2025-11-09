/*
 * Author: gpt-5-codex
 * Date: 2025-11-06T19:44:00Z
 * PURPOSE: Ensure the ARC executor integrates with the OpenAI Responses client
 *          and maps structured payloads into the AgentRunResponse shape.
 * SRP/DRY check: Pass - validates ARC SDK runner behaviour without re-testing
 *                storage internals or HTTP plumbing.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ArcRun, ArcMessage } from '@shared/schema';
import { runArcAgentWithSdk } from '../../../server/arc/openai-sdk-runner';
import { storage } from '../../../server/storage';
import {
  OpenAiResponsesClient,
  setOpenAiResponsesClient,
} from '../../../server/services/openai-responses-client';

describe('runArcAgentWithSdk', () => {
  const run: ArcRun = {
    id: 'arc-run-1',
    taskId: 'task-123',
    challengeName: 'Colour Transform',
    puzzleDescription: 'Transform grid based on colour pattern.',
    puzzlePayload: { grid: [[1, 0], [0, 1]] },
    targetPatternSummary: null,
    evaluationFocus: null,
    status: 'pending',
    currentStageId: null,
    stages: {},
    totalCostCents: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    completedAt: null,
  };

  const messages: ArcMessage[] = [
    {
      id: 'msg-1',
      runId: 'arc-run-1',
      role: 'assistant',
      stageId: null,
      agentId: null,
      content: 'Previous insight',
      reasoning: null,
      metadata: null,
      createdAt: new Date(),
    },
  ];

  beforeEach(() => {
    vi.spyOn(storage, 'getArcMessages').mockResolvedValue(messages);
    const fakeClient = {
      createJsonResponse: vi.fn().mockResolvedValue({
        parsed: {
          reasoning: 'Analysed puzzle.',
          finalAnswer: 'Answer produced.',
          nextAction: 'complete',
          stages: [
            { id: 'puzzle-intake', status: 'completed', summary: 'Loaded puzzle' },
            { id: 'solution-synthesis', status: 'in-progress', summary: 'Drafting solution' },
          ],
        },
        rawText: '{"reasoning":"Analysed puzzle."}',
        usage: { costCents: 9 },
      }),
    } satisfies Partial<OpenAiResponsesClient>;

    setOpenAiResponsesClient(fakeClient as OpenAiResponsesClient);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    setOpenAiResponsesClient(null);
  });

  it('returns agent response with merged stage snapshots and cost data', async () => {
    const response = await runArcAgentWithSdk({
      run,
      options: { model: 'openai/gpt-test', maxTurns: 4 },
    });

    expect(response.status).toBe('completed');
    expect(response.currentStageId).toBe('solution-synthesis');
    expect(response.costCents).toBe(9);
    expect(response.messages?.[0].content).toContain('## Reasoning');
    expect(response.artifacts?.[0].data).toMatchObject({ finalAnswer: 'Answer produced.' });
  });
});
