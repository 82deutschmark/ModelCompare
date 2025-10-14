/*
 * Author: Cascade
 * Date: October 14, 2025 and 7:23pm UTC-04:00
 * PURPOSE: This routes file handles debate streaming endpoints, including turn-based debate logic with reasoning and content streaming. It integrates with providers for streaming model responses.
 * SRP/DRY check: Pass - Focused solely on debate logic. Debate patterns were repeated in the monolithic routes.ts; this extracts them. Reviewed existing debate code to ensure no duplication.
 */
import { Router } from "express";
import { getProviderForModel } from "../providers/index.js";

const router = Router();

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
      turnNumber // 1-10
    } = req.body;

    // Validation
    if (!modelId || !topic || !role || !intensity || turnNumber == null) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Set SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });

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

    // Call OpenAI provider with streaming enabled
    const provider = getProviderForModel(modelId);

    if (!provider.callModelStreaming) {
      res.write(`event: error\ndata: ${JSON.stringify({
        message: 'Streaming not supported for this provider'
      })}\n\n`);
      res.end();
      return;
    }

    await provider.callModelStreaming({
      modelId,
      messages: inputMessages,
      previousResponseId: previousResponseId || undefined,
      onReasoningChunk: (chunk: string) => {
        res.write(`event: reasoning\ndata: ${JSON.stringify({ chunk })}\n\n`);
      },
      onContentChunk: (chunk: string) => {
        res.write(`event: content\ndata: ${JSON.stringify({ chunk })}\n\n`);
      },
      onComplete: (responseId: string, tokenUsage: any, cost: any) => {
        res.write(`event: complete\ndata: ${JSON.stringify({
          responseId,
          tokenUsage,
          cost
        })}\n\n`);
        res.end();
      },
      onError: (error: Error) => {
        res.write(`event: error\ndata: ${JSON.stringify({
          message: error.message
        })}\n\n`);
        res.end();
      }
    });

  } catch (error) {
    console.error('Debate stream error:', error);
    res.write(`event: error\ndata: ${JSON.stringify({
      message: error instanceof Error ? error.message : 'Unknown error'
    })}\n\n`);
    res.end();
  }
});

export { router as debateRoutes };
