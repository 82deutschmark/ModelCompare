/**
 * Variable Registry and Validation Utilities
 * Author: GPT-5 (medium reasoning)
 * Date: 2025-08-17
 *
 * What this file does: Defines typed variable schemas per mode and provides validation
 * helpers for server-side enforcement and client preview with the VariableEngine.
 * How it works: Each mode maps to an array of VariableSchema entries. The validators
 * check requireds, enum membership, and number coercion, returning normalized errors.
 * How the project uses it: Server `/api/generate` validates incoming variables against
 * the selected mode; the client uses the registry to build forms and previews.
 */
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
  ],
  'research-synthesis': [
    { 
      name: 'researchTopic', 
      type: 'string' as const, 
      required: true, 
      description: 'Primary research question or topic' 
    },
    { 
      name: 'methodology', 
      type: 'enum' as const, 
      required: true, 
      enum: ['systematic-review', 'meta-analysis', 'comparative-study', 'exploratory', 'experimental'], 
      description: 'Research methodology approach' 
    },
    { 
      name: 'depth', 
      type: 'enum' as const, 
      required: true, 
      enum: ['surface', 'intermediate', 'deep', 'exhaustive'], 
      description: 'Research depth and comprehensiveness' 
    },
    { 
      name: 'discipline', 
      type: 'enum' as const, 
      required: true, 
      enum: ['computer-science', 'psychology', 'economics', 'biology', 'physics', 'interdisciplinary'], 
      description: 'Primary academic discipline lens' 
    },
    { 
      name: 'timeHorizon', 
      type: 'enum' as const, 
      required: true, 
      enum: ['historical', 'current', 'future-trends', 'comprehensive'], 
      description: 'Temporal focus of research' 
    },
    { 
      name: 'evidenceLevel', 
      type: 'enum' as const, 
      required: true, 
      enum: ['peer-reviewed', 'academic-sources', 'mixed-sources', 'open-web'], 
      description: 'Required evidence quality level' 
    },
    { 
      name: 'previousFindings', 
      type: 'string' as const, 
      required: false, 
      description: 'Previous research synthesis to build upon' 
    },
    { 
      name: 'researchGap', 
      type: 'string' as const, 
      required: false, 
      description: 'Specific gap or hypothesis to investigate' 
    },
    { 
      name: 'audience', 
      type: 'enum' as const, 
      required: true, 
      enum: ['academic', 'professional', 'policy-makers', 'general-public', 'specialists'], 
      description: 'Intended audience for research synthesis' 
    },
    { 
      name: 'round', 
      type: 'number' as const, 
      required: false, 
      default: '1',
      description: 'Current synthesis round number' 
    },
    { 
      name: 'expertiseRole', 
      type: 'enum' as const, 
      required: true, 
      enum: ['literature-reviewer', 'methodologist', 'data-analyst', 'theory-builder', 'critic', 'synthesizer'], 
      description: 'Specialized role for this model in research process' 
    }
  ],
  vixra: [
    {
      name: 'ResearcherName',
      type: 'string' as const,
      required: true,
      description: 'Name of the primary researcher for the paper'
    },
    {
      name: 'Collaborators',
      type: 'string' as const,
      required: false,
      description: 'Comma-separated list of collaborators'
    },
    {
      name: 'Email',
      type: 'string' as const,
      required: false,
      description: 'Researcher\'s email address (optional)'
    },
    {
      name: 'ScienceCategory',
      type: 'enum' as const,
      required: true,
      enum: ['Physics - High Energy Particle Physics', 'Physics - Quantum Gravity and String Theory', 'Physics - Relativity and Cosmology', 'Physics - Astrophysics', 'Physics - Quantum Physics', 'Physics - Nuclear and Atomic Physics', 'Physics - Condensed Matter', 'Physics - Thermodynamics and Energy', 'Physics - Classical Physics', 'Physics - Geophysics', 'Physics - Climate Research', 'Physics - Mathematical Physics', 'Physics - History and Philosophy of Physics', 'Mathematics - Set Theory and Logic', 'Mathematics - Number Theory', 'Mathematics - Combinatorics and Graph Theory', 'Mathematics - Algebra', 'Mathematics - Geometry', 'Mathematics - Topology', 'Mathematics - Functions and Analysis', 'Mathematics - Statistics', 'Mathematics - General Mathematics', 'Computational Science - Digital Signal Processing', 'Computational Science - Data Structures and Algorithms', 'Computational Science - Artificial Intelligence', 'Biology - Biochemistry', 'Biology - Physics of Biology', 'Biology - Mind Science', 'Biology - Quantitative Biology', 'Chemistry', 'Humanities - Archaeology', 'Humanities - Linguistics', 'Humanities - Economics and Finance', 'Humanities - Social Science', 'Humanities - Religion and Spiritualism', 'General Science and Philosophy', 'Education and Didactics'],
      description: 'The scientific category for the paper submission'
    },
    {
      name: 'Title',
      type: 'string' as const,
      required: true,
      description: 'The title of the research paper'
    },
    {
      name: 'Authors',
      type: 'string' as const,
      required: true,
      description: 'Formatted list of authors for the paper'
    },
    {
      name: 'Abstract',
      type: 'string' as const,
      required: false,
      description: 'The abstract of the paper (can be auto-generated)'
    },
    {
      name: 'NumPages',
      type: 'number' as const,
      required: false,
      description: 'Estimated number of pages for the paper'
    },
    {
      name: 'Comment',
      type: 'string' as const,
      required: false,
      description: 'Technical comments about the submission'
    },
    {
      name: 'OtherInstructions',
      type: 'string' as const,
      required: false,
      description: 'Other instructions for the administrator'
    },
    {
      name: 'PromptMode',
      type: 'enum' as const,
      required: true,
      enum: ['custom', 'template'],
      description: 'Whether to use a custom prompt or a pre-defined template'
    },
    {
      name: 'CustomPrompt',
      type: 'string' as const,
      required: false,
      description: 'The user-defined custom prompt for the paper generation'
    },
    {
      name: 'TemplateKey',
      type: 'string' as const,
      required: false,
      description: 'The key for the selected prompt template'
    },
    {
      name: 'TargetSections',
      type: 'number' as const,
      required: false,
      default: '6',
      description: 'The target number of sections for the paper body'
    },
    {
      name: 'IncludeImages',
      type: 'enum' as const,
      required: false,
      default: 'true',
      enum: ['true', 'false'],
      description: 'Whether to include image/diagram generation prompts'
    }
  ],
  'plan-assessment': [
    { 
      name: 'planMarkdown',
      type: 'string' as const,
      required: true,
      description: 'The authored plan under review (Markdown or plaintext)'
    },
    { 
      name: 'assessmentCriteria',
      type: 'enum' as const,
      required: true,
      enum: ['architecture','requirements','risk','delivery','security','operations','overall'],
      description: 'Primary assessment lens to emphasize'
    },
    { 
      name: 'contextSummary',
      type: 'string' as const,
      required: false,
      description: 'Business/technical context to consider'
    },
    { 
      name: 'constraints',
      type: 'string' as const,
      required: false,
      description: 'Key constraints (time, budget, compliance, tech stack)'
    },
    { 
      name: 'iterationRound',
      type: 'number' as const,
      required: false,
      default: '1',
      description: 'Assessment iteration number'
    },
    { 
      name: 'assessorRole',
      type: 'enum' as const,
      required: true,
      enum: ['chief-architect','principal-eng','sre-lead','security-architect','product-ops','peer-reviewer'],
      description: 'Persona for the evaluator'
    },
    { 
      name: 'tone',
      type: 'enum' as const,
      required: true,
      enum: ['concise','direct','balanced','thorough'],
      description: 'Tone of the assessment'
    },
    { 
      name: 'scoringScale',
      type: 'enum' as const,
      required: true,
      enum: ['1-5','1-10'],
      description: 'Score scale to use'
    },
    { 
      name: 'actionability',
      type: 'enum' as const,
      required: true,
      enum: ['must-fix','should-fix','nice-to-have','mixed'],
      description: 'Recommendation emphasis'
    },
    { 
      name: 'projectScale',
      type: 'enum' as const,
      required: true,
      enum: ['hobby','indie','startup','enterprise'],
      description: 'Intended scale of the software project to right-size recommendations'
    },
    { 
      name: 'ownerModelName',
      type: 'string' as const,
      required: false,
      description: 'Name of the model that authored the plan (context only)'
    }
  ]
} satisfies Record<string, VariableSchema[]>;

export type ModeType = keyof typeof VARIABLE_REGISTRIES;

export function validateVariables(
  mode: ModeType, 
  variables: Record<string, string>
): { isValid: boolean; errors: string[] } {
  const registry = VARIABLE_REGISTRIES[mode] as unknown as VariableSchema[];
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
    
    if (value !== undefined && schema.type === 'enum' && schema.enum && !(schema.enum as string[]).includes(value)) {
      errors.push(`Invalid enum value for ${schema.name}. Must be one of: ${schema.enum.join(', ')}`);
    }
    
    if (value !== undefined && schema.type === 'number' && isNaN(Number(value))) {
      errors.push(`Variable ${schema.name} must be a valid number`);
    }
  }
  
  return { isValid: errors.length === 0, errors };
}

export function getDefaultVariables(mode: ModeType): Record<string, string> {
  const registry = VARIABLE_REGISTRIES[mode] as VariableSchema[];
  const defaults: Record<string, string> = {};
  
  for (const schema of registry) {
    if (schema.default !== undefined) {
      defaults[schema.name] = schema.default;
    }
  }
  
  return defaults;
}