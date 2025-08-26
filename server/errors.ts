/**
 * Standardized Error Handling System
 * 
 * Provides consistent error types and response formatting across all API endpoints.
 * Replaces generic Error instances with domain-specific error classes.
 * 
 * Author: Claude Code
 * Date: 2025-08-26
 */

export abstract class ModelCompareError extends Error {
  abstract readonly code: string;
  abstract readonly statusCode: number;
  readonly context: Record<string, any>;

  constructor(message: string, context: Record<string, any> = {}) {
    super(message);
    this.context = context;
    this.name = this.constructor.name;
  }

  toJSON() {
    return {
      error: this.code,
      message: this.message,
      context: this.context,
      statusCode: this.statusCode
    };
  }
}

export class TemplateError extends ModelCompareError {
  readonly code = 'TEMPLATE_ERROR';
  readonly statusCode = 400;
  
  constructor(message: string, context: Record<string, any> = {}) {
    super(message, context);
  }
}

export class ProviderError extends ModelCompareError {
  readonly code = 'PROVIDER_ERROR';
  readonly statusCode = 502;
  
  constructor(message: string, context: Record<string, any> = {}) {
    super(message, context);
  }
}

export class ValidationError extends ModelCompareError {
  readonly code = 'VALIDATION_ERROR';
  readonly statusCode = 400;
  
  constructor(message: string, context: Record<string, any> = {}) {
    super(message, context);
  }
}

export class ModelNotFoundError extends ModelCompareError {
  readonly code = 'MODEL_NOT_FOUND';
  readonly statusCode = 404;
  
  constructor(modelId: string) {
    super(`Model not found: ${modelId}`, { modelId });
  }
}

export class CircuitBreakerError extends ModelCompareError {
  readonly code = 'SERVICE_UNAVAILABLE';
  readonly statusCode = 503;
  
  constructor(providerName: string, failureCount: number) {
    super(`${providerName} service temporarily unavailable`, { 
      providerName, 
      failureCount,
      retryAfter: 30 
    });
  }
}

export class DatabaseError extends ModelCompareError {
  readonly code = 'DATABASE_ERROR';
  readonly statusCode = 500;
  
  constructor(message: string, context: Record<string, any> = {}) {
    super(message, context);
  }
}

/**
 * Error response middleware for consistent API error formatting
 */
export function formatErrorResponse(error: Error): {
  error: string;
  message: string;
  context?: Record<string, any>;
  statusCode: number;
} {
  if (error instanceof ModelCompareError) {
    return {
      error: error.code,
      message: error.message,
      context: Object.keys(error.context).length > 0 ? error.context : undefined,
      statusCode: error.statusCode
    };
  }

  // Handle generic errors
  return {
    error: 'INTERNAL_ERROR',
    message: error.message || 'An unexpected error occurred',
    statusCode: 500
  };
}