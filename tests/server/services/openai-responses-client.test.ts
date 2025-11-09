/*
 * Author: gpt-5-codex
 * Date: 2025-11-06T19:40:00Z
 * PURPOSE: Validate the OpenAiResponsesClient wrapper parses structured JSON
 *          payloads and handles error conditions when interacting with the
 *          OpenAI Responses API.
 * SRP/DRY check: Pass - focused unit tests for the OpenAiResponsesClient only.
 */

import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { OpenAiResponsesClient } from '../../../server/services/openai-responses-client';

describe('OpenAiResponsesClient', () => {
  const schema = z.object({
    reasoning: z.string(),
    finalAnswer: z.string(),
    nextAction: z.enum(['await_user', 'continue', 'complete']),
  });

  const schemaDefinition = {
    name: 'test_payload',
    schema: {
      type: 'object',
      properties: {
        reasoning: { type: 'string' },
        finalAnswer: { type: 'string' },
        nextAction: { type: 'string', enum: ['await_user', 'continue', 'complete'] },
      },
      required: ['reasoning', 'finalAnswer', 'nextAction'],
    },
  } as const;

  it('parses JSON from output_text and returns usage metadata', async () => {
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          output_text: '{"reasoning":"step","finalAnswer":"result","nextAction":"complete"}',
          usage: { total_tokens: 321, total_cost: { usd: 0.05 } },
        }),
        { status: 200 },
      ),
    );

    const client = new OpenAiResponsesClient({ apiKey: 'test', fetchFn: fetchMock });
    const result = await client.createJsonResponse({
      model: 'gpt-test',
      prompt: 'Do work',
      schema,
      schemaDefinition,
    });

    expect(result.parsed).toEqual({ reasoning: 'step', finalAnswer: 'result', nextAction: 'complete' });
    expect(result.usage.totalTokens).toBe(321);
    expect(result.usage.costCents).toBe(5);

    const call = fetchMock.mock.calls[0];
    expect(call[0]).toContain('/v1/responses');
    const body = JSON.parse(call[1]?.body as string);
    expect(body.model).toBe('gpt-test');
    expect(body.input).toBe('Do work');
  });

  it('throws a descriptive error when response JSON violates schema', async () => {
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          output_text: '{"reasoning":"oops"}',
        }),
        { status: 200 },
      ),
    );

    const client = new OpenAiResponsesClient({ apiKey: 'test', fetchFn: fetchMock });

    await expect(
      client.createJsonResponse({
        model: 'gpt-test',
        prompt: 'Do work',
        schema,
        schemaDefinition,
      }),
    ).rejects.toThrow(/did not match expected schema/i);
  });

  it('bubbles up HTTP errors with body payload', async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ error: { message: 'bad request' } }), { status: 400 }),
    );

    const client = new OpenAiResponsesClient({ apiKey: 'test', fetchFn: fetchMock });

    await expect(
      client.createJsonResponse({
        model: 'gpt-test',
        prompt: 'Do work',
        schema,
        schemaDefinition,
      }),
    ).rejects.toThrow(/400/);
  });
});
