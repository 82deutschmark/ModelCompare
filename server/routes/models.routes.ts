/*
 * Author: Cascade
 * Date: October 14, 2025 and 7:23pm UTC-04:00
 * PURPOSE: This routes file handles model-related endpoints, including retrieving available AI models from the catalog, comparing models with parallel processing, and managing comparison history. It integrates with providers for model calls, storage for persistence, and device-auth for credit checks.
 * SRP/DRY check: Pass - Focused solely on model catalog and comparison logic. Model patterns were repeated in the monolithic routes.ts; this extracts them. Reviewed existing model code to ensure no duplication.
import { Router } from "express";
import { modelService } from "../services/model.service.js";
import { getStorage } from "../storage.js";
import { getDisplayForModelId, MODEL_CATALOG } from "../../shared/model-catalog.js";
import { ApiResponse } from "../utils/response.js";

const router = Router();

const compareModelsSchema = z.object({
  prompt: z.string().min(1).max(4000),
  mode: z.enum(['compare', 'generate', 'reasoning']).default('compare'),
  modelIds: z.array(z.string()).min(1),
});

// Get available models - using centralized configuration
router.get("/", async (req, res) => {
  try {
    // Use MODEL_CATALOG for display metadata
    const models = Object.values(MODEL_CATALOG).map(model => {
      // Helper function to parse cost ranges like "$0.40 - $1.20"
      const parseCost = (costString: string): number => {
        const cleaned = costString.replace(/\$/g, '');
        if (cleaned.includes(' - ')) {
          // Use the lower bound for ranges
          return parseFloat(cleaned.split(' - ')[0]);
        }
        return parseFloat(cleaned);
      };

      return {
        // Map to expected frontend format (AIModel interface)
        id: model.key,
        name: model.name,
        provider: model.provider,
        color: model.color,
        premium: model.premium,
        cost: model.cost,
        supportsTemperature: model.supportsTemperature ?? true,
        responseTime: model.responseTime,
        isReasoning: model.isReasoning ?? false,
        apiModelName: model.apiModelName || model.key,
        modelType: model.modelType || 'chat',
        contextWindow: model.contextWindow || 128000,
        maxOutputTokens: model.maxOutputTokens || 4000,
        releaseDate: model.releaseDate || '2024',
        requiresPromptFormat: model.requiresPromptFormat ?? false,
        supportsStructuredOutput: model.supportsStructuredOutput ?? false,

        // Legacy compatibility fields for existing components
        model: model.key,
        knowledgeCutoff: model.releaseDate || '2024',
        capabilities: {
          reasoning: model.isReasoning ?? false,
          multimodal: false, // TODO: add multimodal support to model definitions
          functionCalling: false, // TODO: add function calling support to model definitions
          streaming: true, // Most models support streaming
        },
        pricing: {
          inputPerMillion: parseCost(model.cost.input),
          outputPerMillion: parseCost(model.cost.output),
          reasoningPerMillion: model.isReasoning ? parseCost(model.cost.output) * 1.5 : undefined,
        },
        limits: {
          maxTokens: model.maxOutputTokens || 4000,
          contextWindow: model.contextWindow || 128000,
        },
      };
    });

    res.json(models);
  } catch (error) {
    console.error('Error fetching models:', error);
    res.status(500).json({ error: "Failed to fetch models" });
  }
});

// Compare models endpoint - protected with authentication and credit check
router.post("/compare", ensureDeviceUser, checkDeviceCredits, async (req, res) => {
  try {
    const { prompt, modelIds } = compareModelsSchema.parse(req.body);

    // Use ModelService for parallel model calls
    const responses = await modelService.compareModels(prompt, modelIds, req);

    // Deduct credits for successful API calls (5 credits per model called)
    const successfulCalls = modelIds.filter(modelId => responses[modelId]?.status === 'success').length;
    await deductCreditsForSuccessfulCalls(req, successfulCalls, 5);

    // Store the comparison
    const storage = await getStorage();
    const comparison = await storage.createComparison({
      prompt,
      selectedModels: modelIds,
      responses,
    });

    return ApiResponse.success(res, {
      id: comparison.id,
      responses,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return ApiResponse.error(res, "Invalid request data", 400, error.errors);
    } else {
      console.error("Compare models error:", error);
      return ApiResponse.error(res, "Failed to compare models", 500, error instanceof Error ? error.message : 'Unknown error');
    }
  }
});

// Get comparison history
router.get("/comparisons", async (req, res) => {
  try {
    const storage = await getStorage();
    const comparisons = await storage.getComparisons();
    res.json(comparisons);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch comparisons" });
  }
});

// Get specific comparison
router.get("/comparisons/:id", async (req, res) => {
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
router.post("/respond", async (req, res) => {
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

export { router as modelsRoutes };
*/
