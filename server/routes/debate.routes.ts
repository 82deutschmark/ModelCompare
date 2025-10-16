/*
 * Author: gpt-5-codex
 * Date: 2025-10-16 18:34 UTC
 * PURPOSE: Updates debate streaming routes to align with corrected Responses API options by
 *          removing deprecated verbosity controls and relying on provider-level reasoning defaults
 *          while preserving existing debate session orchestration.
 * SRP/DRY check: Pass - File continues to focus on debate routing concerns without duplicating
 *                provider logic.
 */
import { Router, Request, Response } from "express";
import { getProviderForModel } from "../providers/index.js";
import { storage } from "../storage.js";

const router = Router();
router.get("/sessions", async (req, res) => {
  try {
    // For now, return empty array - in a real implementation, this would list user's debate sessions
    // const sessions = await storage.getDebateSessions(); // Would need to add this method
    res.json([]);
  } catch (error) {
    console.error('Failed to get debate sessions:', error);
    res.status(500).json({ error: 'Failed to get debate sessions' });
  }
});

// POST /api/debate/session - Create new debate session
router.post("/session", async (req, res) => {
  try {
    const { topic, model1Id, model2Id, adversarialLevel } = req.body;

    if (!topic || !model1Id || !model2Id || adversarialLevel == null) {
      return res.status(400).json({ error: 'Missing required fields' });
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
    console.error('Failed to create debate session:', error);
    res.status(500).json({ error: 'Failed to create debate session' });
  }
});

// GET /api/debate/session/:id - Get specific debate session
router.get("/session/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const session = await storage.getDebateSession(id);

    if (!session) {
      return res.status(404).json({ error: 'Debate session not found' });
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
    console.error('Failed to get debate session:', error);
    res.status(500).json({ error: 'Failed to get debate session' });
  }
});

// POST /api/debate/stream - Streaming debate with reasoning
router.post("/stream", async (req, res) => {
  try {
    const {
      modelId,
      topic,
      role, // 'AFFIRMATIVE' | 'NEGATIVE'
      intensity,
      opponentMessage, // null for Turn 1/2, opponent's content for subsequent turns
      previousResponseId, // null for Turn 1/2, model's own last response ID
      turnNumber, // 1-10
      // New configuration parameters
      reasoningEffort = 'medium',
      reasoningSummary = 'auto',
      temperature = 0.7,
      maxTokens = 16384,
      // Session management
      sessionId, // Optional: existing session ID for resuming
      model1Id,
      model2Id
    } = req.body;

    // Validation
    if (!modelId || !topic || !role || !intensity || turnNumber == null || !model1Id || !model2Id) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Set SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });

    // Create or get debate session
    let debateSessionId = sessionId;

    if (!sessionId) {
      // Create new debate session for first turn
      if (turnNumber === 1) {
        try {
          const debateSession = await storage.createDebateSession({
            topicText: topic,
            model1Id: model1Id,
            model2Id: model2Id,
            adversarialLevel: intensity,
            turnHistory: [],
            model1ResponseIds: [],
            model2ResponseIds: []
          });
          debateSessionId = debateSession.id;
          console.log(`Created debate session: ${debateSessionId}`);
        } catch (error) {
          console.error('Failed to create debate session:', error);
          res.write(`event: error\ndata: ${JSON.stringify({
            error: 'Failed to create debate session'
          })}\n\n`);
          res.end();
          return;
        }
      } else {
        // This shouldn't happen - we need a session ID for turns > 1
        res.write(`event: error\ndata: ${JSON.stringify({
          error: 'Session ID required for continuing debates'
        })}\n\n`);
        res.end();
        return;
      }
    } else {
      // Verify existing session exists
      const existingSession = await storage.getDebateSession(sessionId);
      if (!existingSession) {
        res.write(`event: error\ndata: ${JSON.stringify({
          error: 'Debate session not found'
        })}\n\n`);
        res.end();
        return;
      }
      debateSessionId = sessionId;
    }

    // Get the correct previous response ID from database
    let actualPreviousResponseId = previousResponseId;

    if (turnNumber > 2) {
      // For turns > 2, get the model's own last response ID from the database
      const session = await storage.getDebateSession(debateSessionId);
      if (session) {
        const isModel1 = modelId === session.model1Id;
        const responseIds = isModel1
          ? (session.model1ResponseIds as string[])
          : (session.model2ResponseIds as string[]);
        actualPreviousResponseId = responseIds[responseIds.length - 1] || null;
      }
    }

    // Build prompt based on turn number
    let inputMessages: Array<{ role: string; content: string }>;

    if (turnNumber === 1 || turnNumber === 2) {
      // Opening statements - no previous context
      const position = role === 'AFFIRMATIVE' ? 'FOR' : 'AGAINST';
      const systemPrompt = `You are the ${role} debater ${position} the proposition: "${topic}".
Present your opening argument following Robert's Rules of Order.
Adversarial intensity level: ${intensity}.`;

      inputMessages = [{ role: 'user', content: systemPrompt }];
    } else {
      // Rebuttals - respond to opponent
      const rebuttalPrompt = `Your opponent just argued: "${opponentMessage}"

Respond as the ${role} debater:
1. Address your opponent's specific points
2. Refute their arguments with evidence and logic
3. Strengthen your own position
4. Use adversarial intensity level: ${intensity}`;

      inputMessages = [{ role: 'user', content: rebuttalPrompt }];
    }

    // Call OpenAI provider with streaming enabled and proper configuration
    const provider = getProviderForModel(modelId);

    if (!provider.callModelStreaming) {
      res.write(`event: error\ndata: ${JSON.stringify({
        message: 'Streaming not supported for this provider'
      })}\n\n`);
      res.end();
      return;
    }

    // Pass configuration parameters to the streaming call
    await provider.callModelStreaming({
      modelId,
      messages: inputMessages,
      previousResponseId: actualPreviousResponseId || undefined,
      temperature: temperature,
      maxTokens: maxTokens,
      // Reasoning configuration for OpenAI provider
      reasoningConfig: {
        effort: reasoningEffort,
        summary: reasoningSummary
      },
      onReasoningChunk: (chunk: string) => {
        res.write(`event: stream.chunk\ndata: ${JSON.stringify({
          type: 'reasoning',
          delta: chunk,
          timestamp: Date.now()
        })}\n\n`);
      },
      onContentChunk: (chunk: string) => {
        res.write(`event: stream.chunk\ndata: ${JSON.stringify({
          type: 'text',
          delta: chunk,
          timestamp: Date.now()
        })}\n\n`);
      },
      onComplete: async (responseId: string, tokenUsage: any, cost: any, content?: string, reasoning?: string) => {
        // Save turn data to database with actual streamed content
        try {
          const turnCost = cost?.total || 0;
          await storage.updateDebateSession(debateSessionId, {
            turn: turnNumber,
            modelId: modelId,
            content: content || '', // Use streamed content if available
            reasoning: reasoning || '', // Use streamed reasoning if available
            responseId: responseId,
            cost: turnCost
          });

          // Send response ID back to client for conversation chaining
          res.write(`event: stream.complete\ndata: ${JSON.stringify({
            responseId,
            tokenUsage,
            cost,
            sessionId: debateSessionId
          })}\n\n`);
        } catch (error) {
          console.error('Failed to save turn data:', error);
          // Still send the response even if saving fails
          res.write(`event: stream.complete\ndata: ${JSON.stringify({
            responseId,
            tokenUsage,
            cost,
            sessionId: debateSessionId
          })}\n\n`);
        }
        res.end();
      },
      onError: (error: Error) => {
        res.write(`event: stream.error\ndata: ${JSON.stringify({
          error: error.message
        })}\n\n`);
        res.end();
      }
    });

  } catch (error) {
    console.error('Debate stream error:', error);
    res.write(`event: stream.error\ndata: ${JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error'
    })}\n\n`);
    res.end();
  }
});

export { router as debateRoutes };
