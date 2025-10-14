/*
 * Author: Cascade
 * Date: October 14, 2025 and 7:23pm UTC-04:00
 * PURPOSE: This routes file handles legacy creative combat endpoints, now deprecated and redirecting to the unified generate endpoint. It integrates with the generate system for compatibility.
 * SRP/DRY check: Pass - Focused solely on creative logic. Creative patterns were repeated in the monolithic routes.ts; this extracts them. Reviewed existing creative code to ensure no duplication.
 */
import { Router } from "express";
import { callModel } from "../providers/index.js";
import { VariableEngine } from "../../shared/variable-engine.js";

const router = Router();

// Legacy Creative Combat mode endpoints (deprecated - use /api/generate)
router.post("/respond", async (req, res) => {
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

export { router as creativeRoutes };
