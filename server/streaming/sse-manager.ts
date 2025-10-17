/*
 * Author: GPT-5 Codex
 * Date: 2025-10-17 and the 16:24 UTC
 * PURPOSE: Provide a reusable SSE manager that applies headers, enriches every payload with task/model
 *          metadata, and maintains heartbeat keepalives so streaming routes can stay DRY while matching
 *          the documented Responses API contract.
 * SRP/DRY check: Pass - Class only handles SSE response orchestration; no provider or business logic.
 */
import type { Response } from "express";

export interface SseStreamManagerOptions {
  taskId: string;
  modelKey: string;
  sessionId: string;
  heartbeatIntervalMs?: number;
}

export class SseStreamManager {
  private readonly res: Response;
  private readonly taskId: string;
  private readonly modelKey: string;
  private readonly sessionId: string;
  private readonly connectedAtIso: string;
  private readonly heartbeatIntervalMs: number;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private closed = false;

  constructor(res: Response, options: SseStreamManagerOptions) {
    this.res = res;
    this.taskId = options.taskId;
    this.modelKey = options.modelKey;
    this.sessionId = options.sessionId;
    this.heartbeatIntervalMs = options.heartbeatIntervalMs ?? 15_000;
    this.connectedAtIso = new Date().toISOString();

    this.applyHeaders();
    this.attachLifecycleHooks();
    this.startHeartbeat();
  }

  get connectedAt(): string {
    return this.connectedAtIso;
  }

  init(additionalPayload: Record<string, unknown> = {}): void {
    this.emit("stream.init", {
      ...additionalPayload,
      connectedAt: this.connectedAtIso,
    });
  }

  status(payload: Record<string, unknown>): void {
    this.emit("stream.status", payload);
  }

  chunk(payload: Record<string, unknown>): void {
    this.emit("stream.chunk", payload);
  }

  error(payload: Record<string, unknown>): void {
    this.emit("stream.error", payload);
    this.close();
  }

  complete(payload: Record<string, unknown>): void {
    this.emit("stream.complete", payload);
    this.close();
  }

  keepalive(): void {
    this.emit("stream.keepalive", { timestamp: Date.now() });
  }

  close(): void {
    if (this.closed) {
      return;
    }
    this.closed = true;
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    if (!this.res.writableEnded) {
      this.res.end();
    }
  }

  private applyHeaders(): void {
    this.res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
      "Access-Control-Allow-Origin": "*",
    });
    if (typeof (this.res as any).flushHeaders === "function") {
      (this.res as any).flushHeaders();
    }
  }

  private attachLifecycleHooks(): void {
    this.res.on("close", () => {
      this.close();
    });
    this.res.on("error", () => {
      this.close();
    });
  }

  private startHeartbeat(): void {
    if (this.heartbeatIntervalMs <= 0) {
      return;
    }
    this.heartbeatTimer = setInterval(() => {
      if (this.closed || this.res.writableEnded) {
        this.close();
        return;
      }
      this.keepalive();
    }, this.heartbeatIntervalMs);
  }

  private emit(event: string, payload: Record<string, unknown>): void {
    if (this.closed || this.res.writableEnded) {
      return;
    }

    const enrichedPayload = {
      ...payload,
      taskId: this.taskId,
      modelKey: this.modelKey,
      sessionId: this.sessionId,
      emittedAt: new Date().toISOString(),
    };

    try {
      this.res.write(`event: ${event}\n`);
      this.res.write(`data: ${JSON.stringify(enrichedPayload)}\n\n`);
    } catch (error) {
      console.error("Failed to write SSE event:", error);
      this.close();
    }
  }
}
