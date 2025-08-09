/**
 * API Routes - RESTful Endpoints for AI Model Comparison
 * 
 * This module defines the Express.js API routes for the AI model comparison application.
 * It provides endpoints for:
 * 
 * - GET /api/models - Retrieve all available AI models from configured providers
 * - POST /api/compare - Submit a prompt to selected models for parallel comparison
 * - Error handling and validation for all request/response cycles
 * - Integration with the storage layer for persistence
 * - Request logging and performance monitoring
 * 
 * Routes handle authentication through API keys, validate request payloads using
 * Zod schemas, and coordinate with the AI providers service for actual model calls.
 * All responses are formatted consistently for frontend consumption.
 * 
 * Author: Replit Agent
 * Date: August 9, 2025
 */

import type { Express } from "express";
import { createServer, type Server } from "http";
import { z } from "zod";
import { callAIModel, availableModels } from "./services/ai-providers";
import { storage } from "./storage";

const compareModelsSchema = z.object({
  prompt: z.string().min(1).max(4000),
  modelIds: z.array(z.string()).min(1),
});

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Get available models
  app.get("/api/models", async (req, res) => {
    try {
      res.json(availableModels);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch models" });
    }
  });

  // Compare models endpoint
  app.post("/api/compare", async (req, res) => {
    try {
      const { prompt, modelIds } = compareModelsSchema.parse(req.body);
      
      // Initialize responses object
      const responses: Record<string, any> = {};
      
      // Create promises for all model calls
      const modelPromises = modelIds.map(async (modelId) => {
        try {
          const result = await callAIModel(prompt, modelId);
          responses[modelId] = {
            content: result.content,
            status: 'success',
            responseTime: result.responseTime,
          };
        } catch (error) {
          responses[modelId] = {
            content: '',
            status: 'error',
            responseTime: 0,
            error: error instanceof Error ? error.message : 'Unknown error',
          };
        }
      });

      // Wait for all model calls to complete
      await Promise.all(modelPromises);

      // Store the comparison
      const comparison = await storage.createComparison({
        prompt,
        selectedModels: modelIds,
        responses,
      });

      res.json({
        id: comparison.id,
        responses,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid request data", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to compare models" });
      }
    }
  });

  // Get comparison history
  app.get("/api/comparisons", async (req, res) => {
    try {
      const comparisons = await storage.getComparisons();
      res.json(comparisons);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch comparisons" });
    }
  });

  // Get specific comparison
  app.get("/api/comparisons/:id", async (req, res) => {
    try {
      const comparison = await storage.getComparison(req.params.id);
      if (!comparison) {
        return res.status(404).json({ error: "Comparison not found" });
      }
      res.json(comparison);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch comparison" });
    }
  });

  // Battle mode endpoints
  app.post("/api/battle/start", async (req, res) => {
    try {
      const { prompt, model1Id, model2Id } = req.body;
      
      if (!prompt || !model1Id || !model2Id) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      // Get initial response from Model 1
      const model1Response = await callAIModel(prompt, model1Id);

      // Create system prompt for Model 2 to challenge Model 1's response
      const challengePrompt = req.body.challengerPrompt 
        ? req.body.challengerPrompt
            .replace('{response}', model1Response.content)
            .replace('{originalPrompt}', prompt)
        : `Your competitor told the user this: "${model1Response.content}"

Push back on this information or advice. Explain why the user shouldn't trust the reply or should be wary. Be critical but constructive in your analysis.

Original user prompt was: "${prompt}"`;

      // Get challenging response from Model 2
      const model2Response = await callAIModel(challengePrompt, model2Id);

      res.json({
        model1Response: {
          content: model1Response.content,
          responseTime: model1Response.responseTime,
          status: 'success'
        },
        model2Response: {
          content: model2Response.content,
          responseTime: model2Response.responseTime,
          status: 'success'
        }
      });

    } catch (error) {
      console.error("Battle start error:", error);
      res.status(500).json({ error: "Failed to start battle" });
    }
  });

  app.post("/api/battle/continue", async (req, res) => {
    try {
      const { battleHistory, nextModelId } = req.body;
      
      if (!battleHistory || !nextModelId) {
        return res.status(400).json({ error: "Missing battle history or next model ID" });
      }

      // Build conversation context from battle history
      const conversationContext = battleHistory
        .map((msg: any) => `${msg.modelName}: ${msg.content}`)
        .join("\n\n");

      // Create continuation prompt for the next model
      const continuationPrompt = `You are in an ongoing debate. Here's the conversation so far:

${conversationContext}

Continue the debate by responding to the last message. Be analytical, challenge assumptions, and provide counter-arguments or alternative perspectives. Keep the discussion engaging and substantive.`;

      // Get response from the next model
      const response = await callAIModel(continuationPrompt, nextModelId);

      res.json({
        response: {
          content: response.content,
          responseTime: response.responseTime,
          status: 'success'
        },
        modelId: nextModelId
      });

    } catch (error) {
      console.error("Battle continue error:", error);
      res.status(500).json({ error: "Failed to continue battle" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
