import { VariableEngine } from './variable-engine';
import { VARIABLE_REGISTRIES, type ModeType } from './variable-registry';

export interface VariableInspectorData {
  availableVariables: Array<{
    name: string;
    type: string;
    required: boolean;
    description: string;
    currentValue?: string;
  }>;
  resolvedTemplate: string;
  warnings: string[];
  errors: string[];
  mapping: Record<string, string>;
}

export class VariableInspector {
  private engine: VariableEngine;
  
  constructor(aliases?: Record<string, string>) {
    this.engine = new VariableEngine({
      policy: 'warn',
      aliases
    });
  }
  
  inspect(
    mode: ModeType,
    template: string,
    variables: Record<string, string>
  ): VariableInspectorData {
    const registry = VARIABLE_REGISTRIES[mode];
    const errors: string[] = [];
    
    // Get available variables from registry
    const availableVariables = registry.map(schema => ({
      name: schema.name,
      type: schema.type,
      required: schema.required,
      description: schema.description,
      currentValue: variables[schema.name]
    }));
    
    let resolvedTemplate = '';
    let warnings: string[] = [];
    let mapping: Record<string, string> = {};
    
    try {
      // Try to resolve template
      const result = this.engine.renderFinal(template, variables);
      resolvedTemplate = result.resolved;
      warnings = result.warnings;
      mapping = result.mapping;
    } catch (error) {
      errors.push(error instanceof Error ? error.message : 'Unknown error');
      resolvedTemplate = template; // Return original on error
    }
    
    return {
      availableVariables,
      resolvedTemplate,
      warnings,
      errors,
      mapping
    };
  }
  
  // Development helper to show variable usage in template
  extractVariablesFromTemplate(template: string): string[] {
    const matches = template.match(/\{([^}]+)\}/g);
    if (!matches) return [];
    
    return matches.map(match => {
      const variable = match.slice(1, -1); // Remove braces
      const [name] = variable.split('|'); // Handle default values
      return name.trim();
    });
  }
}