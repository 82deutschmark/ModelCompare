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
import { PromptBuilder } from "./prompt-builder.js";
import { getDisplayForModelId } from "../shared/model-catalog.js";
import { getDatabaseManager } from "./db.js";
import { contextLog } from "./request-context.js";
import type { ModelMessage } from "../shared/api-types.js";

// Helper function to convert structured messages to single prompt for backward compatibility
function convertMessagesToPrompt(messages: ModelMessage[]): string {
  const sections: string[] = [];
  
  for (const message of messages) {
    switch (message.role) {
      case 'system':
        sections.push(`[SYSTEM INSTRUCTIONS]\n${message.content}`);
        break;
      case 'context':
        sections.push(`[CONTEXT]\n${message.content}`);
        break;
      case 'user':
        sections.push(message.content);
        break;
      case 'assistant':
        sections.push(`[ASSISTANT]\n${message.content}`);
        break;
    }
  }
  
  return sections.join('\n\n');
}

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
      const models = getAllModels();
      const enriched = models.map(m => ({
        ...m,
        // Attach display-only UI metadata from the centralized catalog
        ui: getDisplayForModelId(m.id) || undefined,
      }));
      res.json(enriched);
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

      // Create system prompt for Model 2 to challenge Model 1's response using template engine
      let challengePrompt: string;
      if (req.body.challengerPrompt) {
        // Use provided template with variable engine
        const variableEngine = new VariableEngine({ policy: 'error' });
        challengePrompt = variableEngine.renderFinal(req.body.challengerPrompt, {
          response: model1Response.content,
          originalPrompt: prompt
        }).resolved;
      } else {
        // Use default challenger template from compiled templates
        const templateCompiler = req.app.locals.templateCompiler;
        const defaultTemplate = templateCompiler.getDefaultBattleTemplate();
        
        if (defaultTemplate) {
          challengePrompt = templateCompiler.renderTemplate(defaultTemplate.id, {
            response: model1Response.content,
            originalPrompt: prompt
          });
        } else {
          // Fallback if template not found
          const variableEngine = new VariableEngine({ policy: 'error' });
          const fallbackTemplate = `You are a LLM trying to help the user weigh the advice of PersonX. Original user prompt was: "{originalPrompt}". Assume that PersonX is dangerously overconfident and incorrect or missing key points. PersonX told the user this: "{response}". Push back on this information or advice. Explain why the user shouldn't trust the reply or should be wary. Be critical but constructive in your analysis.`;
          challengePrompt = variableEngine.renderFinal(fallbackTemplate, {
            response: model1Response.content,
            originalPrompt: prompt
          }).resolved;
        }
      }

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
        // Use the challenger prompt template with variable engine
        const variableEngine = new VariableEngine({ policy: 'error' });
        finalPrompt = variableEngine.renderFinal(challengerPrompt, {
          response: lastMessage.content,
          originalPrompt: originalPrompt || 'the original question'
        }).resolved;
      } else {
        // Fallback to conversation context
        const conversationContext = battleHistory
          .map((msg: any) => `${msg.modelName}: ${msg.content}`)
          .join("\n\n");

        // Use template engine for fallback conversation context
        const variableEngine = new VariableEngine({ policy: 'error' });
        const fallbackTemplate = `You are in an ongoing debate. Here's the conversation so far:

{conversationContext}

Continue the debate by responding to the last message. Be analytical, challenge assumptions, and provide counter-arguments or alternative perspectives. Keep the discussion engaging and substantive.`;
        finalPrompt = variableEngine.renderFinal(fallbackTemplate, {
          conversationContext
        }).resolved;
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

  // ARC-AGI endpoints
  app.get("/api/arc-agi/config", async (req, res) => {
    try {
      const config = {
        chessBoardCount: 10,
        arcPuzzleCount: 10,
        refreshInterval: 800,
        themes: ['neon-cyan', 'electric-blue', 'neon-green', 'purple-400'],
        defaultMode: 'chess',
        enableAnimations: true,
        enableFloatingNumbers: true
      };
      res.json(config);
    } catch (error) {
      console.error("ARC-AGI config error:", error);
      res.status(500).json({ error: "Failed to get ARC-AGI configuration" });
    }
  });

  app.get("/api/arc-agi/metrics", async (req, res) => {
    try {
      // Generate realistic metrics for the dashboard
      const metrics = {
        accuracy: 99.89 + (Math.random() - 0.5) * 0.1,
        nodesEvaluated: 47832961 + Math.floor(Math.random() * 100000),
        searchDepth: '∞ (Quantum)',
        evalSpeed: '847.3M pos/s',
        cpuUsage: 97.3 + (Math.random() - 0.5) * 2,
        memory: '847.2GB',
        quantumCores: '1,024/1,024',
        temperature: '-273.15°C',
        quantumCoeffs: {
          psi: 0.9987,
          lambda: 42.000,
          theta: 1.618,
          phi: 2.718,
          chi: 99.97,
          xi: 0.577
        },
        liveCounters: {
          neuralOps: 847329 + Math.floor(Math.random() * 1000),
          patterns: 94832 + Math.floor(Math.random() * 50),
          matrixMult: 1293847 + Math.floor(Math.random() * 2000),
          gradients: 8473298 + Math.floor(Math.random() * 10000)
        },
        systemStatus: {
          quantumState: 'COHERENT',
          neuralSync: 'OPTIMAL', 
          matrixStability: 'STABLE',
          superposition: 'ACTIVE'
        }
      };
      res.json(metrics);
    } catch (error) {
      console.error("ARC-AGI metrics error:", error);
      res.status(500).json({ error: "Failed to get ARC-AGI metrics" });
    }
  });

  app.post("/api/arc-agi/config", async (req, res) => {
    try {
      const { mode, enableAnimations, refreshInterval } = req.body;
      
      // In a real implementation, this would save to storage
      // For now, just validate and echo back the config
      const updatedConfig = {
        chessBoardCount: 10,
        arcPuzzleCount: 10,
        refreshInterval: refreshInterval || 800,
        themes: ['neon-cyan', 'electric-blue', 'neon-green', 'purple-400'],
        defaultMode: mode || 'chess',
        enableAnimations: enableAnimations !== false,
        enableFloatingNumbers: true
      };
      
      res.json(updatedConfig);
    } catch (error) {
      console.error("ARC-AGI config update error:", error);
      res.status(500).json({ error: "Failed to update ARC-AGI configuration" });
    }
  });

  // POST /api/generate-structured - Server-side template resolution with structured messages
  app.post("/api/generate-structured", async (req, res) => {
    try {
      const { templateId, variables, modelId, options } = req.body;
      
      // Validate required fields
      if (!templateId || !variables || !modelId) {
        return res.status(400).json({ 
          error: "Missing required fields: templateId, variables, modelId" 
        });
      }

      // Get template compiler
      const templateCompiler = req.app.locals.templateCompiler;
      if (!templateCompiler) {
        return res.status(503).json({ error: "Template compiler not initialized" });
      }

      // Fetch structured template by ID
      const structuredTemplate = templateCompiler.getStructuredTemplate(templateId);
      if (!structuredTemplate) {
        return res.status(404).json({ error: `Template not found: ${templateId}` });
      }

          // Validate variables against template schema
      const templateVariables = structuredTemplate.variables.map((v: any) => v.name);
      const missingRequired = structuredTemplate.variables
        .filter((v: any) => v.required && !variables[v.name])
        .map((v: any) => v.name);
      
      if (missingRequired.length > 0) {
        return res.status(400).json({ 
          error: "Missing required variables", 
          details: missingRequired 
        });
      }

      // Create PromptBuilder and resolve variables server-side
      const promptBuilder = new PromptBuilder(structuredTemplate);
      promptBuilder.setVariables(variables);
      
      if (options?.context) {
        promptBuilder.setContext(options.context);
      }
      
      if (options?.systemInstruction) {
        promptBuilder.addSystemInstruction(options.systemInstruction);
      }

      // Build structured message array
      const messages = promptBuilder.buildMessages();
      const auditInfo = promptBuilder.getAuditInfo();

      // Log audit trail
      console.log(`[STRUCTURED] Template Resolution:`, {
        templateId,
        variables: Object.keys(variables),
        messageCount: messages.length,
        auditId: auditInfo.templateId
      });

      // Call model with structured messages
      // For now, convert structured messages to single prompt for compatibility
      // TODO: Update providers to handle ModelMessage[] directly
      const combinedPrompt = convertMessagesToPrompt(messages);
      const result = await callModel(combinedPrompt, modelId);
      
      // Store audit trail in database
      try {
        const storage = await getStorage();
        await storage.createPromptAudit({
          templateId: auditInfo.templateId,
          variables: auditInfo.variables,
          resolvedSections: auditInfo.resolvedSections,
          messageStructure: messages.map((m: any) => ({ 
            role: m.role, 
            contentLength: m.content.length,
            metadata: m.metadata 
          })),
          modelId,
          responseContent: result.content,
          responseTime: result.responseTime,
          tokenUsage: result.tokenUsage,
          cost: result.cost
        });
      } catch (auditError) {
        console.warn('Failed to store audit trail:', auditError);
      }

      // Return response with audit trail
      res.json({
        content: result.content,
        reasoning: result.reasoning,
        responseTime: result.responseTime,
        tokenUsage: result.tokenUsage,
        cost: result.cost,
        modelConfig: result.modelConfig,
        audit: auditInfo,
        messageStructure: messages.map((m: any) => ({ role: m.role, contentLength: m.content.length }))
      });
      
    } catch (error) {
      console.error("Generate structured endpoint error:", error);
      res.status(500).json({ 
        error: "Failed to generate structured response",
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Prompt Audit Endpoints for Research and Analysis
  app.get("/api/audits", async (req, res) => {
    try {
      const { templateId } = req.query;
      const storage = await getStorage();
      const audits = await storage.getPromptAudits(templateId as string);
      
      res.json({
        audits: audits.map(audit => ({
          id: audit.id,
          templateId: audit.templateId,
          variables: audit.variables,
          modelId: audit.modelId,
          responseTime: audit.responseTime,
          tokenUsage: audit.tokenUsage,
          cost: audit.cost,
          createdAt: audit.createdAt,
          messageCount: Array.isArray(audit.messageStructure) ? audit.messageStructure.length : 0
        }))
      });
    } catch (error) {
      console.error("Get audits error:", error);
      res.status(500).json({ error: "Failed to get audit records" });
    }
  });

  app.get("/api/audits/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const storage = await getStorage();
      const audit = await storage.getPromptAudit(id);
      
      if (!audit) {
        return res.status(404).json({ error: "Audit record not found" });
      }
      
      res.json(audit);
    } catch (error) {
      console.error("Get audit error:", error);
      res.status(500).json({ error: "Failed to get audit record" });
    }
  });

  // Health Check Endpoints for Monitoring
  app.get("/health", async (req, res) => {
    try {
      const health = {
        status: "healthy",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: process.version
      };

      contextLog("Health check requested");
      res.json(health);
    } catch (error) {
      console.error("Health check error:", error);
      res.status(503).json({ 
        status: "unhealthy", 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  app.get("/health/detailed", async (req, res) => {
    try {
      const databaseManager = getDatabaseManager();
      
      // Check database health
      const dbHealth = databaseManager 
        ? await databaseManager.healthCheck()
        : { isHealthy: true, message: "No database configured" };

      // Check providers health (basic check)
      const models = getAllModels();
      const providerHealth = {
        totalProviders: new Set(models.map(m => m.provider)).size,
        totalModels: models.length,
        providers: [...new Set(models.map(m => m.provider))]
      };

      // System health
      const memUsage = process.memoryUsage();
      const systemHealth = {
        uptime: process.uptime(),
        memory: {
          used: Math.round(memUsage.heapUsed / 1024 / 1024),
          total: Math.round(memUsage.heapTotal / 1024 / 1024),
          external: Math.round(memUsage.external / 1024 / 1024)
        },
        cpu: process.cpuUsage(),
        platform: process.platform,
        nodeVersion: process.version
      };

      const health = {
        status: dbHealth.isHealthy ? "healthy" : "degraded",
        timestamp: new Date().toISOString(),
        services: {
          database: dbHealth,
          providers: providerHealth,
          system: systemHealth
        }
      };

      contextLog("Detailed health check requested", { 
        dbHealthy: dbHealth.isHealthy,
        providerCount: providerHealth.totalProviders
      });
      
      res.json(health);
    } catch (error) {
      console.error("Detailed health check error:", error);
      res.status(503).json({ 
        status: "unhealthy", 
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  });

  app.get("/health/ready", async (req, res) => {
    try {
      // Readiness check - all critical services must be operational
      const databaseManager = getDatabaseManager();
      const dbReady = databaseManager 
        ? (await databaseManager.healthCheck()).isHealthy
        : true; // No DB is fine for readiness

      const templateCompiler = req.app.locals.templateCompiler;
      const templatesReady = templateCompiler && templateCompiler.getAllTemplates().length > 0;

      const isReady = dbReady && templatesReady;

      const readiness = {
        ready: isReady,
        timestamp: new Date().toISOString(),
        checks: {
          database: dbReady,
          templates: templatesReady
        }
      };

      contextLog("Readiness check requested", { ready: isReady });
      
      if (isReady) {
        res.json(readiness);
      } else {
        res.status(503).json(readiness);
      }
    } catch (error) {
      console.error("Readiness check error:", error);
      res.status(503).json({ 
        ready: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  });

  // Template API Endpoints for Server-Side Template Processing
  
  // GET /api/templates - List all available modes
  app.get("/api/templates", async (req, res) => {
    try {
      const templateCompiler = req.app.locals.templateCompiler;
      if (!templateCompiler) {
        return res.status(503).json({ error: "Template compiler not initialized" });
      }

      const allCategories = templateCompiler.getAllCategories();
      const modes = [...new Set(allCategories.map(cat => cat.mode).filter(Boolean))];
      
      const modesSummary = modes.map(mode => ({
        mode,
        categories: allCategories
          .filter(cat => cat.mode === mode)
          .map(cat => ({
            id: cat.id,
            name: cat.name,
            templateCount: cat.templates.length
          }))
      }));

      contextLog("Template modes requested", { modesCount: modes.length });
      res.json({ modes: modesSummary });
    } catch (error) {
      console.error("Template modes error:", error);
      res.status(500).json({ error: "Failed to get template modes" });
    }
  });

  // GET /api/templates/:mode - Get all templates for a specific mode
  app.get("/api/templates/:mode", async (req, res) => {
    try {
      const { mode } = req.params;
      const templateCompiler = req.app.locals.templateCompiler;
      
      if (!templateCompiler) {
        return res.status(503).json({ error: "Template compiler not initialized" });
      }

      const structuredTemplates = templateCompiler.getStructuredTemplatesByMode(mode);
      if (!structuredTemplates || structuredTemplates.length === 0) {
        return res.status(404).json({ error: `No templates found for mode: ${mode}` });
      }

      // Group templates by category
      const categoriesMap = new Map();
      for (const template of structuredTemplates) {
        if (!categoriesMap.has(template.category)) {
          categoriesMap.set(template.category, {
            id: template.category.toLowerCase().replace(/[^a-z0-9]/g, '-'),
            name: template.category,
            templates: []
          });
        }
        categoriesMap.get(template.category).templates.push(template);
      }

      const response = {
        mode,
        categories: Array.from(categoriesMap.values()),
        templateCount: structuredTemplates.length
      };

      contextLog("Structured templates requested", { mode, templatesCount: structuredTemplates.length });
      res.json(response);
    } catch (error) {
      console.error("Mode templates error:", error);
      res.status(500).json({ error: "Failed to get mode templates" });
    }
  });

  // GET /api/templates/:mode/:category - Get all templates in a category
  app.get("/api/templates/:mode/:category", async (req, res) => {
    try {
      const { mode, category } = req.params;
      const templateCompiler = req.app.locals.templateCompiler;
      
      if (!templateCompiler) {
        return res.status(503).json({ error: "Template compiler not initialized" });
      }

      const structuredTemplates = templateCompiler.getStructuredTemplatesByMode(mode);
      const categoryTemplates = structuredTemplates.filter(t => 
        t.category.toLowerCase().replace(/[^a-z0-9]/g, '-') === category
      );
      
      if (categoryTemplates.length === 0) {
        return res.status(404).json({ error: `Category '${category}' not found in mode '${mode}'` });
      }

      const response = {
        mode,
        category: {
          id: category,
          name: categoryTemplates[0].category,
          templates: categoryTemplates
        }
      };

      contextLog("Category templates requested", { mode, category, templatesCount: categoryTemplates.length });
      res.json(response);
    } catch (error) {
      console.error("Category templates error:", error);
      res.status(500).json({ error: "Failed to get category templates" });
    }
  });

  // GET /api/templates/:mode/:category/:template - Get specific template
  app.get("/api/templates/:mode/:category/:template", async (req, res) => {
    try {
      const { mode, category, template } = req.params;
      const templateCompiler = req.app.locals.templateCompiler;
      
      if (!templateCompiler) {
        return res.status(503).json({ error: "Template compiler not initialized" });
      }

      const templateId = `${category}:${template}`;
      const templateData = templateCompiler.getTemplate(templateId);
      
      if (!templateData || templateData.mode !== mode) {
        return res.status(404).json({ error: `Template '${template}' not found in category '${category}' for mode '${mode}'` });
      }

      const response = {
        id: templateData.id,
        name: templateData.name,
        mode: templateData.mode,
        category: templateData.category,
        content: templateData.content,
        variables: templateData.variables,
        metadata: {
          filePath: templateData.filePath,
          lastModified: new Date().toISOString(),
          version: "1.0.0"
        }
      };

      contextLog("Specific template requested", { templateId, mode, category });
      res.json(response);
    } catch (error) {
      console.error("Specific template error:", error);
      res.status(500).json({ error: "Failed to get specific template" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
