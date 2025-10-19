/*
 * Author: Cascade
 * Date: October 14, 2025 and 7:23pm UTC-04:00
 * PURPOSE: This routes file handles health check endpoints for monitoring application status, including basic, detailed, and readiness checks. It integrates with database-manager and providers for health assessment.
 * SRP/DRY check: Pass - Focused solely on health logic. Health patterns were repeated in the monolithic routes.ts; this extracts them. Reviewed existing health code to ensure no duplication.
 */
import { Router } from "express";
import { getDatabaseManager } from "../db.js";
import { getAllModels } from "../providers/index.js";
import { contextLog } from "../request-context.js";

const router = Router();

// Health Check Endpoints for Monitoring
router.get("/", async (req, res) => {
  try {
    const health = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.version
    };

    contextLog("Health check requested");
    res.json(health);
  } catch (error) {
    console.error("Health check error:", error);
    res.status(503).json({
      status: "unhealthy",
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.get("/detailed", async (req, res) => {
  try {
    const databaseManager = getDatabaseManager();

    // Check database health
    const dbHealth = databaseManager
      ? await databaseManager.healthCheck()
      : { isHealthy: true, message: "No database configured" };

    // Check providers health (basic check)
    const models = getAllModels();
    const providerHealth = {
      totalProviders: new Set(models.map(m => m.provider)).size,
      totalModels: models.length,
      providers: Array.from(new Set(models.map(m => m.provider)))
    };

    // System health
    const memUsage = process.memoryUsage();
    const systemHealth = {
      uptime: process.uptime(),
      memory: {
        used: Math.round(memUsage.heapUsed / 1024 / 1024),
        total: Math.round(memUsage.heapTotal / 1024 / 1024),
        external: Math.round(memUsage.external / 1024 / 1024)
      },
      cpu: process.cpuUsage(),
      platform: process.platform,
      nodeVersion: process.version
    };

    const health = {
      status: dbHealth.isHealthy ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      services: {
        database: dbHealth,
        providers: providerHealth,
        system: systemHealth
      }
    };

    contextLog("Detailed health check requested", {
      dbHealthy: dbHealth.isHealthy,
      providerCount: providerHealth.totalProviders
    });

    res.json(health);
  } catch (error) {
    console.error("Detailed health check error:", error);
    res.status(503).json({
      status: "unhealthy",
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

router.get("/ready", async (req, res) => {
  try {
    // Readiness check - all critical services must be operational
    const databaseManager = getDatabaseManager();
    const dbReady = databaseManager
      ? (await databaseManager.healthCheck()).isHealthy
      : true; // No DB is fine for readiness

    const templateCompiler = req.app.locals.templateCompiler;
    const templatesReady = templateCompiler && templateCompiler.getAllTemplates().length > 0;

    const isReady = dbReady && templatesReady;

    const readiness = {
      ready: isReady,
      timestamp: new Date().toISOString(),
      checks: {
        database: dbReady,
        templates: templatesReady
      }
    };

    contextLog("Readiness check requested", { ready: isReady });

    if (isReady) {
      res.json(readiness);
    } else {
      res.status(503).json(readiness);
    }
  } catch (error) {
    console.error("Readiness check error:", error);
    res.status(503).json({
      ready: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

export { router as healthRoutes };
