/*
 * Author: GPT-5 Codex
 * Date: 2025-10-17 and the 16:24 UTC
 * PURPOSE: Maintain a TTL-backed registry of pending streaming sessions so the POST→GET handshake
 *          can validate model/task metadata before upgrading to SSE, preventing duplicate launches
 *          and enforcing the new Responses API streaming contract.
 * SRP/DRY check: Pass - File encapsulates handshake session bookkeeping only; confirmed no other
 *                registry implementation exists in the project.
 */
import { randomUUID } from 'crypto';

export interface StreamSessionEntry<TPayload> {
  sessionId: string;
  taskId: string;
  modelKey: string;
  payload: TPayload;
  createdAt: number;
  expiresAt: number;
}

export interface CreateSessionResult {
  sessionId: string;
  taskId: string;
  modelKey: string;
  expiresAt: number;
}

interface SessionAssertion {
  taskId?: string;
  modelKey?: string;
}

export class StreamSessionRegistry<TPayload> {
  private readonly ttlMs: number;
  private readonly sessions = new Map<string, StreamSessionEntry<TPayload>>();

  constructor(ttlMs: number) {
    this.ttlMs = ttlMs;
  }

  createSession(taskId: string, modelKey: string, payload: TPayload, ttlOverrideMs?: number): CreateSessionResult {
    this.cleanupExpired();

    const sessionId = randomUUID();
    const now = Date.now();
    const ttl = ttlOverrideMs ?? this.ttlMs;
    const expiresAt = now + Math.max(ttl, 1_000);

    this.sessions.set(sessionId, {
      sessionId,
      taskId,
      modelKey,
      payload,
      createdAt: now,
      expiresAt
    });

    return { sessionId, taskId, modelKey, expiresAt };
  }

  consumeSession(sessionId: string, assertion?: SessionAssertion): StreamSessionEntry<TPayload> | null {
    const entry = this.sessions.get(sessionId);
    if (!entry) {
      return null;
    }

    const now = Date.now();
    if (entry.expiresAt <= now) {
      this.sessions.delete(sessionId);
      return null;
    }

    if (assertion?.taskId && entry.taskId !== assertion.taskId) {
      return null;
    }
    if (assertion?.modelKey && entry.modelKey !== assertion.modelKey) {
      return null;
    }

    this.sessions.delete(sessionId);
    return entry;
  }

  cleanupExpired(): void {
    const now = Date.now();
    for (const [sessionId, entry] of this.sessions.entries()) {
      if (entry.expiresAt <= now) {
        this.sessions.delete(sessionId);
      }
    }
  }

  size(): number {
    return this.sessions.size;
  }
}
