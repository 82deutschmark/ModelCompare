/*
 * Author: GPT-5 Codex
 * Date: 2025-10-18 01:05 UTC
 * PURPOSE: Verify the debate streaming handshake persists SSE semantics, rejects legacy routes, and
 *          stores debate turns using the in-memory storage fallback with a mocked provider stream.
 * SRP/DRY check: Pass - Focused on router-level integration; reuses production router and storage modules
 *                while isolating external providers via targeted mocks.
 */

import { beforeAll, afterAll, describe, expect, test, vi } from 'vitest';
import express from 'express';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';

const providersModulePath = vi.hoisted(() => new URL('../../server/providers/index.ts', import.meta.url).href);

const providerStreamMock = vi.fn(async ({
  onStatus,
  onReasoningChunk,
  onContentChunk,
  onComplete
}: any) => {
  onStatus?.('provider_ready', { provider: 'MockProvider' });
  await new Promise(resolve => setTimeout(resolve, 5));
  onReasoningChunk('Mock reasoning.');
  await new Promise(resolve => setTimeout(resolve, 5));
  onContentChunk('Mock content.');
  await new Promise(resolve => setTimeout(resolve, 5));
  onComplete(
    'resp_mock',
    {
      input_tokens: 12,
      output_tokens: 24,
      output_tokens_details: { reasoning_tokens: 6 }
    },
    { total: 0.04, input: 0.02, output: 0.02 },
    {
      content: 'Mock content.',
      reasoning: 'Mock reasoning.',
      structuredOutput: { verdict: 'mock' }
    }
  );
});

vi.mock(providersModulePath, () => ({
  __esModule: true,
  getProviderForModel: vi.fn(() => ({
    name: 'MockProvider',
    callModelStreaming: providerStreamMock
  }))
}));

const debateRoutesModulePath = new URL('../../server/routes/debate.routes.ts', import.meta.url).href;
const storageModulePath = new URL('../../server/storage.ts', import.meta.url).href;

let server: import('node:http').Server | null = null;
let baseUrl = '';
let debateRoutes: typeof import('../../server/routes/debate.routes') extends { debateRoutes: infer T } ? T : never;
let storage: typeof import('../../server/storage');

beforeAll(async () => {
  const [routesModule, storageModule] = await Promise.all([
    import(debateRoutesModulePath),
    import(storageModulePath)
  ]);
  debateRoutes = routesModule.debateRoutes;
  storage = storageModule;

  const app = express();
  app.use(express.json());
  app.use('/api/debate', debateRoutes);

  server = app.listen(0);
  await once(server, 'listening');
  const address = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${address.port}`;
});

afterAll(async () => {
  if (server) {
    await new Promise<void>((resolve, reject) => {
      server!.close(error => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }
});

describe('Debate streaming handshake', () => {
  test('streams via SSE and persists turn data', async () => {
    const createSessionResponse = await fetch(`${baseUrl}/api/debate/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        topic: 'AI ethics in autonomous vehicles',
        model1Id: 'gpt-4o-mini-2024-07-18',
        model2Id: 'gpt-4o-mini-2024-07-18',
        adversarialLevel: 3
      })
    });
    expect(createSessionResponse.status).toBe(200);
    const sessionInfo = await createSessionResponse.json();
    expect(sessionInfo).toHaveProperty('id');

    const initResponse = await fetch(`${baseUrl}/api/debate/stream/init`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        modelId: 'gpt-4o-mini-2024-07-18',
        topic: 'AI ethics in autonomous vehicles',
        role: 'AFFIRMATIVE',
        intensity: 3,
        opponentMessage: null,
        previousResponseId: null,
        turnNumber: 1,
        reasoningEffort: 'high',
        reasoningSummary: 'detailed',
        reasoningVerbosity: 'high',
        temperature: 0.2,
        maxTokens: 256,
        sessionId: sessionInfo.id,
        model1Id: sessionInfo.model1Id,
        model2Id: sessionInfo.model2Id
      })
    });

    expect(initResponse.status).toBe(200);
    const initPayload = await initResponse.json();
    expect(initPayload).toMatchObject({
      sessionId: expect.any(String),
      taskId: expect.any(String),
      modelKey: expect.any(String)
    });

    const { sessionId, taskId, modelKey } = initPayload;
    const streamResponse = await fetch(
      `${baseUrl}/api/debate/stream/${encodeURIComponent(taskId)}/${encodeURIComponent(modelKey)}/${encodeURIComponent(sessionId)}`,
      { method: 'GET' }
    );
    expect(streamResponse.status).toBe(200);
    expect(streamResponse.headers.get('content-type')).toContain('text/event-stream');

    const reader = streamResponse.body?.getReader();
    expect(reader).toBeTruthy();

    const decoder = new TextDecoder();
    const events: Array<{ event: string; data: any }> = [];
    let buffer = '';
    let completeReceived = false;

    while (!completeReceived && reader) {
      const { value, done } = await reader.read();
      if (done) {
        break;
      }
      buffer += decoder.decode(value, { stream: true });
      let boundary = buffer.indexOf('\n\n');
      while (boundary !== -1) {
        const rawEvent = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);
        if (rawEvent.trim().length > 0) {
          const lines = rawEvent.split('\n');
          const eventLine = lines.find(line => line.startsWith('event:')) ?? '';
          const dataLine = lines.find(line => line.startsWith('data:')) ?? '';
          const eventName = eventLine.replace('event:', '').trim();
          const payloadText = dataLine.replace('data:', '').trim();
          const payload = payloadText ? JSON.parse(payloadText) : null;
          events.push({ event: eventName, data: payload });
          if (eventName === 'stream.complete') {
            completeReceived = true;
          }
        }
        boundary = buffer.indexOf('\n\n');
      }
    }

    expect(events.some(evt => evt.event === 'stream.init')).toBe(true);
    expect(events.some(evt => evt.event === 'stream.chunk')).toBe(true);
    expect(events.some(evt => evt.event === 'stream.complete')).toBe(true);
    const statusEvent = events.find(evt => evt.event === 'stream.status');
    expect(statusEvent?.data?.phase).toBeDefined();

    expect(providerStreamMock).toHaveBeenCalledTimes(1);

    const persisted = await storage.storage.getDebateSession(sessionInfo.id);
    expect(persisted).toBeTruthy();
    expect(Array.isArray(persisted.turnHistory)).toBe(true);
    expect(persisted.turnHistory).toHaveLength(1);
    expect(persisted.turnHistory[0].content).toContain('Mock content');

    const reuseResponse = await fetch(
      `${baseUrl}/api/debate/stream/${encodeURIComponent(taskId)}/${encodeURIComponent(modelKey)}/${encodeURIComponent(sessionId)}`
    );
    expect(reuseResponse.status).toBe(404);
  });

  test('legacy POST /api/debate/stream returns 410 with guidance', async () => {
    const response = await fetch(`${baseUrl}/api/debate/stream`, { method: 'POST' });
    expect(response.status).toBe(410);
    const payload = await response.json();
    expect(payload.error).toContain('Legacy debate stream endpoint removed');
    expect(payload.message).toContain('/api/debate/stream/init');
  });
});
