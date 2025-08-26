/**
 * Server Entry Point - Express Application Bootstrap
 * 
 * This is the main server entry point that initializes and starts the Express.js
 * application. It handles:
 * 
 * - Express server setup with middleware configuration
 * - Static file serving for the Vite frontend application
 * - API route registration and middleware setup
 * - Session management with PostgreSQL store
 * - Environment configuration and error handling
 * - Development vs production mode detection
 * - Server startup and port binding
 * 
 * The server integrates the frontend Vite build with the backend API,
 * providing a unified application served from a single port.
 * 
 * Author: Replit Agent
 * Date: August 9, 2025
 */

import { config } from "dotenv";

// Load environment variables first
config();

import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { TemplateValidator } from "./template-validator.js";
import { TemplateCompiler } from "./template-compiler.js";
import { initializeDatabaseManager } from "./db.js";
import { formatErrorResponse } from "./errors.js";
import { requestContextMiddleware, requestCompletionLogger, contextLog, contextError } from "./request-context.js";

const app = express();

// Request context tracing middleware (must be first)
app.use(requestContextMiddleware());
app.use(requestCompletionLogger());

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// JSON response capturing for debugging (optional)
app.use((req, res, next) => {
  if (req.path.startsWith("/api")) {
    const originalResJson = res.json;
    res.json = function (bodyJson, ...args) {
      // Context logging will handle request completion
      return originalResJson.apply(res, [bodyJson, ...args]);
    };
  }
  next();
});

(async () => {
  const server = await registerRoutes(app);

  // Validate all templates at startup
  contextLog('Validating templates...');
  const templateValidator = new TemplateValidator();
  const validationResult = await templateValidator.validateAllTemplates();
  
  if (!validationResult.isValid) {
    contextError('Template validation failed:');
    validationResult.errors.forEach(error => {
      contextError(`  - ${error.file}${error.category ? ` (${error.category})` : ''}${error.template ? ` [${error.template}]` : ''}: ${error.error}`);
    });
    process.exit(1);
  }
  
  if (validationResult.warnings.length > 0) {
    contextLog('⚠️ Template validation warnings:');
    validationResult.warnings.forEach(warning => {
      contextLog(`  - ${warning}`);
    });
  }
  
  contextLog('✅ Template validation completed successfully');

  // Compile and cache all templates
  const templateCompiler = new TemplateCompiler();
  await templateCompiler.compileAllTemplates();
  
  // Make template compiler available to routes
  app.locals.templateCompiler = templateCompiler;

  // Initialize database manager with connection pooling
  const databaseManager = await initializeDatabaseManager();
  if (databaseManager) {
    app.locals.databaseManager = databaseManager;
    contextLog('✅ Database connection pool initialized');
  } else {
    contextLog('⚠️ No database configured - using in-memory storage');
  }

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const errorResponse = formatErrorResponse(err);
    
    // Log error with context for debugging
    if (errorResponse.statusCode >= 500) {
      contextError(`Server error: ${err.message}`, err.stack);
    } else {
      contextLog(`Client error ${errorResponse.statusCode}: ${err.message}`);
    }
    
    res.status(errorResponse.statusCode).json(errorResponse);
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  const host = app.get("env") === "development" ? "localhost" : "0.0.0.0";
  server.listen({
    port,
    host,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
