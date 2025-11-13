/*
 * Author: gpt-5-codex
 * Date: 2025-11-06T19:46:00Z
 * PURPOSE: Verify the Luigi orchestrator SDK runner composes structured prompts
 *          and translates OpenAI responses into the Luigi agent contract.
 * SRP/DRY check: Pass - test isolates Luigi SDK runner behaviour without
 *                touching unrelated modules.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { LuigiRun, LuigiMessage } from '@shared/schema';
import { runLuigiOrchestratorWithSdk } from '../../../server/luigi/openai-sdk-runner';
import { storage } from '../../../server/storage';
import {
  OpenAiResponsesClient,
  setOpenAiResponsesClient,
} from '../../../server/services/openai-responses-client';

describe('runLuigiOrchestratorWithSdk', () => {
  const run: LuigiRun = {
    id: 'luigi-run-1',
    missionName: 'Stabilise Reactor',
    objective: 'Restore containment',
    constraints: null,
    successCriteria: null,
    stakeholderNotes: null,
    userPrompt: 'Stabilise the energy output within safe margins.',
    status: 'running',
    currentStageId: null,
    stages: {},
    totalCostCents: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    completedAt: null,
  };

  const messages: LuigiMessage[] = [
    {
      id: 'luigi-msg-1',
      runId: 'luigi-run-1',
      role: 'user',
      stageId: null,
      agentId: null,
      toolName: null,
      content: 'Please report on containment status.',
      reasoning: null,
      metadata: null,
      createdAt: new Date(),
    },
  ];

  beforeEach(() => {
    vi.spyOn(storage, 'getLuigiMessages').mockResolvedValue(messages);
    const fakeClient = {
      createJsonResponse: vi.fn().mockResolvedValue({
        parsed: {
          briefingMarkdown: '## Stage Progress\n- Start-Time Task: On track',
          stageUpdates: {
            'start-time-task': { status: 'completed', summary: 'Initialisation complete' },
            diagnostics: { status: 'in-progress', summary: 'Analysing reactor stability' },
          },
          requiredInputs: ['Confirm backup generator availability'],
          risks: ['Thermal runaway if coolant fails'],
          nextAction: 'await_user',
        },
        rawText: '{"briefingMarkdown":"## Stage Progress"}',
        usage: { costCents: 12 },
      }),
    } satisfies Partial<OpenAiResponsesClient>;

    setOpenAiResponsesClient(fakeClient as OpenAiResponsesClient);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    setOpenAiResponsesClient(null);
  });

  it('maps structured orchestrator response into agent runner contract', async () => {
    const response = await runLuigiOrchestratorWithSdk({
      run,
      options: { model: 'openai/gpt-test', maxTurns: 3 },
    });

    expect(response.nextAction).toBe('await_user');
    expect(response.costCents).toBe(12);
    expect(response.messages?.[0].content).toContain('## Key Risks');
    expect(response.artifacts?.[0].data).toMatchObject({ requiredInputs: ['Confirm backup generator availability'] });
    expect(response.stageSnapshots?.diagnostics?.status).toBe('in-progress');
  });
});
