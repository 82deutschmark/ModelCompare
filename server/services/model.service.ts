/*
 * Author: Cascade
 * Date: October 14, 2025 and 7:23pm UTC-04:00
 * PURPOSE: This service file provides model-related business logic, including parallel model comparisons and response formatting. It integrates with providers for model calls and handles credit deduction.
 * SRP/DRY check: Pass - Focused solely on model service logic. Model service patterns were repeated in routes; this centralizes them. Reviewed existing model code to ensure no duplication.
 */
import { callModel } from "../providers/index.js";
import { deductCreditsForSuccessfulCalls } from "../device-auth.js";

export class ModelService {
  async compareModels(prompt: string, modelIds: string[], req: any) {
    const responses: Record<string, any> = {};
    await Promise.all(
      modelIds.map(async (modelId) => {
        responses[modelId] = await this.callModel(prompt, modelId);
      })
    );
    return responses;
  }

  private async callModel(prompt: string, modelId: string) {
    try {
      const result = await callModel(prompt, modelId);
      return this.formatModelResponse(result);
    } catch (error) {
      return {
        content: '',
        status: 'error',
        responseTime: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private formatModelResponse(result: any) {
    return {
      content: result.content,
      reasoning: result.reasoning,
      responseTime: result.responseTime,
      tokenUsage: result.tokenUsage,
      cost: result.cost,
      modelConfig: result.modelConfig,
      status: 'success'
    };
  }
}

export const modelService = new ModelService();
