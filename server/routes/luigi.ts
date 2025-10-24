/*
 * Author: Codex using GPT-5
 * Date: 2025-10-04T02:04:20Z
 * PURPOSE: Express router exposing Luigi agent workspace REST endpoints.
 * SRP/DRY check: Pass - routes only, delegates to executor and storage.
 * shadcn/ui: Pass - backend only.
 */

import { Router } from 'express';
import { z } from 'zod';
import { LuigiExecutor } from '../luigi/executor';
import { storage } from '../storage';
import { getLuigiConfig } from '../config.js';
import type { LuigiRunParams } from '../luigi/executor';
import { LUIGI_STAGES } from '@shared/luigi-types';

const createRunSchema = z.object({
  missionName: z.string().min(3),
  objective: z.string().min(5),
  constraints: z.string().optional(),
  successCriteria: z.string().optional(),
  stakeholderNotes: z.string().optional(),
});

const userReplySchema = z.object({
  content: z.string().min(1),
});

export function createLuigiRouter(): Router {
  const router = Router();
  const config = getLuigiConfig();
  const executor = new LuigiExecutor({
    orchestratorAgentId: config.orchestratorAgentId,
    restBaseUrl: config.agentRunnerBaseUrl,
    restApiKey: config.agentRunnerApiKey,
    agentMode: config.agentMode,
    sdkOptions: config.sdk,
  });

  router.post('/runs', async (req, res) => {
    try {
      const params = createRunSchema.parse(req.body);
      const runContext = await executor.createRun(params as LuigiRunParams);
      const context = await executor.startRun(runContext.run.id);
      res.status(201).json({ run: context.run });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : String(error) });
    }
  });

  router.get('/runs/:runId', async (req, res) => {
    try {
      const { runId } = req.params;
      const context = await executor.fetchContext(runId);
      res.json({ run: context.run });
    } catch (error) {
      res.status(404).json({ error: error instanceof Error ? error.message : 'Run not found' });
    }
  });

  router.get('/runs/:runId/messages', async (req, res) => {
    try {
      const { runId } = req.params;
      const limit = Number.parseInt(req.query.limit as string, 10) || 200;
      const messages = await storage.getLuigiMessages(runId, limit);
      res.json({ messages });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to fetch messages' });
    }
  });

  router.get('/runs/:runId/artifacts', async (req, res) => {
    try {
      const { runId } = req.params;
      const artifacts = await storage.getLuigiArtifacts(runId);
      res.json({ artifacts });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to fetch artifacts' });
    }
  });

  router.post('/runs/:runId/replies', async (req, res) => {
    try {
      const { runId } = req.params;
      const { content } = userReplySchema.parse(req.body);
      const message = await executor.submitUserReply(runId, content);
      res.status(201).json({ message });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : String(error) });
    }
  });

  router.post('/runs/:runId/pause', async (req, res) => {
    try {
      const { runId } = req.params;
      const context = await executor.pauseRun(runId);
      res.json({ run: context.run });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : String(error) });
    }
  });

  router.post('/runs/:runId/resume', async (req, res) => {
    try {
      const { runId } = req.params;
      const context = await executor.resumeRun(runId);
      res.json({ run: context.run });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : String(error) });
    }
  });

  router.post('/runs/:runId/cancel', async (req, res) => {
    try {
      const { runId } = req.params;
      const context = await executor.cancelRun(runId);
      res.json({ run: context.run });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : String(error) });
    }
  });

  router.get('/stages', (_req, res) => {
    res.json({ stages: LUIGI_STAGES });
  });

  return router;
}
