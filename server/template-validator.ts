/**
 * Template Validation at Server Startup
 * 
 * Validates all markdown templates and their variable placeholders at startup
 * to catch template errors before they cause runtime failures.
 * 
 * Author: Claude Code
 * Date: 2025-08-26
 */

import fs from 'fs';
import path from 'path';
import { VariableEngine } from '../shared/variable-engine.js';
import { VARIABLE_REGISTRIES, validateVariables, type ModeType } from '../shared/variable-registry.js';
import { getTemplateConfig } from './config.js';

export interface TemplateValidationError {
  file: string;
  category?: string;
  template?: string;
  error: string;
}

export interface TemplateValidationResult {
  isValid: boolean;
  errors: TemplateValidationError[];
  warnings: string[];
}

export class TemplateValidator {
  private docsPath: string;

  constructor(docsPath?: string) {
    const templateConfig = getTemplateConfig();
    this.docsPath = path.resolve(docsPath || templateConfig.docsPath);
  }

  async validateAllTemplates(): Promise<TemplateValidationResult> {
    const errors: TemplateValidationError[] = [];
    const warnings: string[] = [];

    try {
      // Check if docs directory exists
      if (!fs.existsSync(this.docsPath)) {
        errors.push({
          file: 'docs',
          error: `Templates directory not found: ${this.docsPath}`
        });
        return { isValid: false, errors, warnings };
      }

      // Get all markdown files
      const files = fs.readdirSync(this.docsPath)
        .filter(f => f.endsWith('.md'))
        .filter(f => !f.includes('architecture-modernization-plan')); // Skip non-template docs

      for (const file of files) {
        const filePath = path.join(this.docsPath, file);
        const result = await this.validateTemplateFile(filePath);
        errors.push(...result.errors);
        warnings.push(...result.warnings);
      }

      // Check for mode-specific template coverage
      const modeValidation = this.validateModeTemplateMapping(files);
      warnings.push(...modeValidation);

      return {
        isValid: errors.length === 0,
        errors,
        warnings
      };

    } catch (error) {
      errors.push({
        file: 'system',
        error: `Template validation system error: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
      return { isValid: false, errors, warnings };
    }
  }

  private async validateTemplateFile(filePath: string): Promise<{ errors: TemplateValidationError[]; warnings: string[] }> {
    const errors: TemplateValidationError[] = [];
    const warnings: string[] = [];
    const fileName = path.basename(filePath);

    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      
      // Basic markdown structure validation
      if (!content.includes('##')) {
        errors.push({
          file: fileName,
          error: 'No category headers (##) found in template file'
        });
        return { errors, warnings };
      }

      // Parse categories and templates
      const categories = this.parseMarkdownContent(content);
      
      for (const category of categories) {
        for (const template of category.prompts) {
          // Validate template syntax with variable engine
          try {
            const variableEngine = new VariableEngine({ policy: 'warn' });
            const testVariables: Record<string, string> = {};
            
            // Extract variable names from template
            const variableMatches = template.content.match(/\{([^}]+)\}/g) || [];
            variableMatches.forEach(match => {
              const varName = match.slice(1, -1).split('|')[0]; // Handle default values
              testVariables[varName] = `test_${varName}`;
            });

            // Test variable resolution
            variableEngine.renderFinal(template.content, testVariables);
            
          } catch (error) {
            errors.push({
              file: fileName,
              category: category.name,
              template: template.name,
              error: `Template syntax error: ${error instanceof Error ? error.message : 'Unknown error'}`
            });
          }
        }
      }

    } catch (error) {
      errors.push({
        file: fileName,
        error: `Failed to read template file: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }

    return { errors, warnings };
  }

  private parseMarkdownContent(markdown: string) {
    const categories: Array<{ name: string; prompts: Array<{ name: string; content: string }> }> = [];
    const lines = markdown.split('\\n');
    
    let currentCategory: { name: string; prompts: Array<{ name: string; content: string }> } | null = null;
    let currentPrompt: { name: string; content: string } | null = null;
    let collectingContent = false;
    let contentLines: string[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Category header (## Category Name)
      if (line.startsWith('## ') && !line.includes('Author') && !line.includes('Date')) {
        // Save previous prompt if exists
        if (currentPrompt && currentCategory) {
          currentPrompt.content = contentLines.join('\\n').trim();
          currentCategory.prompts.push(currentPrompt);
        }
        
        // Save previous category if exists
        if (currentCategory) {
          categories.push(currentCategory);
        }
        
        // Start new category
        const categoryName = line.substring(3).trim();
        currentCategory = {
          name: categoryName,
          prompts: []
        };
        currentPrompt = null;
        collectingContent = false;
        contentLines = [];
      }
      // Prompt header (### Prompt Name)
      else if (line.startsWith('### ') && currentCategory) {
        // Save previous prompt if exists
        if (currentPrompt) {
          currentPrompt.content = contentLines.join('\\n').trim();
          currentCategory.prompts.push(currentPrompt);
        }
        
        // Start new prompt
        const promptName = line.substring(4).trim();
        currentPrompt = {
          name: promptName,
          content: ''
        };
        collectingContent = true;
        contentLines = [];
      }
      // Content lines
      else if (collectingContent && currentPrompt && line !== '') {
        contentLines.push(line);
      }
      // Empty line - continue collecting if we're in content mode
      else if (collectingContent && line === '') {
        contentLines.push('');
      }
    }
    
    // Save final prompt and category
    if (currentPrompt && currentCategory) {
      currentPrompt.content = contentLines.join('\\n').trim();
      currentCategory.prompts.push(currentPrompt);
    }
    if (currentCategory) {
      categories.push(currentCategory);
    }
    
    return categories;
  }

  private validateModeTemplateMapping(files: string[]): string[] {
    const warnings: string[] = [];
    const modes = Object.keys(VARIABLE_REGISTRIES) as ModeType[];
    
    for (const mode of modes) {
      const expectedFile = `${mode}-prompts.md`;
      if (!files.includes(expectedFile)) {
        warnings.push(`Missing template file for mode '${mode}': expected ${expectedFile}`);
      }
    }

    return warnings;
  }
}