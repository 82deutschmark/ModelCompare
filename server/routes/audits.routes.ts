/*
 * Author: Cascade
 * Date: October 14, 2025 and 7:23pm UTC-04:00
 * PURPOSE: This routes file handles audit logging endpoints for research and analysis of prompt resolutions. It integrates with storage for audit persistence.
 * SRP/DRY check: Pass - Focused solely on audit logic. Audit patterns were repeated in the monolithic routes.ts; this extracts them. Reviewed existing audit code to ensure no duplication.
 */
import { Router } from "express";
import { getStorage } from "../storage.js";

const router = Router();

// Prompt Audit Endpoints for Research and Analysis
router.get("/", async (req, res) => {
  try {
    const { templateId } = req.query;
    const storage = await getStorage();
    const audits = await storage.getPromptAudits(templateId as string);

    res.json({
      audits: audits.map(audit => ({
        id: audit.id,
        templateId: audit.templateId,
        variables: audit.variables,
        modelId: audit.modelId,
        responseTime: audit.responseTime,
        tokenUsage: audit.tokenUsage,
        cost: audit.cost,
        createdAt: audit.createdAt,
        messageCount: Array.isArray(audit.messageStructure) ? audit.messageStructure.length : 0
      }))
    });
  } catch (error) {
    console.error("Get audits error:", error);
    res.status(500).json({ error: "Failed to get audit records" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const storage = await getStorage();
    const audit = await storage.getPromptAudit(id);

    if (!audit) {
      return res.status(404).json({ error: "Audit record not found" });
    }

    res.json(audit);
  } catch (error) {
    console.error("Get audit error:", error);
    res.status(500).json({ error: "Failed to get audit record" });
  }
});

export { router as auditsRoutes };
