/*
 * Author: gpt-5-codex
 * Date: 2025-10-22 01:19 UTC
 * PURPOSE: Align debate streaming routes with the two-stage client contract, providing an init endpoint,
 *          SSE dispatcher, shared streaming logic, heartbeat keepalives, and resilient asset loading so
 *          modern React clients can consume Responses API streams without premature proxy disconnects while
 *          persisting debate turns.
 * SRP/DRY check: Pass - Route module handles debate HTTP concerns only; shared helpers prevent duplication
 *                across init and SSE entry points, including prompt asset resolution.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { Router } from "express";
import {
  extractDebateInstructions,
  formatDebateTemplate,
  getDebateIntensityDescriptor,
  type DebateInstructions,
} from "@shared/debate-instructions.ts";
import { getProviderForModel } from "../providers/index.js";
import { storage } from "../storage.js";
import { StreamSessionRegistry } from "../streaming/session-registry.js";
import { SseStreamManager } from "../streaming/sse-manager.js";
import { StreamHarness } from "../streaming/stream-harness.js";

const router = Router();

const DEBATE_PROMPTS_PATH = path.resolve(
  process.cwd(),
  "client",
  "public",
  "docs",
  "debate-prompts.md",
);

let cachedDebateInstructions: DebateInstructions | null = null;
let debateInstructionsLoadErrorLogged = false;

function loadDebateInstructions(): DebateInstructions | null {
  if (cachedDebateInstructions) {
    return cachedDebateInstructions;
  }

  try {
    const markdown = readFileSync(DEBATE_PROMPTS_PATH, "utf-8");
    cachedDebateInstructions = extractDebateInstructions(markdown);
    return cachedDebateInstructions;
  } catch (error) {
    if (!debateInstructionsLoadErrorLogged) {
      console.error(
        `Failed to load debate prompts markdown at ${DEBATE_PROMPTS_PATH}:`,
        error,
      );
      debateInstructionsLoadErrorLogged = true;
    }
    return null;
  }
}

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
  intensityLevel: number;
  intensityGuidance: string;
  intensityHeading: string;
  intensityLabel: string;
  intensitySummary: string;
  intensityFullText: string;
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
  version: "4"
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
  intensityLevel: number;
}): Promise<string> {
  const { sessionId, turnNumber, topic, model1Id, model2Id, intensityLevel } = params;

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
      adversarialLevel: intensityLevel,
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

function sanitizeText(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim();
}

async function prepareStreamPayload(body: any): Promise<DebateStreamPayload> {
  if (!body) {
    throw new HttpError("Request body is required", 400);
  }

  const modelId = ensureString(body.modelId, "modelId");
  const topic = ensureString(body.topic, "topic");
  const role = normalizeRole(body.role);
  const position: "FOR" | "AGAINST" = role === "AFFIRMATIVE" ? "FOR" : "AGAINST";
  const rawIntensity = body.intensityLevel ?? body.intensity;
  const intensityLevel = ensureNumber(rawIntensity, "intensityLevel");
  const turnNumber = ensureNumber(body.turnNumber, "turnNumber");
  const model1Id = ensureString(body.model1Id, "model1Id");
  const model2Id = ensureString(body.model2Id, "model2Id");
  const intensityGuidance = sanitizeText(body.intensityGuidance);
  const intensityHeading = sanitizeText(body.intensityHeading);
  const intensityLabel = sanitizeText(body.intensityLabel);
  const intensitySummary = sanitizeText(body.intensitySummary);
  const intensityFullText = sanitizeText(body.intensityFullText);

  const debateSessionId = await resolveDebateSessionId({
    sessionId: typeof body.sessionId === "string" ? body.sessionId : undefined,
    turnNumber,
    topic,
    model1Id,
    model2Id,
    intensityLevel
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
    intensityLevel,
    intensityGuidance,
    intensityHeading,
    intensityLabel,
    intensitySummary,
    intensityFullText,
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

interface DebatePromptContext {
  messages: Array<{ role: string; content: string }>;
  intensityValue: string;
  intensityGuidance: string;
  intensityHeading: string;
  intensityLabel: string;
  intensityLevel: string;
  intensitySummary: string;
}

function formatOpponentQuote(message: string | null): string {
  const trimmed = message?.trim();
  if (!trimmed) {
    return "";
  }
  return `Opponent's latest statement:\n"""\n${trimmed}\n"""\n\n`;
}

function describeSupport(position: "FOR" | "AGAINST"): { verb: string; outcome: string } {
  if (position === "FOR") {
    return { verb: "support", outcome: "should be adopted" };
  }
  return { verb: "oppose", outcome: "should be rejected" };
}

function buildOpeningInstruction(payload: DebateStreamPayload, intensityHeading: string): string {
  const { verb } = describeSupport(payload.position);
  return `Present your opening argument following Robert's Rules of Order. Explain why the proposition "${payload.topic}" should ${verb}. Maintain the ${intensityHeading} adversarial guidance provided in the developer message.`;
}

function buildRebuttalInstruction(payload: DebateStreamPayload, intensityHeading: string): string {
  const { outcome } = describeSupport(payload.position);
  const opponentSection = formatOpponentQuote(payload.opponentMessage);
  return `${opponentSection}Deliver a rebuttal that:
1. Addresses your opponent's specific claims.
2. Refutes their arguments with evidence and logic.
3. Reinforces why the proposition "${payload.topic}" ${outcome}.
4. Maintains the ${intensityHeading} adversarial guidance provided in the developer message.`;
}

function buildPromptContext(
  payload: DebateStreamPayload,
  instructions: DebateInstructions | null,
): DebatePromptContext {
  const descriptor = getDebateIntensityDescriptor(instructions, payload.intensityLevel);
  const intensityLevel = String(payload.intensityLevel);
  const intensityHeading = payload.intensityHeading || descriptor?.heading || `Level ${intensityLevel}`;
  const intensityLabel = payload.intensityLabel || descriptor?.label || intensityHeading;
  const intensitySummary = payload.intensitySummary || descriptor?.summary || "";
  const descriptorGuidance = descriptor?.guidance?.trim() ?? "";
  const providedGuidance = payload.intensityGuidance || "";
  const intensityGuidance = providedGuidance || descriptorGuidance;
  const descriptorFullText = descriptor?.fullText ?? (descriptorGuidance ? `${intensityHeading}\n${descriptorGuidance}` : intensityHeading);
  const providedFullText = payload.intensityFullText || "";
  const intensityValue = providedFullText || descriptorFullText;

  const developerSections = [
    "You are engaged in a debate with another LLM. The debate follows standard parliamentary procedure. You are ethically obligated to provide the best defense for your position. Your opponent will attempt to sway you and the jury; you must stick to your position and convictions.",
  ];

  if (intensityGuidance) {
    developerSections.push(`Adversarial intensity guidance:\n${intensityGuidance}`);
  } else if (descriptorFullText) {
    developerSections.push(`Adversarial intensity guidance:\n${descriptorFullText}`);
  } else {
    developerSections.push(`Adversarial intensity level: ${intensityLevel}`);
  }

  const baseTemplate = instructions?.baseTemplate?.trim() ||
    `You are the {role} debater arguing {position} the proposition: "{topic}". Maintain the adversarial guidance provided: {intensity}.`;

  const systemMessage = formatDebateTemplate(baseTemplate, {
    role: payload.role,
    position: payload.position,
    topic: payload.topic,
    intensity: intensityValue,
    intensity_level: intensityLevel,
    intensity_label: intensityLabel,
    intensity_heading: intensityHeading,
    intensity_summary: intensitySummary,
    intensity_guidance: intensityGuidance,
  }).trim();

  const userMessage = payload.turnNumber <= 2
    ? buildOpeningInstruction(payload, intensityHeading)
    : buildRebuttalInstruction(payload, intensityHeading);

  return {
    messages: [
      { role: "developer", content: developerSections.join("\n\n") },
      { role: "system", content: systemMessage },
      { role: "user", content: userMessage },
    ],
    intensityValue,
    intensityGuidance,
    intensityHeading,
    intensityLabel,
    intensityLevel,
    intensitySummary,
  };
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

    const debateInstructions = loadDebateInstructions();
    const promptContext = buildPromptContext(payload, debateInstructions);
    const inputMessages = promptContext.messages;
    const promptVariables: Record<string, string> = {
      intensity: promptContext.intensityValue,
      intensity_level: promptContext.intensityLevel,
      intensity_label: promptContext.intensityLabel,
      intensity_heading: promptContext.intensityHeading,
      intensity_summary: promptContext.intensitySummary,
      intensity_guidance: promptContext.intensityGuidance,
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
    const sessions = await storage.listDebateSessions();

    const toIsoString = (value: unknown): string | undefined => {
      if (!value) {
        return undefined;
      }
      if (value instanceof Date) {
        return value.toISOString();
      }
      if (typeof value === "string") {
        const parsed = new Date(value);
        return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
      }
      return undefined;
    };

    const summaries = sessions.map(session => {
      const turnHistory = Array.isArray(session.turnHistory) ? session.turnHistory : [];
      const totalCostValue = typeof session.totalCost === "number"
        ? session.totalCost
        : Number(session.totalCost ?? 0);
      const numericCost = Number.isFinite(totalCostValue) ? totalCostValue : 0;

      const payload: Record<string, unknown> = {
        id: session.id,
        topic: session.topicText,
        model1Id: session.model1Id,
        model2Id: session.model2Id,
        adversarialLevel: session.adversarialLevel,
        totalCost: numericCost,
        turnCount: turnHistory.length,
        createdAt: toIsoString(session.createdAt),
        updatedAt: toIsoString(session.updatedAt),
      };

      const jurySummary = (session as unknown as { jurySummary?: unknown }).jurySummary;
      if (jurySummary !== undefined && jurySummary !== null) {
        payload.jurySummary = jurySummary;
      }

      return payload;
    });

    res.json(summaries);
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
