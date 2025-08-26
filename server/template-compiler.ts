/**
 * Template Compilation and Caching System
 * 
 * Compiles and caches all markdown templates at startup for optimal performance.
 * Eliminates per-request template parsing and provides validated template access.
 * 
 * Author: Claude Code
 * Date: 2025-08-26
 */

import fs from 'fs';
import path from 'path';
import { VariableEngine } from '../shared/variable-engine.js';
import { VARIABLE_REGISTRIES, type ModeType } from '../shared/variable-registry.js';
import { getTemplateConfig } from './config.js';
import { StructuredTemplate, VariableDefinition, TemplateMetadata } from '../shared/api-types.js';

export interface CompiledTemplate {
  id: string;
  name: string;
  content: string;
  variables: string[];
  mode?: ModeType;
  category: string;
  filePath: string;
}

export interface CompiledTemplateCategory {
  id: string;
  name: string;
  templates: CompiledTemplate[];
  mode?: ModeType;
  filePath: string;
}

export class TemplateCompiler {
  private compiledTemplates = new Map<string, CompiledTemplate>();
  private compiledCategories = new Map<string, CompiledTemplateCategory>();
  private modeTemplates = new Map<ModeType, CompiledTemplateCategory[]>();
  private docsPath: string;
  private variableEngine: VariableEngine;

  constructor(docsPath?: string) {
    const templateConfig = getTemplateConfig();
    this.docsPath = path.resolve(docsPath || templateConfig.docsPath);
    this.variableEngine = new VariableEngine({ policy: 'warn' });
  }

  async compileAllTemplates(): Promise<void> {
    console.log('🔄 Compiling templates...');
    
    if (!fs.existsSync(this.docsPath)) {
      throw new Error(`Templates directory not found: ${this.docsPath}`);
    }

    // Get all template markdown files
    const files = fs.readdirSync(this.docsPath)
      .filter(f => f.endsWith('.md'))
      .filter(f => !f.includes('architecture-modernization-plan')); // Skip non-template docs

    for (const file of files) {
      const filePath = path.join(this.docsPath, file);
      await this.compileTemplateFile(filePath);
    }

    // Build mode-specific template mappings
    this.buildModeTemplateIndex();

    console.log(`✅ Compiled ${this.compiledTemplates.size} templates from ${files.length} files`);
  }

  private async compileTemplateFile(filePath: string): Promise<void> {
    const fileName = path.basename(filePath);
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Determine mode from filename (e.g., "battle-prompts.md" -> "battle")
    const mode = this.extractModeFromFilename(fileName);
    
    const categories = this.parseMarkdownContent(content);
    
    for (const category of categories) {
      const compiledCategory: CompiledTemplateCategory = {
        id: category.id,
        name: category.name,
        templates: [],
        mode,
        filePath
      };

      for (const template of category.prompts) {
        const compiledTemplate: CompiledTemplate = {
          id: `${category.id}:${template.id}`,
          name: template.name,
          content: template.content,
          variables: this.extractVariables(template.content),
          mode,
          category: category.name,
          filePath
        };

        // Validate template can be rendered
        try {
          this.validateTemplate(compiledTemplate);
        } catch (error) {
          console.warn(`⚠️ Template validation warning for ${compiledTemplate.id}: ${error instanceof Error ? error.message : error}`);
        }

        this.compiledTemplates.set(compiledTemplate.id, compiledTemplate);
        compiledCategory.templates.push(compiledTemplate);
      }

      this.compiledCategories.set(compiledCategory.id, compiledCategory);
    }
  }

  private extractModeFromFilename(fileName: string): ModeType | undefined {
    const baseName = fileName.replace('.md', '').replace('-prompts', '');
    const modes = Object.keys(VARIABLE_REGISTRIES) as ModeType[];
    return modes.find(mode => mode === baseName || baseName.includes(mode));
  }

  private extractVariables(content: string): string[] {
    const variableMatches = content.match(/\\{([^}|]+)(?:\\|[^}]*)?\\}/g) || [];
    return [...new Set(variableMatches.map(match => {
      const varName = match.slice(1, -1).split('|')[0]; // Handle default values
      return varName;
    }))];
  }

  private validateTemplate(template: CompiledTemplate): void {
    // Create test variables for all placeholders
    const testVariables: Record<string, string> = {};
    template.variables.forEach(varName => {
      testVariables[varName] = `test_${varName}`;
    });

    // Test template rendering
    this.variableEngine.renderPreview(template.content, testVariables);
  }

  private parseMarkdownContent(markdown: string) {
    const categories: Array<{ id: string; name: string; prompts: Array<{ id: string; name: string; content: string }> }> = [];
    const lines = markdown.split('\\n');
    
    let currentCategory: { id: string; name: string; prompts: Array<{ id: string; name: string; content: string }> } | null = null;
    let currentPrompt: { id: string; name: string; content: string } | null = null;
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
          id: categoryName.toLowerCase().replace(/[^a-z0-9]/g, '-'),
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
          id: promptName.toLowerCase().replace(/[^a-z0-9]/g, '-'),
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

  private buildModeTemplateIndex(): void {
    const modes = Object.keys(VARIABLE_REGISTRIES) as ModeType[];
    
    for (const mode of modes) {
      const modeCategories: CompiledTemplateCategory[] = [];
      
      for (const [, category] of this.compiledCategories) {
        if (category.mode === mode) {
          modeCategories.push(category);
        }
      }
      
      this.modeTemplates.set(mode, modeCategories);
    }
  }

  // Public API for template access
  getTemplate(templateId: string): CompiledTemplate | undefined {
    return this.compiledTemplates.get(templateId);
  }

  getTemplatesByMode(mode: ModeType): CompiledTemplateCategory[] {
    return this.modeTemplates.get(mode) || [];
  }

  getTemplateByPath(categoryId: string, templateId: string): CompiledTemplate | undefined {
    const fullId = `${categoryId}:${templateId}`;
    return this.compiledTemplates.get(fullId);
  }

  getAllTemplates(): CompiledTemplate[] {
    return Array.from(this.compiledTemplates.values());
  }

  getAllCategories(): CompiledTemplateCategory[] {
    return Array.from(this.compiledCategories.values());
  }

  renderTemplate(templateId: string, variables: Record<string, string>): string {
    const template = this.getTemplate(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    return this.variableEngine.renderFinal(template.content, variables).resolved;
  }

  // Get default template for battle mode challenger
  getDefaultBattleTemplate(): CompiledTemplate | undefined {
    return this.getTemplateByPath('generic-test-questions', 'generic-test-questions-challenger');
  }

  // Structured template methods
  getStructuredTemplate(templateId: string): StructuredTemplate | undefined {
    const template = this.getTemplate(templateId);
    if (!template) return undefined;
    
    return this.convertToStructuredTemplate(template);
  }

  getStructuredTemplatesByMode(mode: ModeType): StructuredTemplate[] {
    const categories = this.getTemplatesByMode(mode);
    const structuredTemplates: StructuredTemplate[] = [];
    
    for (const category of categories) {
      for (const template of category.templates) {
        structuredTemplates.push(this.convertToStructuredTemplate(template));
      }
    }
    
    return structuredTemplates;
  }

  private convertToStructuredTemplate(template: CompiledTemplate): StructuredTemplate {
    const structure = this.parseStructuredSections(template.content);
    const variables = this.generateVariableDefinitions(template.variables, template.content);
    const metadata = this.generateTemplateMetadata(template);

    return {
      id: template.id,
      name: template.name,
      mode: template.mode || 'compare',
      category: template.category,
      structure,
      variables,
      metadata
    };
  }

  private parseStructuredSections(content: string): StructuredTemplate['structure'] {
    const sections = {
      systemInstructions: undefined as string | undefined,
      userTemplate: content, // Fallback to full content
      contextTemplate: undefined as string | undefined,
      responseGuidelines: undefined as string | undefined
    };

    // Try to parse structured sections if they exist
    const lines = content.split('\n');
    let currentSection: keyof typeof sections | null = null;
    let sectionContent: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      
      // Detect section headers
      if (trimmed.startsWith('#### System Instructions')) {
        if (currentSection && sectionContent.length > 0) {
          sections[currentSection] = sectionContent.join('\n').trim();
        }
        currentSection = 'systemInstructions';
        sectionContent = [];
        continue;
      } else if (trimmed.startsWith('#### User Context Template') || trimmed.startsWith('#### User Template')) {
        if (currentSection && sectionContent.length > 0) {
          sections[currentSection] = sectionContent.join('\n').trim();
        }
        currentSection = 'userTemplate';
        sectionContent = [];
        continue;
      } else if (trimmed.startsWith('#### Context Template')) {
        if (currentSection && sectionContent.length > 0) {
          sections[currentSection] = sectionContent.join('\n').trim();
        }
        currentSection = 'contextTemplate';
        sectionContent = [];
        continue;
      } else if (trimmed.startsWith('#### Response Guidelines')) {
        if (currentSection && sectionContent.length > 0) {
          sections[currentSection] = sectionContent.join('\n').trim();
        }
        currentSection = 'responseGuidelines';
        sectionContent = [];
        continue;
      }

      // Collect content for current section
      if (currentSection) {
        sectionContent.push(line);
      }
    }

    // Save final section
    if (currentSection && sectionContent.length > 0) {
      sections[currentSection] = sectionContent.join('\n').trim();
    }

    // If no structured sections found, treat entire content as user template
    if (!sections.systemInstructions && !sections.contextTemplate && !sections.responseGuidelines) {
      sections.userTemplate = content;
    }

    return sections;
  }

  private generateVariableDefinitions(variables: string[], content: string): VariableDefinition[] {
    return variables.map(varName => ({
      name: varName,
      type: 'string' as const,
      required: true,
      description: this.inferVariableDescription(varName, content)
    }));
  }

  private inferVariableDescription(varName: string, content: string): string {
    // Try to infer variable purpose from name and context
    const commonVariables: Record<string, string> = {
      'originalPrompt': 'The original user prompt or question',
      'response': 'The previous model response',
      'modelName': 'The name of the model being used',
      'topic': 'The topic or subject being discussed',
      'position': 'The debate position or stance',
      'role': 'The role the model should take',
      'intensity': 'The intensity level for the response'
    };

    if (commonVariables[varName]) {
      return commonVariables[varName];
    }

    // Check if variable appears in a descriptive context
    const varPattern = new RegExp(`{${varName}[^}]*}`, 'gi');
    const matches = content.match(varPattern);
    if (matches && matches.length > 0) {
      // Extract context around the variable usage
      const usage = matches[0].replace(/[{}]/g, '');
      return `Variable for ${usage.split('|')[0].toLowerCase()}`;
    }

    return `Template variable: ${varName}`;
  }

  private generateTemplateMetadata(template: CompiledTemplate): TemplateMetadata {
    const stats = fs.statSync(template.filePath);
    
    return {
      filePath: template.filePath,
      lastModified: stats.mtime.toISOString(),
      version: this.generateTemplateVersion(template),
      description: `Generated from ${path.basename(template.filePath)}`
    };
  }

  private generateTemplateVersion(template: CompiledTemplate): string {
    // Generate version based on file modification time and content hash
    const stats = fs.statSync(template.filePath);
    const contentHash = this.simpleHash(template.content);
    const dateStr = stats.mtime.toISOString().split('T')[0].replace(/-/g, '');
    return `${dateStr}.${contentHash.slice(0, 8)}`;
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16);
  }
}