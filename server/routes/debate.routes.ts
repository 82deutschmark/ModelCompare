/*
 * Author: GPT-5 Codex
 * Date: 2025-10-17 18:14 UTC
 * PURPOSE: Align debate streaming routes with the two-stage client contract, providing an init endpoint,
 *          SSE dispatcher, shared streaming logic, and heartbeat keepalives so modern React clients can
 *          consume Responses API streams without premature proxy disconnects while persisting debate turns.
 * SRP/DRY check: Pass - Route module handles debate HTTP concerns only; shared helpers prevent duplication
 *                across init, SSE, and legacy entry points.
 */
import { Router } from "express";
import type { Response } from "express";
import { randomUUID } from "crypto";
import { getProviderForModel } from "../providers/index.js";
import { storage } from "../storage.js";

const router = Router();

class HttpError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = "HttpError";
    this.statusCode = statusCode;
  }
}

type DebateRole = "AFFIRMATIVE" | "NEGATIVE";

interface DebateStreamPayload {
  modelId: string;
  topic: string;
  role: DebateRole;
  intensity: number;
  opponentMessage: string | null;
  previousResponseId: string | null;
  turnNumber: number;
  reasoningEffort: "low" | "medium" | "high";
  reasoningSummary: "auto" | "detailed";
  reasoningVerbosity: "low" | "medium" | "high";
  temperature: number;
  maxTokens: number;
  debateSessionId: string;
  model1Id: string;
  model2Id: string;
}

interface PendingStreamJob {
  createdAt: number;
  payload: DebateStreamPayload;
}

const STREAM_SESSION_TTL_MS = 5 * 60 * 1000;
const pendingStreamJobs = new Map<string, PendingStreamJob>();

const VALID_ROLES: DebateRole[] = ["AFFIRMATIVE", "NEGATIVE"];
const VALID_REASONING_EFFORTS = new Set(["minimal", "low", "medium", "high"]);
const VALID_REASONING_SUMMARIES = new Set(["auto", "detailed", "concise"]);
const VALID_REASONING_VERBOSITIES = new Set(["low", "medium", "high"]);

function cleanupExpiredStreamJobs(): void {
  const now = Date.now();
  for (const [key, job] of pendingStreamJobs.entries()) {
    if (now - job.createdAt > STREAM_SESSION_TTL_MS) {
      pendingStreamJobs.delete(key);
    }
  }
}

function ensureString(value: unknown, fieldName: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new HttpError(`${fieldName} is required`, 400);
  }
  return value.trim();
}

function ensureNumber(value: unknown, fieldName: string): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) {
    throw new HttpError(`${fieldName} must be a number`, 400);
  }
  return parsed;
}

function normalizeRole(value: unknown): DebateRole {
  if (typeof value !== "string") {
    throw new HttpError("role is required", 400);
  }
  const upper = value.toUpperCase();
  if (!VALID_ROLES.includes(upper as DebateRole)) {
    throw new HttpError("role must be AFFIRMATIVE or NEGATIVE", 400);
  }
  return upper as DebateRole;
}

function normalizeReasoningEffort(value: unknown): "low" | "medium" | "high" {
  if (typeof value !== "string") {
    return "medium";
  }
  const normalized = value.toLowerCase();
  if (!VALID_REASONING_EFFORTS.has(normalized)) {
    return "medium";
  }
  if (normalized === "minimal") {
    return "low";
  }
  return (normalized as "low" | "medium" | "high") || "medium";
}

function normalizeReasoningSummary(value: unknown): "auto" | "detailed" {
  if (typeof value !== "string") {
    return "detailed";
  }
  const normalized = value.toLowerCase();
  if (!VALID_REASONING_SUMMARIES.has(normalized)) {
    return "detailed";
  }
  if (normalized === "concise") {
    return "auto";
  }
  return (normalized as "auto" | "detailed") || "detailed";
}

function normalizeReasoningVerbosity(value: unknown): "low" | "medium" | "high" {
  if (typeof value !== "string") {
    return "high";
  }
  const normalized = value.toLowerCase();
  if (!VALID_REASONING_VERBOSITIES.has(normalized)) {
    return "high";
  }
  return normalized as "low" | "medium" | "high";
}

function normalizeTemperature(value: unknown): number {
  if (value === null || value === undefined) {
    return 0.7;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return 0.7;
  }
  return Math.min(Math.max(parsed, 0), 2);
}

function normalizeMaxTokens(value: unknown): number {
  if (value === null || value === undefined) {
    return 16384;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 16384;
  }
  return Math.floor(parsed);
}

async function resolveDebateSessionId(params: {
  sessionId?: string;
  turnNumber: number;
  topic: string;
  model1Id: string;
  model2Id: string;
  intensity: number;
}): Promise<string> {
  const { sessionId, turnNumber, topic, model1Id, model2Id, intensity } = params;

  if (sessionId) {
    const existing = await storage.getDebateSession(sessionId);
    if (!existing) {
      throw new HttpError("Debate session not found", 404);
    }
    return sessionId;
  }

  if (turnNumber !== 1) {
    throw new HttpError("Session ID required for continuing debates", 400);
  }

  try {
    const debateSession = await storage.createDebateSession({
      topicText: topic,
      model1Id,
      model2Id,
      adversarialLevel: intensity,
      turnHistory: [],
      model1ResponseIds: [],
      model2ResponseIds: []
    });
    return debateSession.id;
  } catch (error) {
    console.error("Failed to create debate session:", error);
    throw new HttpError("Failed to create debate session", 500);
  }
}

async function prepareStreamPayload(body: any): Promise<DebateStreamPayload> {
  if (!body) {
    throw new HttpError("Request body is required", 400);
  }

  const modelId = ensureString(body.modelId, "modelId");
  const topic = ensureString(body.topic, "topic");
  const role = normalizeRole(body.role);
  const intensity = ensureNumber(body.intensity, "intensity");
  const turnNumber = ensureNumber(body.turnNumber, "turnNumber");
  const model1Id = ensureString(body.model1Id, "model1Id");
  const model2Id = ensureString(body.model2Id, "model2Id");

  const debateSessionId = await resolveDebateSessionId({
    sessionId: typeof body.sessionId === "string" ? body.sessionId : undefined,
    turnNumber,
    topic,
    model1Id,
    model2Id,
    intensity
  });

  const opponentMessage =
    typeof body.opponentMessage === "string" && body.opponentMessage.trim().length > 0
      ? body.opponentMessage
      : null;
  const previousResponseId =
    typeof body.previousResponseId === "string" && body.previousResponseId.trim().length > 0
      ? body.previousResponseId.trim()
      : null;

  return {
    modelId,
    topic,
    role,
    intensity,
    opponentMessage,
    previousResponseId,
    turnNumber,
    reasoningEffort: normalizeReasoningEffort(body.reasoningEffort),
    reasoningSummary: normalizeReasoningSummary(body.reasoningSummary),
    reasoningVerbosity: normalizeReasoningVerbosity(body.reasoningVerbosity),
    temperature: normalizeTemperature(body.temperature),
    maxTokens: normalizeMaxTokens(body.maxTokens),
    debateSessionId,
    model1Id,
    model2Id
  };
}

function setSseHeaders(res: Response): void {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "Access-Control-Allow-Origin": "*"
  });
  if (typeof (res as any).flushHeaders === "function") {
    (res as any).flushHeaders();
  }
}

function emitSse(res: Response, event: string, data: Record<string, unknown>): void {
  if (res.writableEnded) {
    return;
  }
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

function buildInputMessages(payload: DebateStreamPayload): Array<{ role: string; content: string }> {
  const { turnNumber, role, topic, intensity, opponentMessage } = payload;

  if (turnNumber === 1 || turnNumber === 2) {
    const position = role === "AFFIRMATIVE" ? "FOR" : "AGAINST";
    const systemPrompt = `You are the ${role} debater ${position} the proposition: "${topic}".
Present your opening argument following Robert's Rules of Order.
Adversarial intensity level: ${intensity}.`;
    return [{ role: "user", content: systemPrompt }];
  }

  const rebuttalPrompt = `Your opponent just argued: "${opponentMessage ?? ""}"

Respond as the ${role} debater:
1. Address your opponent's specific points
2. Refute their arguments with evidence and logic
3. Strengthen your own position
4. Use adversarial intensity level: ${intensity}`;

  return [{ role: "user", content: rebuttalPrompt }];
}

async function streamDebateTurn(res: Response, payload: DebateStreamPayload): Promise<void> {
  let aggregatedReasoning = "";
  let aggregatedContent = "";
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

  const stopHeartbeat = () => {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
  };

  res.on("close", stopHeartbeat);

  try {
    const debateSession = await storage.getDebateSession(payload.debateSessionId);
    if (!debateSession) {
      stopHeartbeat();
      emitSse(res, "stream.error", { error: "Debate session not found" });
      res.end();
      return;
    }

    let actualPreviousResponseId = payload.previousResponseId ?? null;

    if (payload.turnNumber > 2) {
      const isModel1 = payload.modelId === debateSession.model1Id;
      const responseIds = (isModel1
        ? (debateSession.model1ResponseIds as string[])
        : (debateSession.model2ResponseIds as string[])) || [];
      actualPreviousResponseId = responseIds[responseIds.length - 1] || null;
    }

    const inputMessages = buildInputMessages(payload);

    let provider;
    try {
      provider = getProviderForModel(payload.modelId);
    } catch (error) {
      console.error("Failed to resolve provider for debate stream:", error);
      emitSse(res, "stream.error", { error: "Provider not found for selected model" });
      res.end();
      return;
    }

    if (!provider.callModelStreaming) {
      stopHeartbeat();
      emitSse(res, "stream.error", { error: "Streaming not supported for this provider" });
      res.end();
      return;
    }

    heartbeatTimer = setInterval(() => {
      if (res.writableEnded) {
        stopHeartbeat();
        return;
      }
      emitSse(res, "stream.keepalive", { timestamp: Date.now() });
    }, 15_000);

    await provider.callModelStreaming({
      modelId: payload.modelId,
      messages: inputMessages,
      previousResponseId: actualPreviousResponseId || undefined,
      temperature: payload.temperature,
      maxTokens: payload.maxTokens,
      reasoningConfig: {
        effort: payload.reasoningEffort,
        summary: payload.reasoningSummary,
        verbosity: payload.reasoningVerbosity
      },
      onReasoningChunk: (chunk: string) => {
        aggregatedReasoning += chunk;
        emitSse(res, "stream.chunk", {
          type: "reasoning",
          delta: chunk,
          timestamp: Date.now()
        });
      },
      onContentChunk: (chunk: string) => {
        aggregatedContent += chunk;
        emitSse(res, "stream.chunk", {
          type: "text",
          delta: chunk,
          timestamp: Date.now()
        });
      },
      onComplete: async (responseId: string, tokenUsage: any, cost: any, content?: string, reasoning?: string) => {
        stopHeartbeat();
        const finalContent = content ?? aggregatedContent;
        const finalReasoning = reasoning ?? aggregatedReasoning;

        try {
          const turnCost = Number(cost?.total ?? 0);
          await storage.updateDebateSession(payload.debateSessionId, {
            turn: payload.turnNumber,
            modelId: payload.modelId,
            content: finalContent,
            reasoning: finalReasoning,
            responseId,
            cost: turnCost
          });
        } catch (error) {
          console.error("Failed to save turn data:", error);
        }

        emitSse(res, "stream.complete", {
          responseId,
          tokenUsage,
          cost,
          sessionId: payload.debateSessionId
        });
        res.end();
      },
      onError: (error: Error) => {
        stopHeartbeat();
        emitSse(res, "stream.error", { error: error.message });
        res.end();
      }
    });

    stopHeartbeat();
  } catch (error) {
    stopHeartbeat();
    console.error("Debate stream error:", error);
    emitSse(res, "stream.error", {
      error: error instanceof Error ? error.message : "Unknown error"
    });
    res.end();
  }
}

router.get("/sessions", async (req, res) => {
  try {
    // For now, return empty array - in a real implementation, this would list user's debate sessions
    // const sessions = await storage.getDebateSessions(); // Would need to add this method
    res.json([]);
  } catch (error) {
    console.error("Failed to get debate sessions:", error);
    res.status(500).json({ error: "Failed to get debate sessions" });
  }
});

// POST /api/debate/session - Create new debate session
router.post("/session", async (req, res) => {
  try {
    const { topic, model1Id, model2Id, adversarialLevel } = req.body;

    if (!topic || !model1Id || !model2Id || adversarialLevel == null) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const debateSession = await storage.createDebateSession({
      topicText: topic,
      model1Id: model1Id,
      model2Id: model2Id,
      adversarialLevel: adversarialLevel,
      turnHistory: [],
      model1ResponseIds: [],
      model2ResponseIds: []
    });

    res.json({
      id: debateSession.id,
      topic: debateSession.topicText,
      model1Id: debateSession.model1Id,
      model2Id: debateSession.model2Id,
      adversarialLevel: debateSession.adversarialLevel,
      createdAt: debateSession.createdAt
    });
  } catch (error) {
    console.error("Failed to create debate session:", error);
    res.status(500).json({ error: "Failed to create debate session" });
  }
});

// GET /api/debate/session/:id - Get specific debate session
router.get("/session/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const session = await storage.getDebateSession(id);

    if (!session) {
      return res.status(404).json({ error: "Debate session not found" });
    }

    res.json({
      id: session.id,
      topic: session.topicText,
      model1Id: session.model1Id,
      model2Id: session.model2Id,
      adversarialLevel: session.adversarialLevel,
      turnHistory: session.turnHistory,
      model1ResponseIds: session.model1ResponseIds,
      model2ResponseIds: session.model2ResponseIds,
      totalCost: session.totalCost,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt
    });
  } catch (error) {
    console.error("Failed to get debate session:", error);
    res.status(500).json({ error: "Failed to get debate session" });
  }
});

router.post("/stream/init", async (req, res) => {
  try {
    const payload = await prepareStreamPayload(req.body);
    cleanupExpiredStreamJobs();

    const streamId = `debate-stream-${randomUUID()}`;
    pendingStreamJobs.set(streamId, {
      createdAt: Date.now(),
      payload
    });

    res.json({
      sessionId: streamId,
      debateSessionId: payload.debateSessionId
    });
  } catch (error) {
    const statusCode = error instanceof HttpError ? error.statusCode : 500;
    const message = error instanceof Error ? error.message : "Failed to initialize debate stream";
    if (!(error instanceof HttpError)) {
      console.error("Failed to initialize debate stream:", error);
    }
    res.status(statusCode).json({ error: message });
  }
});

router.get("/stream/:streamId", async (req, res) => {
  cleanupExpiredStreamJobs();

  const streamId = req.params.streamId;
  const pendingJob = pendingStreamJobs.get(streamId);

  if (!pendingJob) {
    res.status(404).json({ error: "Stream session not found or expired" });
    return;
  }

  pendingStreamJobs.delete(streamId);

  setSseHeaders(res);
  emitSse(res, "stream.init", {
    debateSessionId: pendingJob.payload.debateSessionId,
    turnNumber: pendingJob.payload.turnNumber,
    modelId: pendingJob.payload.modelId
  });

  await streamDebateTurn(res, pendingJob.payload);
});

// POST /api/debate/stream - Streaming debate with reasoning (legacy single-call flow)
router.post("/stream", async (req, res) => {
  try {
    const payload = await prepareStreamPayload(req.body);
    setSseHeaders(res);
    emitSse(res, "stream.init", {
      debateSessionId: payload.debateSessionId,
      turnNumber: payload.turnNumber,
      modelId: payload.modelId
    });
    await streamDebateTurn(res, payload);
  } catch (error) {
    const statusCode = error instanceof HttpError ? error.statusCode : 500;
    const message = error instanceof Error ? error.message : "Failed to start debate stream";
    if (res.headersSent) {
      emitSse(res, "stream.error", { error: message });
      res.end();
      return;
    }
    if (!(error instanceof HttpError)) {
      console.error("Debate stream error:", error);
    }
    res.status(statusCode).json({ error: message });
  }
});

export { router as debateRoutes };
