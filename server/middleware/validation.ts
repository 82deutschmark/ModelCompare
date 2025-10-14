/*
 * Author: Cascade
 * Date: October 14, 2025 and 7:23pm UTC-04:00
 * PURPOSE: This middleware file provides request validation utilities using Zod schemas to validate incoming request bodies before processing in routes. It integrates with Express middleware and touches Zod validation across the project for consistent input validation.
 * SRP/DRY check: Pass - Focused solely on validation logic. Validation patterns exist in routes but are repeated; this centralizes Zod schema handling. Checked existing validation in routes.ts to avoid duplication.
 */
import { Request, Response, NextFunction } from "express";
import { ZodSchema } from "zod";

export const validateRequest = (schema: ZodSchema) => (req: Request, res: Response, next: NextFunction) => {
  try {
    schema.parse(req.body);
    next();
  } catch (error) {
    res.status(400).json({ error: 'Validation failed', details: (error as any).errors });
  }
};
