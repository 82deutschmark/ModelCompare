/**
 * Request Context and Correlation ID System
 * 
 * Provides request tracing capabilities with correlation IDs that flow through
 * all operations, making debugging and monitoring much easier.
 * 
 * Author: Claude Code
 * Date: 2025-08-26
 */

import { randomUUID } from 'crypto';
import { Request, Response, NextFunction } from 'express';

export interface RequestContext {
  correlationId: string;
  startTime: Date;
  method: string;
  url: string;
  userAgent?: string;
  ip?: string;
  userId?: string;
}

// Global context storage using Node.js AsyncLocalStorage
import { AsyncLocalStorage } from 'async_hooks';
const requestContextStorage = new AsyncLocalStorage<RequestContext>();

/**
 * Middleware to create and maintain request context throughout the request lifecycle
 */
export function requestContextMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    const correlationId = req.headers['x-correlation-id'] as string || 
                         req.headers['correlation-id'] as string ||
                         randomUUID();
    
    const context: RequestContext = {
      correlationId,
      startTime: new Date(),
      method: req.method,
      url: req.url,
      userAgent: req.headers['user-agent'],
      ip: req.ip || req.socket.remoteAddress
    };

    // Set response header for client correlation
    res.setHeader('X-Correlation-ID', correlationId);

    // Store context for the entire request lifecycle
    requestContextStorage.run(context, () => {
      next();
    });
  };
}

/**
 * Get the current request context
 */
export function getCurrentContext(): RequestContext | undefined {
  return requestContextStorage.getStore();
}

/**
 * Get the current correlation ID
 */
export function getCorrelationId(): string {
  const context = getCurrentContext();
  return context?.correlationId || 'no-context';
}

/**
 * Add request duration to context for logging
 */
export function getRequestDuration(): number {
  const context = getCurrentContext();
  if (!context) return 0;
  
  return Date.now() - context.startTime.getTime();
}

/**
 * Enhanced logging function that includes context information
 */
export function contextLog(message: string, data?: any): void {
  const context = getCurrentContext();
  const timestamp = new Date().toISOString();
  
  if (context) {
    const duration = getRequestDuration();
    console.log(`[${timestamp}] [${context.correlationId}] [${context.method} ${context.url}] [${duration}ms] ${message}`, data || '');
  } else {
    console.log(`[${timestamp}] [no-context] ${message}`, data || '');
  }
}

/**
 * Error logging with context
 */
export function contextError(message: string, error?: Error | any): void {
  const context = getCurrentContext();
  const timestamp = new Date().toISOString();
  
  if (context) {
    const duration = getRequestDuration();
    console.error(`[${timestamp}] [${context.correlationId}] [${context.method} ${context.url}] [${duration}ms] ❌ ${message}`, error);
  } else {
    console.error(`[${timestamp}] [no-context] ❌ ${message}`, error);
  }
}

/**
 * Warning logging with context
 */
export function contextWarn(message: string, data?: any): void {
  const context = getCurrentContext();
  const timestamp = new Date().toISOString();
  
  if (context) {
    const duration = getRequestDuration();
    console.warn(`[${timestamp}] [${context.correlationId}] [${context.method} ${context.url}] [${duration}ms] ⚠️ ${message}`, data || '');
  } else {
    console.warn(`[${timestamp}] [no-context] ⚠️ ${message}`, data || '');
  }
}

/**
 * Middleware to log request completion with duration
 */
export function requestCompletionLogger() {
  return (req: Request, res: Response, next: NextFunction) => {
    // Capture original end method
    const originalEnd = res.end;
    
    res.end = function(chunk?: any, encoding?: any) {
      const context = getCurrentContext();
      if (context) {
        const duration = getRequestDuration();
        const statusColor = res.statusCode >= 400 ? '🔴' : res.statusCode >= 300 ? '🟡' : '🟢';
        contextLog(`${statusColor} ${req.method} ${req.url} ${res.statusCode} (${duration}ms)`);
      }
      
      // Call original end method
      originalEnd.call(this, chunk, encoding);
    };
    
    next();
  };
}

/**
 * Helper to run async operations with context propagation
 */
export async function withContext<T>(context: RequestContext, operation: () => Promise<T>): Promise<T> {
  return requestContextStorage.run(context, operation);
}

/**
 * Helper to create a child context for sub-operations
 */
export function createChildContext(additionalData: Partial<RequestContext> = {}): RequestContext {
  const parent = getCurrentContext();
  
  return {
    correlationId: parent?.correlationId || randomUUID(),
    startTime: new Date(),
    method: parent?.method || 'UNKNOWN',
    url: parent?.url || '/',
    ...additionalData
  };
}