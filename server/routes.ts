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
 * Updates: Added 'plan-assessment' mode allowlist in unified generate endpoint.
 * Updated by: GPT-5 (medium reasoning)
 * Date: August 9, 2025
 */

import type { Express } from "express";
import { createServer, type Server } from "http";
import { z } from "zod";
import { callModel, getAllModels, getReasoningModels } from "./providers/index.js";
import { getStorage } from "./storage";
import { VariableEngine } from "../shared/variable-engine.js";
import { validateVariables, VARIABLE_REGISTRIES, type ModeType } from "../shared/variable-registry.js";
import type { GenerateRequest, GenerateResponse, UnifiedMessage } from "../shared/api-types.js";

const compareModelsSchema = z.object({
  prompt: z.string().min(1).max(4000),
  modelIds: z.array(z.string()).min(1),
});

// Removed hardcoded Creative Combat prompts - now using markdown-based prompt system
// Prompts are loaded dynamically from client/public/docs/creative-combat-prompts.md
// via the prompt parser system in client/src/lib/promptParser.ts

// Feature flags for legacy route deprecation
const ENABLE_LEGACY_ROUTES = process.env.ENABLE_LEGACY_ROUTES !== 'false';

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Get available models
  app.get("/api/models", async (req, res) => {
    try {
      res.json(getAllModels());
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
          const result = await callModel(prompt, modelId);
          responses[modelId] = {
            content: result.content,
            reasoning: result.reasoning,
            status: 'success',
            responseTime: result.responseTime,
            tokenUsage: result.tokenUsage,
            cost: result.cost,
            modelConfig: result.modelConfig,
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
      const storage = await getStorage();
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
      const storage = await getStorage();
      const comparisons = await storage.getComparisons();
      res.json(comparisons);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch comparisons" });
    }
  });

  // Get specific comparison
  app.get("/api/comparisons/:id", async (req, res) => {
    try {
      const storage = await getStorage();
      const comparison = await storage.getComparison(req.params.id);
      if (!comparison) {
        return res.status(404).json({ error: "Comparison not found" });
      }
      res.json(comparison);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch comparison" });
    }
  });

  // Single Model Response Route
  app.post("/api/models/respond", async (req, res) => {
    try {
      const { modelId, prompt } = req.body;
      
      if (!modelId || !prompt) {
        return res.status(400).json({ error: 'Missing modelId or prompt' });
      }

      const result = await callModel(prompt, modelId);
      
      res.json({
        content: result.content,
        reasoning: result.reasoning,
        responseTime: result.responseTime,
        tokenUsage: result.tokenUsage,
        cost: result.cost,
        modelConfig: result.modelConfig
      });
    } catch (error) {
      console.error('Model response error:', error);
      res.status(500).json({ error: 'Failed to get model response' });
    }
  });

  // Legacy Battle mode endpoints (deprecated - use /api/generate)
  if (ENABLE_LEGACY_ROUTES) {
    app.post("/api/battle/start", async (req, res) => {
    try {
      const { prompt, model1Id, model2Id } = req.body;
      
      if (!prompt || !model1Id || !model2Id) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      // Get initial response from Model 1
      const model1Response = await callModel(prompt, model1Id);

      // Create system prompt for Model 2 to challenge Model 1's response
      const challengePrompt = req.body.challengerPrompt 
        ? req.body.challengerPrompt
            .replace('{response}', model1Response.content)
            .replace('{originalPrompt}', prompt)
        : `Your competitor told the user this: "${model1Response.content}"

Push back on this information or advice. Explain why the user shouldn't trust the reply or should be wary. Be critical but constructive in your analysis.

Original user prompt was: "${prompt}"`;

      // Get challenging response from Model 2
      const model2Response = await callModel(challengePrompt, model2Id);

      res.json({
        model1Response: {
          content: model1Response.content,
          reasoning: model1Response.reasoning,
          responseTime: model1Response.responseTime,
          tokenUsage: model1Response.tokenUsage,
          cost: model1Response.cost,
          modelConfig: model1Response.modelConfig,
          status: 'success'
        },
        model2Response: {
          content: model2Response.content,
          reasoning: model2Response.reasoning,
          responseTime: model2Response.responseTime,
          tokenUsage: model2Response.tokenUsage,
          cost: model2Response.cost,
          modelConfig: model2Response.modelConfig,
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
      const { battleHistory, nextModelId, challengerPrompt, originalPrompt } = req.body;
      
      if (!battleHistory || !nextModelId) {
        return res.status(400).json({ error: "Missing battle history or next model ID" });
      }

      // Get the last response to challenge
      const lastMessage = battleHistory[battleHistory.length - 1];
      
      let finalPrompt: string;
      
      if (challengerPrompt && lastMessage) {
        // Use the challenger prompt template with variable replacement
        finalPrompt = challengerPrompt
          .replace('{response}', lastMessage.content)
          .replace('{originalPrompt}', originalPrompt || 'the original question');
      } else {
        // Fallback to conversation context
        const conversationContext = battleHistory
          .map((msg: any) => `${msg.modelName}: ${msg.content}`)
          .join("\n\n");

        finalPrompt = `You are in an ongoing debate. Here's the conversation so far:

${conversationContext}

Continue the debate by responding to the last message. Be analytical, challenge assumptions, and provide counter-arguments or alternative perspectives. Keep the discussion engaging and substantive.`;
      }

      // Get response from the next model
      const response = await callModel(finalPrompt, nextModelId);

      res.json({
        response: {
          content: response.content,
          reasoning: response.reasoning,
          responseTime: response.responseTime,
          tokenUsage: response.tokenUsage,
          cost: response.cost,
          modelConfig: response.modelConfig,
          status: 'success'
        },
        modelId: nextModelId
      });

    } catch (error) {
      console.error("Battle continue error:", error);
      res.status(500).json({ error: "Failed to continue battle" });
    }
  });
  }

  // Legacy Creative Combat mode endpoints (deprecated - use /api/generate)
  if (ENABLE_LEGACY_ROUTES) {
  app.post("/api/creative-combat/respond", async (req, res) => {
    try {
      const { category, prompt, modelId, type, previousContent, originalPrompt } = req.body;
      
      if (!category || !prompt || !modelId || !type) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      let finalPrompt: string;

      // Creative Combat now uses the unified /api/generate endpoint with markdown-based prompts
      // This legacy endpoint should be migrated to use the new prompt parser system
      return res.status(410).json({ 
        error: "This endpoint is deprecated. Please use /api/generate with creative-combat mode and markdown-based prompts." 
      });

      // Get response from the model
      const response = await callModel(finalPrompt, modelId);

      res.json({
        response: {
          content: response.content,
          reasoning: response.reasoning,
          responseTime: response.responseTime,
          tokenUsage: response.tokenUsage,
          cost: response.cost,
          modelConfig: response.modelConfig,
          status: 'success'
        },
        modelId: modelId
      });

    } catch (error) {
      console.error("Creative Combat error:", error);
      res.status(500).json({ error: "Failed to process creative combat request" });
    }
  });
  }

  // Unified Generate Endpoint - Single source of truth for all modes
  app.post("/api/generate", async (req, res) => {
    try {
      const requestBody = req.body as GenerateRequest;
      // Debug: trace incoming request early to verify middleware is not intercepting
      console.log('[API] /api/generate received', {
        bodyType: typeof req.body,
        keys: req.body ? Object.keys(req.body) : [],
        contentPreview: typeof req.body?.template === 'string' ? req.body.template.slice(0, 60) + '…' : undefined,
        seatsCount: Array.isArray(req.body?.seats) ? req.body.seats.length : 0,
        mode: req.body?.mode,
      });
      const { mode, template, variables, seats, options } = requestBody;
      
      // Validate mode
      if (!['creative', 'battle', 'debate', 'compare', 'research-synthesis', 'plan-assessment', 'vixra'].includes(mode)) {
        return res.status(400).json({ error: `Invalid mode: ${mode}` });
      }

      // Validate required fields
      if (!template || !seats || seats.length === 0) {
        return res.status(400).json({ error: "Missing required fields: template, seats" });
      }

      // Initialize variable engine with mode-specific aliases
      const aliases: Record<string, string> | undefined =
        mode === 'debate'
          ? {
              TOPIC: 'topic',
              INTENSITY: 'intensity',
              RESPONSE: 'response',
            }
          : undefined;

      const variableEngine = new VariableEngine({
        policy: 'error',
        aliases,
      });

      // Validate variables against registry
      const validation = validateVariables(mode as ModeType, variables);
      if (!validation.isValid) {
        return res.status(400).json({ 
          error: "Variable validation failed", 
          details: validation.errors 
        });
      }

      // Server-side variable resolution with logging
      let resolvedPrompt: string;
      let variableMapping: Record<string, string>;
      let warnings: string[];

      try {
        const resolution = variableEngine.renderFinal(template, variables);
        resolvedPrompt = resolution.resolved;
        variableMapping = resolution.mapping;
        warnings = resolution.warnings;
        
        // Log variable resolution for audit
        console.log(`[${mode.toUpperCase()}] Variable Resolution:`, {
          template: template.substring(0, 100) + '...',
          mapping: variableMapping,
          warnings
        });
      } catch (error) {
        return res.status(400).json({ 
          error: "Variable resolution failed", 
          details: error instanceof Error ? error.message : 'Unknown error'
        });
      }

      // Handle streaming vs non-streaming
      if (options?.stream) {
        // Set SSE headers
        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Cache-Control'
        });

        // Process each seat for streaming
        for (const seat of seats) {
          const messageId = `msg_${Date.now()}_${seat.id}`;
          const createdAt = new Date().toISOString();

          // Send message start event
          res.write(`data: ${JSON.stringify({
            type: 'messageStart',
            messageId,
            seatId: seat.id,
            createdAt,
            resolvedPrompt
          })}\n\n`);

          try {
            // Get streaming response from model
            const result = await callModel(resolvedPrompt, seat.model.id);
            
            // Send delta events (simulated for now - real streaming would send incremental)
            res.write(`data: ${JSON.stringify({
              type: 'delta',
              messageId,
              text: result.content,
              reasoning: result.reasoning
            })}\n\n`);

            // Send message end event
            res.write(`data: ${JSON.stringify({
              type: 'messageEnd',
              messageId,
              finishReason: 'stop',
              tokenUsage: result.tokenUsage ?? { input: 0, output: 0 },
              cost: result.cost ?? { total: 0, input: 0, output: 0 },
              resolvedPrompt,
              modelConfig: result.modelConfig
            })}\n\n`);
            
          } catch (error) {
            // Send error event
            res.write(`data: ${JSON.stringify({
              type: 'error',
              messageId,
              code: 'MODEL_ERROR',
              message: error instanceof Error ? error.message : 'Unknown error'
            })}\n\n`);
          }
        }

        res.end();
      } else {
        // Non-streaming response - process first seat only for now
        const seat = seats[0];
        const messageId = `msg_${Date.now()}_${seat.id}`;
        
        try {
          const result = await callModel(resolvedPrompt, seat.model.id);
          
          const message: UnifiedMessage = {
            id: messageId,
            role: 'assistant',
            seatId: seat.id,
            content: result.content,
            reasoning: result.reasoning,
            createdAt: new Date().toISOString(),
            status: 'complete',
            finishReason: 'stop',
            tokenUsage: result.tokenUsage ?? { input: 0, output: 0 },
            cost: result.cost ?? { total: 0, input: 0, output: 0 },
            modelConfig: result.modelConfig
          };

          const response: GenerateResponse = {
            message,
            tokenUsage: result.tokenUsage ?? { input: 0, output: 0 },
            cost: result.cost ?? { total: 0, input: 0, output: 0 },
            resolvedPrompt,
            variableMapping,
            warnings
          };

          res.json(response);
        } catch (error) {
          console.error("Generate endpoint error:", error);
          res.status(500).json({ 
            error: "Failed to generate response",
            details: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
      
    } catch (error) {
      console.error("Generate endpoint error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Vixra session persistence endpoints
  app.post("/api/vixra/sessions", async (req, res) => {
    try {
      const { variables, template, responses } = req.body;
      
      if (!variables || !template) {
        return res.status(400).json({ error: "Missing variables or template" });
      }
      
      const storage = await getStorage();
      const session = await storage.createVixraSession({
        variables,
        template, 
        responses: responses || {}
      });
      
      res.json(session);
    } catch (error) {
      console.error("Create Vixra session error:", error);
      res.status(500).json({ error: "Failed to create session" });
    }
  });

  app.put("/api/vixra/sessions/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      const storage = await getStorage();
      const session = await storage.updateVixraSession(id, updates);
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }
      
      res.json(session);
    } catch (error) {
      console.error("Update Vixra session error:", error);
      res.status(500).json({ error: "Failed to update session" });
    }
  });

  app.get("/api/vixra/sessions/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const storage = await getStorage();
      const session = await storage.getVixraSession(id);
      
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }
      
      res.json(session);
    } catch (error) {
      console.error("Get Vixra session error:", error);
      res.status(500).json({ error: "Failed to get session" });
    }
  });

  app.get("/api/vixra/sessions", async (req, res) => {
    try {
      const storage = await getStorage();
      const sessions = await storage.getVixraSessions();
      res.json(sessions);
    } catch (error) {
      console.error("Get Vixra sessions error:", error);
      res.status(500).json({ error: "Failed to get sessions" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
