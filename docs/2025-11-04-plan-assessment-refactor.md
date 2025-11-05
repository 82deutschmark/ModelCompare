# Plan Assessment Mode Refactoring Plan
**Date:** 2025-11-04
**Status:** In Progress
**Goal:** Refactor plan-assessment page to properly use variable system, add per-model reasoning controls, and support academic paper assessment

## Problem Statement

The current plan-assessment page has architectural issues:
1. **Manual prompt building** - Constructs prompts via string concatenation instead of using the variable system
2. **Ignored template file** - Doesn't load prompts from `client/public/docs/plan-assessment-prompts.md`
3. **Missing variable registry** - Should use 11 variables defined in `shared/variable-registry.ts` but only uses 4
4. **No model configuration** - Lacks per-model reasoning controls (effort, temperature, max tokens)
5. **Wrong model selection pattern** - Uses simple multi-select instead of compare page pattern with FloatingModelPicker

## Architecture Goals

### Use Proper Variable System
- Load prompts from `plan-assessment-prompts.md` (lines 14-77)
- Use all 11 variables from `VARIABLE_REGISTRIES['plan-assessment']`:
  - `planMarkdown` (required) - The plan/paper content
  - `assessmentCriteria` (required) - architecture/requirements/risk/delivery/security/operations/overall
  - `contextSummary` (optional) - **User's custom instructions for system prompt**
  - `constraints` (optional) - Time, budget, compliance constraints
  - `iterationRound` (optional, default: 1)
  - `assessorRole` (required) - chief-architect/principal-eng/sre-lead/security-architect/product-ops
  - `tone` (required) - concise/direct/balanced/thorough
  - `scoringScale` (required) - 1-5 or 1-10
  - `actionability` (required) - must-fix/should-fix/nice-to-have/mixed
  - `projectScale` (required) - hobby/indie/startup/enterprise
  - `ownerModelName` (optional) - Original author model name

### Reuse Existing Components

**From Compare Page (`client/src/pages/compare.tsx`):**
- `EnhancedPromptArea` pattern - Hero-centered design
- `FloatingModelPicker` - Multi-select model picker with provider grouping
- `ModelPill` - Visual display of selected models
- `useComparison` hook - State management (may need extension)

**From Debate Page (`client/src/pages/debate.tsx`):**
- `ModelConfigurationPanel` - Per-model reasoning controls
  - Reasoning effort: minimal/low/medium/high
  - Reasoning summary: auto/detailed/concise
  - Text verbosity: low/medium/high
  - Temperature slider (if model supports)
  - Max tokens slider (1k-128k)
  - Structured output toggle (if model supports)

## Files to Modify

### 1. `client/src/components/plan-assessment/PlanAssessmentHero.tsx`

**Current Issues:**
- Lines 57-68: Manual prompt construction
- Lines 27-30: Only 4 state variables (should be 11)
- Lines 186-233: Custom form fields instead of variable-driven forms
- No model configuration panels

**Changes Required:**
```typescript
// REMOVE: Manual prompt building
const finalPrompt = useMemo(() => {
  const lines: string[] = [
    "## Assess This Plan",
    // ... manual string concatenation
  ];
  return lines.join("\n");
}, [...]);

// REPLACE WITH: Variable-based state management
const [variables, setVariables] = useState<Record<string, string>>({
  planMarkdown: '',
  assessmentCriteria: 'overall',
  contextSummary: '',
  constraints: '',
  iterationRound: '1',
  assessorRole: 'principal-eng',
  tone: 'balanced',
  scoringScale: '1-5',
  actionability: 'mixed',
  projectScale: 'startup',
  ownerModelName: ''
});

// ADD: Per-model configuration state
const [modelConfigs, setModelConfigs] = useState<Record<string, ModelConfiguration>>({});
```

**UI Changes:**
- Keep the gradient hero design (lines 119-149)
- Replace custom form fields with variable-driven form generator
- Add collapsible sections for each variable group:
  - **Content** (planMarkdown, contextSummary)
  - **Assessment Config** (assessmentCriteria, assessorRole, tone, scoringScale, actionability)
  - **Project Context** (projectScale, constraints, iterationRound, ownerModelName)
- Add `ModelConfigurationPanel` for each selected model (collapsible)

### 2. `client/src/pages/plan-assessment.tsx`

**Current Issues:**
- Lines 27-30: Simple state variables
- Lines 99: Direct comparison call without variable system

**Changes Required:**
```typescript
// REMOVE: Simple state
const [projectType, setProjectType] = useState<"hobby" | "enterprise">("enterprise");
const [constraints, setConstraints] = useState<string>("");
const [planMarkdown, setPlanMarkdown] = useState<string>("");
const [contextSummary, setContextSummary] = useState<string>("");

// REPLACE WITH: Variable registry state
const [variables, setVariables] = useState<Record<string, string>>(() => {
  const defaults: Record<string, string> = {};
  VARIABLE_REGISTRIES['plan-assessment'].forEach(schema => {
    defaults[schema.name] = schema.default || '';
  });
  return defaults;
});

// ADD: Model configuration state
const [modelConfigs, setModelConfigs] = useState<Record<string, ModelConfiguration>>({});

// MODIFY: API call to use variable system
actions.startComparison(finalPrompt, {
  mode: 'plan-assessment',
  variables,
  modelConfigs
});
```

### 3. Backend Verification (No changes expected)

**Check these files:**
- `server/routes.ts` - Verify `/api/generate` handles `plan-assessment` mode
- `server/template-compiler.ts` - Verify variable substitution works
- Confirm prompts load from `client/public/docs/plan-assessment-prompts.md`

## Academic Paper Support

**No separate mode needed!** The existing system supports academic papers:
- The `planMarkdown` variable accepts "Markdown or plaintext"
- Assessment criteria work for papers:
  - **architecture** → Paper structure, organization
  - **requirements** → Research questions, hypotheses
  - **risk** → Methodological risks, validity threats
  - **delivery** → Publication readiness
  - **security** → Data privacy, ethical considerations
  - **operations** → Reproducibility, implementation

**UI Enhancement:**
Add toggle or dropdown: "Assessment Type: [Software Plan | Academic Paper]"
- Changes field labels (Plan → Paper/Manuscript)
- Adjusts contextSummary placeholder text
- Doesn't change underlying variable system

## Implementation Steps

1. **Create Variable Form Generator** (or reuse if exists)
   - Component that takes `VariableSchema[]` and generates form inputs
   - Handles string/number/enum/date types
   - Shows descriptions as help text

2. **Refactor PlanAssessmentHero**
   - Replace manual forms with variable form generator
   - Group variables into logical sections
   - Add model configuration panels below model pills
   - Keep the vibrant gradient design

3. **Update plan-assessment.tsx**
   - Change state management to use variables
   - Add model configuration state
   - Modify API call to pass structured data

4. **Test Variable Substitution**
   - Verify prompts load from markdown file
   - Verify all 11 variables substitute correctly
   - Check optional variables handle empty values

5. **Add Academic Paper Helpers**
   - Toggle for assessment type
   - Contextual help text
   - Example prompts for paper assessment

## Component Reuse Checklist

- [ ] `FloatingModelPicker` - Model selection with filters
- [ ] `ModelPill` - Selected model display
- [ ] `ModelConfigurationPanel` - Per-model reasoning controls
- [ ] `useComparison` hook - State management (extend if needed)
- [ ] Variable form generator component (create or find)

## Success Criteria

✅ Prompts load from `plan-assessment-prompts.md`
✅ All 11 variables from registry are used
✅ Each selected model has configuration panel
✅ `contextSummary` preserved as custom instruction field
✅ Compare page model selection pattern used
✅ Academic papers supported with helpful UI
✅ No code duplication from other modes
✅ Maintains vibrant gradient design aesthetic

## References

- Variable Registry: `shared/variable-registry.ts:287-361`
- Prompt Template: `client/public/docs/plan-assessment-prompts.md`
- Compare Page: `client/src/pages/compare.tsx`
- Debate Page: `client/src/pages/debate.tsx`
- Model Config Panel: `client/src/components/ModelConfigurationPanel.tsx`
- FloatingModelPicker: `client/src/components/comparison/FloatingModelPicker.tsx`
