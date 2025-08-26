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
import { formatErrorResponse } from "./errors.js";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  // Validate all templates at startup
  log('Validating templates...');
  const templateValidator = new TemplateValidator();
  const validationResult = await templateValidator.validateAllTemplates();
  
  if (!validationResult.isValid) {
    log('❌ Template validation failed:');
    validationResult.errors.forEach(error => {
      log(`  - ${error.file}${error.category ? ` (${error.category})` : ''}${error.template ? ` [${error.template}]` : ''}: ${error.error}`);
    });
    process.exit(1);
  }
  
  if (validationResult.warnings.length > 0) {
    log('⚠️ Template validation warnings:');
    validationResult.warnings.forEach(warning => {
      log(`  - ${warning}`);
    });
  }
  
  log('✅ Template validation completed successfully');

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const errorResponse = formatErrorResponse(err);
    
    // Log error for debugging
    if (errorResponse.statusCode >= 500) {
      log(`❌ Server error: ${err.message}`, err.stack);
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
