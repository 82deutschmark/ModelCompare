/**
 * PromptBuilder - Server-Side Structured Message Construction
 * 
 * This class handles the server-side construction of structured message arrays
 * from templates with proper system/user/context message separation.
 * 
 * Key features:
 * - Server-side variable resolution with validation
 * - Structured message array construction
 * - Audit trail generation for prompt injection research
 * - Template integrity protection
 * 
 * Author: Claude Code (GPT-5 medium reasoning)
 * Date: 2025-08-26
 * 
 * What this file does: Converts structured templates into message arrays with
 * proper role separation and variable resolution for AI model providers.
 * How it works: Takes StructuredTemplate, resolves variables server-side, and
 * builds ModelMessage[] arrays with system/user/context separation.
 * How the project uses it: Called by /api/generate-structured endpoint to
 * construct messages before sending to AI providers with proper audit trails.
 */

import { VariableEngine } from '../shared/variable-engine.js';
import type { 
  StructuredTemplate, 
  ModelMessage, 
  PromptAudit 
} from '../shared/api-types.js';

export class PromptBuilder {
  private template: StructuredTemplate;
  private variables: Record<string, string> = {};
  private context: string = '';
  private additionalSystemInstructions: string[] = [];
  private variableEngine: VariableEngine;

  constructor(template: StructuredTemplate) {
    this.template = template;
    this.variableEngine = new VariableEngine({ policy: 'error' });
  }

  setVariables(variables: Record<string, string>): this {
    this.variables = { ...variables };
    return this;
  }

  setContext(context: string): this {
    this.context = context;
    return this;
  }

  addSystemInstruction(instruction: string): this {
    this.additionalSystemInstructions.push(instruction);
    return this;
  }

  buildMessages(): ModelMessage[] {
    const messages: ModelMessage[] = [];

    // 1. Build system message if system instructions exist
    if (this.template.structure.systemInstructions) {
      const systemContent = this.resolveTemplate(this.template.structure.systemInstructions);
      
      // Add additional system instructions if provided
      const fullSystemContent = this.additionalSystemInstructions.length > 0
        ? [systemContent, ...this.additionalSystemInstructions].join('\n\n')
        : systemContent;

      messages.push({
        role: 'system',
        content: fullSystemContent,
        metadata: {
          templateId: this.template.id,
          variables: this.variables
        }
      });
    }

    // 2. Build context message if context template exists
    if (this.template.structure.contextTemplate) {
      const contextVariables = { ...this.variables, context: this.context };
      const contextContent = this.resolveTemplate(this.template.structure.contextTemplate, contextVariables);
      
      messages.push({
        role: 'context',
        content: contextContent,
        metadata: {
          templateId: this.template.id,
          variables: contextVariables
        }
      });
    }

    // 3. Build user message from user template
    const userContent = this.resolveTemplate(this.template.structure.userTemplate);
    messages.push({
      role: 'user',
      content: userContent,
      metadata: {
        templateId: this.template.id,
        variables: this.variables
      }
    });

    // 4. Add response guidelines as additional context if they exist
    if (this.template.structure.responseGuidelines) {
      const guidelinesContent = this.resolveTemplate(this.template.structure.responseGuidelines);
      
      // Append guidelines to system message if it exists, otherwise create new system message
      const systemMessageIndex = messages.findIndex(m => m.role === 'system');
      if (systemMessageIndex >= 0) {
        messages[systemMessageIndex].content += '\n\n**Response Guidelines:**\n' + guidelinesContent;
      } else {
        messages.unshift({
          role: 'system',
          content: '**Response Guidelines:**\n' + guidelinesContent,
          metadata: {
            templateId: this.template.id,
            variables: this.variables
          }
        });
      }
    }

    return messages;
  }

  getAuditInfo(): PromptAudit {
    const resolvedSections = {
      systemInstructions: this.template.structure.systemInstructions 
        ? this.resolveTemplate(this.template.structure.systemInstructions)
        : undefined,
      userContent: this.resolveTemplate(this.template.structure.userTemplate),
      contextContent: this.template.structure.contextTemplate
        ? this.resolveTemplate(this.template.structure.contextTemplate, { ...this.variables, context: this.context })
        : undefined
    };

    return {
      templateId: this.template.id,
      variables: this.variables,
      resolvedSections,
      timestamp: new Date().toISOString(),
      messageStructure: this.buildMessages()
    };
  }

  private resolveTemplate(template: string, customVariables?: Record<string, string>): string {
    const variablesToUse = customVariables || this.variables;
    
    try {
      const resolution = this.variableEngine.renderFinal(template, variablesToUse);
      
      if (resolution.warnings.length > 0) {
        console.warn(`Template resolution warnings for ${this.template.id}:`, resolution.warnings);
      }
      
      return resolution.resolved;
    } catch (error) {
      throw new Error(`Variable resolution failed for template ${this.template.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
