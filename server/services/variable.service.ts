/*
 * Author: Cascade
 * Date: October 14, 2025 and 7:23pm UTC-04:00
 * PURPOSE: This service file provides variable resolution logic for prompt templates, handling template rendering and validation. It integrates with the variable-engine for prompt processing.
 * SRP/DRY check: Pass - Focused solely on variable service logic. Variable resolution patterns were repeated in routes; this centralizes them. Reviewed existing variable code to ensure no duplication.
 */
import { VariableEngine } from "../../shared/variable-engine.js";
import { validateVariables, type ModeType } from "../../shared/variable-registry.js";

export class VariableService {
  resolveVariables(template: string, variables: Record<string, any>, mode: string) {
    const engine = new VariableEngine({ policy: 'error' });
    return engine.renderFinal(template, variables);
  }

  validateModeVariables(mode: ModeType, variables: Record<string, any>) {
    return validateVariables(mode, variables);
  }
}

export const variableService = new VariableService();
