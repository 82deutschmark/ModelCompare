/*
 * Author: Cascade
 * Date: October 14, 2025 and 7:23pm UTC-04:00
 * PURPOSE: This middleware file provides centralized error handling utilities for Express routes, including an async handler wrapper to catch promise rejections and a global error handler that logs errors using the request context and returns standardized error responses. It touches error logging in request-context.ts and integrates with Express error handling middleware.
 * SRP/DRY check: Pass - This file has a single responsibility for error handling. Error handling patterns exist in the project but are repeated across routes; this centralizes them. Reviewed existing middleware and routes to ensure no duplication.
 */
import { Request, Response, NextFunction } from "express";
import { contextError } from "../request-context.js";

export const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  contextError('Request error:', err);
  res.status(err.statusCode || 500).json({
    error: err.message || 'Internal server error'
  });
};
