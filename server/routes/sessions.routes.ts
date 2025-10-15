/*
 * Author: Cascade
 * Date: October 14, 2025 and 7:23pm UTC-04:00
 * PURPOSE: This routes file handles Vixra session persistence endpoints for saving and retrieving session data. It integrates with storage for session management.
 * SRP/DRY check: Pass - Focused solely on session logic. Session patterns were repeated in the monolithic routes.ts; this extracts them. Reviewed existing session code to ensure no duplication.
 */
import { Router } from "express";
import { getStorage } from "../storage.js";

const router = Router();

// Vixra session persistence endpoints
router.post("/", async (req, res) => {
  try {
    const { variables, template, responses } = req.body;

    if (!variables || !template) {
      return res.status(400).json({ error: "Missing variables or template" });
    }

    const storage = await getStorage();
    const session = await storage.createVixraSession({
      variables,
      template,
      responses: responses || {}
    });

    res.json(session);
  } catch (error) {
    console.error("Create Vixra session error:", error);
    res.status(500).json({ error: "Failed to create session" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const storage = await getStorage();
    const session = await storage.updateVixraSession(id, updates);
    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    res.json(session);
  } catch (error) {
    console.error("Update Vixra session error:", error);
    res.status(500).json({ error: "Failed to update session" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const storage = await getStorage();
    const session = await storage.getVixraSession(id);

    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    res.json(session);
  } catch (error) {
    console.error("Get Vixra session error:", error);
    res.status(500).json({ error: "Failed to get session" });
  }
});

router.get("/", async (req, res) => {
  try {
    const storage = await getStorage();
    const sessions = await storage.getVixraSessions();
    res.json(sessions);
  } catch (error) {
    console.error("Get Vixra sessions error:", error);
    res.status(500).json({ error: "Failed to get sessions" });
  }
});

export { router as sessionsRoutes };
