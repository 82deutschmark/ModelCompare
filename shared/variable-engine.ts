// UNKNOWN IF THIS IS USED OR HOW!!
//  NEEDS AUDIT!!


interface VariableEngineOptions {
  policy: 'error' | 'warn' | 'keep';
  aliases?: Record<string, string>;
}

export class VariableEngine {
  private aliases: Record<string, string>;
  private policy: 'error' | 'warn' | 'keep';
  
  constructor(options: VariableEngineOptions = { policy: 'error' }) {
    this.policy = options.policy;
    this.aliases = options.aliases || {};
  }
  
  renderPreview(template: string, variables: Record<string, string>): string {
    return this.render(template, variables, false);
  }
  
  renderFinal(template: string, variables: Record<string, string>): { 
    resolved: string; 
    mapping: Record<string, string>;
    warnings: string[];
  } {
    const mapping: Record<string, string> = {};
    const warnings: string[] = [];
    const resolved = this.render(template, variables, true, mapping, warnings);
    return { resolved, mapping, warnings };
  }
  
  private render(
    template: string, 
    variables: Record<string, string>, 
    isServer = false,
    mapping?: Record<string, string>,
    warnings?: string[]
  ): string {
    let processedTemplate = template;
    Object.entries(this.aliases).forEach(([oldVar, newVar]) => {
      const oldPattern = new RegExp(`\\{${this.escapeRegExp(oldVar)}\\}`, 'g');
      processedTemplate = processedTemplate.replace(oldPattern, `{${newVar}}`);
      if (isServer && warnings && oldPattern.test(template)) {
        warnings.push(`Deprecated variable {${oldVar}} mapped to {${newVar}}`);
      }
    });
    
    const escapedBraces: string[] = [];
    processedTemplate = processedTemplate.replace(/\\\\{([^}]+)\\\\}/g, (match, content) => {
      const placeholder = `__ESCAPED_${escapedBraces.length}__`;
      escapedBraces.push(`{${content}}`);
      return placeholder;
    });
    
    let result = processedTemplate.replace(/\\{([^}|]+)(\\|([^}]+))?\\}/g, (match, varName, _, defaultValue) => {
      const value = variables[varName] ?? defaultValue;
      
      if (isServer && mapping) {
        mapping[varName] = value || 'MISSING';
      }
      
      if (value === undefined) {
        const error = `Missing variable: {${varName}}`;
        if (this.policy === 'error') {
          throw new Error(error);
        } else if (this.policy === 'warn' && isServer && warnings) {
          warnings.push(error);
          return match;
        } else {
          return match;
        }
      }
      
      return value;
    });
    
    escapedBraces.forEach((escaped, index) => {
      result = result.replace(`__ESCAPED_${index}__`, escaped);
    });
    
    return result;
  }
  
  private escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&');
  }
}