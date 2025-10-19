/*
 * Author: GPT-5 Codex
 * Date: 2025-10-17 and the 16:24 UTC
 * PURPOSE: Wrap the SSE manager with domain-aware helpers that buffer reasoning/text/json chunks,
 *          emit normalized stream events, and expose the final aggregates for persistence so debate
 *          streaming can follow the shared modal contract without duplicating glue code.
 * SRP/DRY check: Pass - Harness coordinates streaming metadata only; model invocation stays elsewhere.
 */
import { SseStreamManager } from "./sse-manager.js";

export interface StreamHarnessInitMeta {
  debateSessionId: string;
  turnNumber: number;
  modelId: string;
  role: string;
}

export interface StreamHarnessCompletePayload {
  responseId: string;
  tokenUsage: unknown;
  cost: unknown;
  responseSummary?: unknown;
  metadata?: Record<string, unknown>;
}

interface StreamHarnessState {
  reasoning: string;
  content: string;
  jsonChunks: unknown[];
}

export class StreamHarness {
  private readonly manager: SseStreamManager;
  private readonly state: StreamHarnessState = {
    reasoning: "",
    content: "",
    jsonChunks: [],
  };

  constructor(manager: SseStreamManager) {
    this.manager = manager;
  }

  init(meta: StreamHarnessInitMeta): void {
    this.manager.init({
      debateSessionId: meta.debateSessionId,
      turnNumber: meta.turnNumber,
      modelId: meta.modelId,
      role: meta.role,
    });
  }

  status(phase: string, message?: string, extra: Record<string, unknown> = {}): void {
    this.manager.status({
      phase,
      message,
      ...extra,
    });
  }

  pushReasoning(delta: string): void {
    if (!delta) {
      return;
    }
    this.state.reasoning += delta;
    this.manager.chunk({
      type: "reasoning",
      delta,
      cumulative: this.state.reasoning,
      timestamp: Date.now(),
    });
  }

  pushContent(delta: string): void {
    if (!delta) {
      return;
    }
    this.state.content += delta;
    this.manager.chunk({
      type: "text",
      delta,
      cumulative: this.state.content,
      timestamp: Date.now(),
    });
  }

  pushJsonChunk(json: unknown): void {
    if (json == null) {
      return;
    }
    this.state.jsonChunks.push(json);
    this.manager.chunk({
      type: "json",
      delta: json,
      cumulative: this.state.jsonChunks,
      timestamp: Date.now(),
    });
  }

  error(error: Error | string, code: string = "STREAM_ERROR"): void {
    const message = error instanceof Error ? error.message : error;
    this.manager.error({
      error: message,
      code,
    });
  }

  complete(payload: StreamHarnessCompletePayload): void {
    this.manager.complete({
      responseId: payload.responseId,
      tokenUsage: payload.tokenUsage,
      cost: payload.cost,
      responseSummary: payload.responseSummary,
      metadata: payload.metadata ?? {},
      reasoning: this.state.reasoning,
      content: this.state.content,
      json: this.state.jsonChunks,
    });
  }

  getReasoning(): string {
    return this.state.reasoning;
  }

  getContent(): string {
    return this.state.content;
  }

  getJsonChunks(): unknown[] {
    return [...this.state.jsonChunks];
  }
}
