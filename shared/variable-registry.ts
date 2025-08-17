export interface VariableSchema {
  name: string;
  type: 'string' | 'number' | 'enum' | 'date';
  required: boolean;
  default?: string;
  description: string;
  validate?: (value: string) => boolean;
  enum?: string[];
  secret?: boolean;
}

export const VARIABLE_REGISTRIES = {
  creative: [
    { 
      name: 'originalPrompt', 
      type: 'string' as const, 
      required: true, 
      description: 'User creative prompt' 
    },
    { 
      name: 'response', 
      type: 'string' as const, 
      required: false, 
      description: 'Previous model response' 
    },
    { 
      name: 'category', 
      type: 'enum' as const, 
      required: true, 
      enum: ['poetry', 'battle-rap', 'story'], 
      description: 'Creative category' 
    }
  ],
  battle: [
    { 
      name: 'originalPrompt', 
      type: 'string' as const, 
      required: true, 
      description: 'Original debate prompt' 
    },
    { 
      name: 'response', 
      type: 'string' as const, 
      required: false, 
      description: 'Previous response to challenge' 
    },
    { 
      name: 'battleType', 
      type: 'enum' as const, 
      required: true, 
      enum: ['critique', 'enhance'], 
      description: 'Battle mode' 
    }
  ],
  debate: [
    { 
      name: 'originalPrompt', 
      type: 'string' as const, 
      required: true, 
      description: 'Debate topic' 
    },
    { 
      name: 'topic', 
      type: 'string' as const, 
      required: true, 
      description: 'Debate topic' 
    },
    { 
      name: 'intensity', 
      type: 'number' as const, 
      required: true, 
      description: 'Adversarial level 1-4' 
    },
    { 
      name: 'response', 
      type: 'string' as const, 
      required: false, 
      description: 'Previous argument' 
    },
    { 
      name: 'role', 
      type: 'enum' as const, 
      required: true, 
      enum: ['pro', 'con'], 
      description: 'Debate side' 
    },
    { 
      name: 'position', 
      type: 'string' as const, 
      required: true, 
      description: 'Detailed position statement' 
    }
  ],
  compare: [
    { 
      name: 'originalPrompt', 
      type: 'string' as const, 
      required: true, 
      description: 'Comparison prompt' 
    }
  ]
} as const;

export type ModeType = keyof typeof VARIABLE_REGISTRIES;

export function validateVariables(
  mode: ModeType, 
  variables: Record<string, string>
): { isValid: boolean; errors: string[] } {
  const registry = VARIABLE_REGISTRIES[mode];
  const errors: string[] = [];
  
  for (const schema of registry) {
    const value = variables[schema.name];
    
    if (schema.required && (value === undefined || value === '')) {
      errors.push(`Required variable missing: ${schema.name}`);
      continue;
    }
    
    if (value !== undefined && schema.validate && !schema.validate(value)) {
      errors.push(`Invalid value for variable: ${schema.name}`);
    }
    
    if (value !== undefined && schema.type === 'enum' && schema.enum && !schema.enum.includes(value)) {
      errors.push(`Invalid enum value for ${schema.name}. Must be one of: ${schema.enum.join(', ')}`);
    }
    
    if (value !== undefined && schema.type === 'number' && isNaN(Number(value))) {
      errors.push(`Variable ${schema.name} must be a valid number`);
    }
  }
  
  return { isValid: errors.length === 0, errors };
}

export function getDefaultVariables(mode: ModeType): Record<string, string> {
  const registry = VARIABLE_REGISTRIES[mode];
  const defaults: Record<string, string> = {};
  
  for (const schema of registry) {
    if (schema.default !== undefined) {
      defaults[schema.name] = schema.default;
    }
  }
  
  return defaults;
}