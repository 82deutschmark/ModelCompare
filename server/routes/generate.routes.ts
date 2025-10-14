/*
 * Author: Cascade
 * Date: October 14, 2025 and 7:23pm UTC-04:00
 * PURPOSE: This main routes file orchestrates all route modules, registering them with the Express app and applying global middleware like error handling. It integrates with all route modules and touches middleware for application-wide setup.
 * SRP/DRY check: Pass - Focused solely on route registration. Route registration patterns were scattered in the monolithic file; this centralizes them. Reviewed existing route setup to ensure no duplication.
import { Router } from "express";
import { VariableEngine } from "../../shared/variable-engine.js";
import { validateVariables, VARIABLE_REGISTRIES, type ModeType } from "../../shared/variable-registry.js";
import type { GenerateRequest, GenerateResponse, UnifiedMessage, ModelMessage } from "../../shared/api-types.js";
import { getStorage } from "../storage.js";
import { PromptBuilder } from "../prompt-builder.js";

const router = Router();

// Unified Generate Endpoint - Single source of truth for all modes
router.post("/", async (req, res) => {
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
          modelConfig: result.modelConfig as any
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

// POST /api/generate-structured - Server-side template resolution with structured messages
router.post("/structured", async (req, res) => {
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

    // Call model with structured messages directly
    const result = await callModelWithMessages(messages, modelId, options);

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

export { router as generateRoutes };
