/*
 * Author: GPT-5 Codex
 * Date: 2025-10-18 00:55 UTC
 * PURPOSE: Align debate streaming routes with the two-stage client contract, providing an init endpoint,
 *          SSE dispatcher, shared streaming logic, and heartbeat keepalives so modern React clients can
 *          consume Responses API streams without premature proxy disconnects while persisting debate turns.
 * SRP/DRY check: Pass - Route module handles debate HTTP concerns only; shared helpers prevent duplication
 *                across init and SSE entry points.
 */
import { Router } from "express";
import { getProviderForModel } from "../providers/index.js";
import { storage } from "../storage.js";
import { StreamSessionRegistry } from "../streaming/session-registry.js";
import { SseStreamManager } from "../streaming/sse-manager.js";
import { StreamHarness } from "../streaming/stream-harness.js";

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
  position: "FOR" | "AGAINST";
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

const STREAM_SESSION_TTL_MS = 5 * 60 * 1000;
const streamSessionRegistry = new StreamSessionRegistry<DebateStreamPayload>(STREAM_SESSION_TTL_MS);

const STORED_DEBATE_PROMPT: { id: string; version: string } = {
  id: "pmpt_6856e018a02c8196aa1ccd7eac56ee020cbd4441b7c750b1",
  version: "2"
};

const VALID_ROLES: DebateRole[] = ["AFFIRMATIVE", "NEGATIVE"];
const VALID_REASONING_EFFORTS = new Set(["minimal", "low", "medium", "high"]);
const VALID_REASONING_SUMMARIES = new Set(["auto", "detailed", "concise"]);
const VALID_REASONING_VERBOSITIES = new Set(["low", "medium", "high"]);

function isStreamingEnabled(): boolean {
  const flagValue =
    process.env.STREAMING_ENABLED ?? process.env.VITE_STREAMING_ENABLED ?? "true";
  const normalized = flagValue.toString().toLowerCase();
  return normalized !== "false" && normalized !== "0";
}

function buildTaskId(payload: DebateStreamPayload): string {
  return `${payload.debateSessionId}:turn-${payload.turnNumber}:model-${payload.modelId}`;
}

function cleanupExpiredStreamSessions(): void {
  streamSessionRegistry.cleanupExpired();
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
  const position: "FOR" | "AGAINST" = role === "AFFIRMATIVE" ? "FOR" : "AGAINST";
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
    position,
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

function buildInputMessages(payload: DebateStreamPayload): Array<{ role: string; content: string }> {
  const { turnNumber, role, position, topic, intensity, opponentMessage } = payload;

  if (turnNumber === 1 || turnNumber === 2) {
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

async function streamDebateTurn(harness: StreamHarness, payload: DebateStreamPayload): Promise<void> {
  try {
    harness.status("validating_session", undefined, {
      debateSessionId: payload.debateSessionId,
      turnNumber: payload.turnNumber
    });

    const debateSession = await storage.getDebateSession(payload.debateSessionId);
    if (!debateSession) {
      harness.error("Debate session not found", "SESSION_NOT_FOUND");
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
    const promptVariables: Record<string, string> = {
      intensity: String(payload.intensity),
      position: payload.position,
      topic: payload.topic,
      role: payload.role,
    };

    harness.status("resolving_provider", undefined, { modelId: payload.modelId });
    let provider;
    try {
      provider = getProviderForModel(payload.modelId);
    } catch (error) {
      console.error("Failed to resolve provider for debate stream:", error);
      harness.error("Provider not found for selected model", "PROVIDER_NOT_FOUND");
      return;
    }

    if (!provider.callModelStreaming) {
      harness.error("Streaming not supported for this provider", "STREAMING_NOT_SUPPORTED");
      return;
    }

    harness.status("provider_ready", undefined, { provider: provider.name });
    harness.status("stream_start", undefined, { provider: provider.name });

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
      prompt: {
        ...STORED_DEBATE_PROMPT,
        variables: promptVariables,
      },
      onStatus: (phase, data) => {
        harness.status(phase, undefined, {
          provider: provider.name,
          ...(data ?? {})
        });
      },
      onReasoningChunk: (chunk: string) => {
        harness.pushReasoning(chunk);
      },
      onContentChunk: (chunk: string) => {
        harness.pushContent(chunk);
      },
      onJsonChunk: (chunk: unknown) => {
        harness.pushJsonChunk(chunk);
      },
      onComplete: async (responseId: string, tokenUsage: any, cost: any, extras) => {
        harness.status("persisting", undefined, { responseId });
        const finalContent = extras?.content ?? harness.getContent();
        const finalReasoning = extras?.reasoning ?? harness.getReasoning();
        const structuredOutput = extras?.structuredOutput ?? harness.getJsonChunks();

        try {
          const turnCostRaw = typeof cost?.total === "number" ? cost.total : Number(cost ?? 0);
          const turnCost = Number.isFinite(turnCostRaw) ? turnCostRaw : 0;
          await storage.updateDebateSession(payload.debateSessionId, {
            turn: payload.turnNumber,
            modelId: payload.modelId,
            content: finalContent,
            reasoning: finalReasoning,
            responseId,
            cost: turnCost,
            costBreakdown: cost,
            tokenUsage,
            structuredOutput,
            summary: finalReasoning
          });
        } catch (error) {
          console.error("Failed to save turn data:", error);
        }

        harness.complete({
          responseId,
          tokenUsage,
          cost,
          responseSummary: finalReasoning,
          metadata: {
            debateSessionId: payload.debateSessionId,
            turnNumber: payload.turnNumber,
            structuredOutput,
            promptVariables
          }
        });
      },
      onError: (error: Error) => {
        harness.error(error);
      }
    });
  } catch (error) {
    console.error("Debate stream error:", error);
    harness.error(error instanceof Error ? error : new Error("Unknown error"));
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
  if (!isStreamingEnabled()) {
    res.status(503).json({ error: "Streaming is disabled by configuration" });
    return;
  }

  try {
    const payload = await prepareStreamPayload(req.body);
    cleanupExpiredStreamSessions();

    const taskId = buildTaskId(payload);
    const modelKey = payload.modelId;
    const { sessionId, expiresAt } = streamSessionRegistry.createSession(taskId, modelKey, payload);

    res.json({
      sessionId,
      taskId,
      modelKey,
      debateSessionId: payload.debateSessionId,
      expiresAt: new Date(expiresAt).toISOString()
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

router.get("/stream/:taskId/:modelKey/:sessionId", async (req, res) => {
  if (!isStreamingEnabled()) {
    res.status(503).json({ error: "Streaming is disabled by configuration" });
    return;
  }

  cleanupExpiredStreamSessions();

  const { taskId, modelKey, sessionId } = req.params;
  const sessionEntry = streamSessionRegistry.consumeSession(sessionId, { taskId, modelKey });

  if (!sessionEntry) {
    res.status(404).json({ error: "Stream session not found or expired" });
    return;
  }

  const manager = new SseStreamManager(res, {
    taskId,
    modelKey,
    sessionId
  });

  const harness = new StreamHarness(manager);
  harness.init({
    debateSessionId: sessionEntry.payload.debateSessionId,
    turnNumber: sessionEntry.payload.turnNumber,
    modelId: sessionEntry.payload.modelId,
    role: sessionEntry.payload.role
  });

  await streamDebateTurn(harness, sessionEntry.payload);
});

router.post("/stream", (_req, res) => {
  res.status(410).json({
    error: "Legacy debate stream endpoint removed",
    message:
      "Use POST /api/debate/stream/init followed by GET /api/debate/stream/:taskId/:modelKey/:sessionId"
  });
});

export { router as debateRoutes };
