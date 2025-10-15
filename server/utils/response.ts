/*
 * Author: Cascade
 * Date: October 14, 2025 and 7:23pm UTC-04:00
 * PURPOSE: This utility file provides standardized response formatting for API endpoints, including success, error, and model response helpers. It integrates with Express responses and touches response patterns across the application.
 * SRP/DRY check: Pass - Focused solely on response utilities. Response formatting patterns were repeated in routes; this centralizes them. Reviewed existing response code to ensure no duplication.
 */
import { Response } from "express";

export class ApiResponse {
  static success(res: Response, data: any, statusCode = 200) {
    return res.status(statusCode).json(data);
  }

  static error(res: Response, message: string, statusCode = 500, details?: any) {
    return res.status(statusCode).json({
      error: message,
      ...(details && { details })
    });
  }

  static modelResponse(res: Response, result: any) {
    return res.json({
      content: result.content,
      reasoning: result.reasoning,
      responseTime: result.responseTime,
      tokenUsage: result.tokenUsage,
      cost: result.cost,
      modelConfig: result.modelConfig
    });
  }

  static streamingEvent(res: Response, event: string, data: any) {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  }
}
