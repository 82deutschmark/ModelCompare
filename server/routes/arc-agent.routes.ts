/*
 * Author: gpt-5-codex
 * Date: 2025-11-06T03:49:34Z
 * PURPOSE: Express router exposing ARC agent workspace endpoints powered by the
 *          OpenAI Agents SDK executor.
 * SRP/DRY check: Pass - routes delegate business logic to ArcExecutor and storage helpers.
 */

import { Router } from 'express';
import { z } from 'zod';
import { getArcAgentConfig } from '../config.js';
import { ArcExecutor } from '../arc/executor';

const createRunSchema = z.object({
  taskId: z.string().min(3),
  challengeName: z.string().min(3),
  puzzleDescription: z.string().min(10),
  puzzlePayload: z.record(z.any()),
  targetPatternSummary: z.string().optional(),
  evaluationFocus: z.string().optional(),
});

const replySchema = z.object({
  content: z.string().min(1),
});

export function createArcAgentRouter(): Router {
  const router = Router();
  const config = getArcAgentConfig();
  const executor = new ArcExecutor({
    model: config.model,
    maxTurns: config.maxTurns,
  });

  router.post('/runs', async (req, res) => {
    try {
      const payload = createRunSchema.parse(req.body);
      const context = await executor.createRun(payload);
      const started = await executor.startRun(context.run.id);
      res.status(201).json({ run: started.run });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : String(error) });
    }
  });

  router.get('/runs/:runId', async (req, res) => {
    try {
      const context = await executor.fetchContext(req.params.runId);
      res.json({ run: context.run });
    } catch (error) {
      res.status(404).json({ error: error instanceof Error ? error.message : 'Run not found' });
    }
  });

  router.get('/runs/:runId/messages', async (req, res) => {
    try {
      const limit = Number.parseInt(req.query.limit as string, 10) || 200;
      const context = await executor.fetchContext(req.params.runId);
      const ordered = [...context.messages].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
      res.json({ messages: ordered.slice(-limit) });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to fetch messages' });
    }
  });

  router.get('/runs/:runId/artifacts', async (req, res) => {
    try {
      const context = await executor.fetchContext(req.params.runId);
      const ordered = [...context.artifacts].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      res.json({ artifacts: ordered });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to fetch artifacts' });
    }
  });

  router.post('/runs/:runId/replies', async (req, res) => {
    try {
      const { content } = replySchema.parse(req.body);
      const message = await executor.submitUserReply(req.params.runId, content);
      res.status(201).json({ message });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : String(error) });
    }
  });

  router.post('/runs/:runId/cancel', async (req, res) => {
    try {
      const context = await executor.cancelRun(req.params.runId);
      res.json({ run: context.run });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : String(error) });
    }
  });

  return router;
}
