/*
 * Author: Cascade
 * Date: October 14, 2025 and 7:23pm UTC-04:00
 * PURPOSE: This routes file handles template API endpoints for server-side template processing, including listing modes, categories, and specific templates. It integrates with template-compiler for dynamic template management.
 * SRP/DRY check: Pass - Focused solely on template logic. Template patterns were repeated in the monolithic routes.ts; this extracts them. Reviewed existing template code to ensure no duplication.
 */
import { Router } from "express";
import { contextLog } from "../request-context.js";

const router = Router();

// GET /api/templates - List all available modes
router.get("/", async (req, res) => {
  try {
    const templateCompiler = req.app.locals.templateCompiler;
    if (!templateCompiler) {
      return res.status(503).json({ error: "Template compiler not initialized" });
    }

    const allCategories = templateCompiler.getAllCategories();
    const modes = Array.from(new Set(allCategories.map((cat: any) => cat.mode).filter(Boolean)));

    const modesSummary = modes.map(mode => ({
      mode,
      categories: allCategories
        .filter((cat: any) => cat.mode === mode)
        .map((cat: any) => ({
          id: cat.id,
          name: cat.name,
          templateCount: cat.templates.length
        }))
    }));

    contextLog("Template modes requested", { modesCount: modes.length });
    res.json({ modes: modesSummary });
  } catch (error) {
    console.error("Template modes error:", error);
    res.status(500).json({ error: "Failed to get template modes" });
  }
});

// GET /api/templates/:mode - Get all templates for a specific mode
router.get("/:mode", async (req, res) => {
  try {
    const { mode } = req.params;
    const templateCompiler = req.app.locals.templateCompiler;

    if (!templateCompiler) {
      return res.status(503).json({ error: "Template compiler not initialized" });
    }

    const structuredTemplates = templateCompiler.getStructuredTemplatesByMode(mode);
    if (!structuredTemplates || structuredTemplates.length === 0) {
      return res.status(404).json({ error: `No templates found for mode: ${mode}` });
    }

    // Group templates by category
    const categoriesMap = new Map();
    for (const template of structuredTemplates) {
      if (!categoriesMap.has(template.category)) {
        categoriesMap.set(template.category, {
          id: template.category.toLowerCase().replace(/[^a-z0-9]/g, '-'),
          name: template.category,
          templates: []
        });
      }
      categoriesMap.get(template.category).templates.push(template);
    }

    const response = {
      mode,
      categories: Array.from(categoriesMap.values()),
      templateCount: structuredTemplates.length
    };

    contextLog("Structured templates requested", { mode, templatesCount: structuredTemplates.length });
    res.json(response);
  } catch (error) {
    console.error("Mode templates error:", error);
    res.status(500).json({ error: "Failed to get mode templates" });
  }
});

// GET /api/templates/:mode/:category - Get all templates in a category
router.get("/:mode/:category", async (req, res) => {
  try {
    const { mode, category } = req.params;
    const templateCompiler = req.app.locals.templateCompiler;

    if (!templateCompiler) {
      return res.status(503).json({ error: "Template compiler not initialized" });
    }

    const structuredTemplates = templateCompiler.getStructuredTemplatesByMode(mode);
    const categoryTemplates = structuredTemplates.filter((t: any) =>
      t.category.toLowerCase().replace(/[^a-z0-9]/g, '-') === category
    );

    if (categoryTemplates.length === 0) {
      return res.status(404).json({ error: `Category '${category}' not found in mode '${mode}'` });
    }

    const response = {
      mode,
      category: {
        id: category,
        name: categoryTemplates[0].category,
        templates: categoryTemplates
      }
    };

    contextLog("Category templates requested", { mode, category, templatesCount: categoryTemplates.length });
    res.json(response);
  } catch (error) {
    console.error("Category templates error:", error);
    res.status(500).json({ error: "Failed to get category templates" });
  }
});

// GET /api/templates/:mode/:category/:template - Get specific template
router.get("/:mode/:category/:template", async (req, res) => {
  try {
    const { mode, category, template } = req.params;
    const templateCompiler = req.app.locals.templateCompiler;

    if (!templateCompiler) {
      return res.status(503).json({ error: "Template compiler not initialized" });
    }

    const templateId = `${category}:${template}`;
    const templateData = templateCompiler.getTemplate(templateId);

    if (!templateData || templateData.mode !== mode) {
      return res.status(404).json({ error: `Template '${template}' not found in category '${category}' for mode '${mode}'` });
    }

    const response = {
      id: templateData.id,
      name: templateData.name,
      mode: templateData.mode,
      category: templateData.category,
      content: templateData.content,
      variables: templateData.variables,
      metadata: {
        filePath: templateData.filePath,
        lastModified: new Date().toISOString(),
        version: "1.0.0"
      }
    };

    contextLog("Specific template requested", { templateId, mode, category });
    res.json(response);
  } catch (error) {
    console.error("Specific template error:", error);
    res.status(500).json({ error: "Failed to get specific template" });
  }
});

export { router as templatesRoutes };
