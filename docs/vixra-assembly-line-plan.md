# Vixra Assembly Line Workflow Plan v2

**Author:** Claude Code  
**Date:** August 18, 2025  
**Updated:** August 18, 2025 (addressing dependency mapping, state management, and robustness)  
**Purpose:** Fix Vixra mode to work as sequential assembly line with proper variable passing

## Current Problem

The current Vixra implementation runs all models in parallel to generate complete papers, which is incorrect. According to the documentation in `vixra-prompts.md`, it should be a **sequential assembly line** where each model works on a specific section, passing their output to the next model.

## Required Assembly Line Flow with Explicit Dependencies

Based on `client/public/docs/vixra-prompts.md`, the workflow has explicit inter-section dependencies:

```
Section ID: abstract
├─ Template: Abstract Generation
├─ Dependencies: [user variables only]
├─ Variables: {Title}, {ScienceCategory}, {Authors}, {Institution}, {Keywords}

Section ID: introduction  
├─ Template: Introduction Section
├─ Dependencies: [abstract]
├─ Variables: {Title}, {ScienceCategory}, {Methodology}, {abstract}

Section ID: methodology
├─ Template: Methodology Section  
├─ Dependencies: [introduction]
├─ Variables: {Title}, {Methodology}, {SpecialRequests}, {introduction}

Section ID: results
├─ Template: Results Section
├─ Dependencies: [abstract, methodology]
├─ Variables: {Title}, {Abstract}, {Methodology}, {abstract}, {methodology}

Section ID: discussion
├─ Template: Discussion Section
├─ Dependencies: [results]
├─ Variables: {Title}, {ScienceCategory}, {response: results}

Section ID: conclusion
├─ Template: Conclusion Section
├─ Dependencies: [discussion]
├─ Variables: {Title}, {ResearcherName}, {response: discussion}

Section ID: citations (optional)
├─ Template: Citations Generator
├─ Dependencies: [abstract, results]
├─ Variables: {Title}, {ScienceCategory}, {ResearcherName}

Section ID: acknowledgments (optional)
├─ Template: Acknowledgments Section
├─ Dependencies: [conclusion]
├─ Variables: {ResearcherName}, {Institution}, {Funding}

Section ID: peer-review (optional)
├─ Template: Peer Review Response
├─ Dependencies: [ALL_PREVIOUS]
├─ Variables: {Title}, {response: full_paper_content}
```

## Variable System Integration (Redesigned)

### Core Variable Engine Components

From `shared/variable-registry.ts`, the Vixra mode has these user variables:
- **Required:** `ResearcherName`, `ScienceCategory`, `Title`, `Authors`
- **Optional:** `Collaborators`, `Email`, `NumPages`, `Abstract`, etc.

### Variable Resolution Strategy (Generic & Decoupled)

1. **User Variables**: All user-entered variables persist through entire workflow
2. **Section Outputs**: Stored with canonical section IDs, not hardcoded keys
3. **Dynamic Aliases**: Build section aliases on-demand based on dependency map
4. **Variable Shadowing Protection**: Validate user variables don't override section keys

### Canonical Section Output Storage

```typescript
interface SectionOutput {
  sectionId: string;
  content: string;
  modelId: string;
  timestamp: number;
  tokenUsage?: TokenUsage;
}

interface WorkflowState {
  sectionOutputs: Map<string, SectionOutput>;  // Not string[] indexed by position
  userVariables: Record<string, string>;
  dependencyMap: Map<string, string[]>;        // section -> dependencies
}
```

### Variable Engine Usage (Generic)

```typescript
// Build variables dynamically based on dependency map
const buildVariablesForSection = (sectionId: string, state: WorkflowState) => {
  const dependencies = state.dependencyMap.get(sectionId) || [];
  const variables = { ...state.userVariables };
  
  // Add section aliases dynamically
  dependencies.forEach(depId => {
    const output = state.sectionOutputs.get(depId);
    if (output) {
      // Create both generic {response} and specific {sectionId} variables
      variables[depId] = output.content;
      if (dependencies.length === 1) {
        variables.response = output.content;  // Single dependency becomes {response}
      }
    }
  });
  
  return variables;
};

// Validate no user variable shadows section keys
const validateUserVariables = (userVars: Record<string, string>, sectionIds: string[]) => {
  const conflicts = sectionIds.filter(id => id in userVars);
  if (conflicts.length > 0) {
    throw new Error(`User variables cannot shadow section keys: ${conflicts.join(', ')}`);
  }
};
```

## Section Templates (Robust Parsing)

### Template Markup Strategy

Instead of relying on brittle line numbers, enhance `vixra-prompts.md` with explicit markers:

```markdown
<!-- SECTION_START:abstract -->
### Abstract Generation
You are writing the abstract for a satirical research paper...
<!-- SECTION_END:abstract -->

<!-- SECTION_START:introduction -->
### Introduction Section  
You are writing the introduction section...
<!-- SECTION_END:introduction -->
```

### Template Versioning & Persistence

```typescript
interface TemplateVersion {
  sectionId: string;
  version: string;        // hash or timestamp
  content: string;
  dependencies: string[];
  required: boolean;
}

interface WorkflowSession {
  sessionId: string;
  templateVersion: string;  // Lock templates for entire session
  templates: Map<string, TemplateVersion>;
  state: WorkflowState;
}
```

### Dynamic Section Discovery

```typescript
const parseVixraTemplates = async (markdownContent: string): Promise<Map<string, TemplateVersion>> => {
  const sectionRegex = /<!-- SECTION_START:(\w+) -->(.*?)<!-- SECTION_END:\1 -->/gs;
  const templates = new Map<string, TemplateVersion>();
  
  let match;
  while ((match = sectionRegex.exec(markdownContent)) !== null) {
    const [, sectionId, content] = match;
    
    // Extract dependencies from template content
    const dependencies = extractDependencies(content);
    const required = !['citations', 'acknowledgments', 'peer-review'].includes(sectionId);
    
    templates.set(sectionId, {
      sectionId,
      version: hashContent(content),
      content: content.trim(),
      dependencies,
      required
    });
  }
  
  return templates;
};
```

## Implementation Changes Required

### 1. Robust State Management (Race-Safe)

```typescript
interface VixraState {
  sessionId: string;
  currentSection: string | null;     // Section ID, not index
  sectionOutputs: Map<string, SectionOutput>;
  userVariables: Record<string, string>;
  modelAssignments: Map<string, string>;  // sectionId -> modelId
  workflowStatus: 'idle' | 'running' | 'paused' | 'complete' | 'error';
  enabledSections: Set<string>;      // Handle optional skips
  dependencyMap: Map<string, string[]>;
  templateVersion: string;
  errorState?: { sectionId: string; error: string; retryCount: number };
}

// Atomic state updates via reducer
type VixraAction = 
  | { type: 'START_SECTION'; sectionId: string }
  | { type: 'COMPLETE_SECTION'; sectionId: string; output: SectionOutput }
  | { type: 'ERROR_SECTION'; sectionId: string; error: string }
  | { type: 'RETRY_SECTION'; sectionId: string }
  | { type: 'SKIP_SECTION'; sectionId: string };

const vixraReducer = (state: VixraState, action: VixraAction): VixraState => {
  // Atomic state transitions prevent race conditions
};
```

### 2. Sequential Processing Logic (Race-Safe)

```typescript
const processWorkflow = async () => {
  const processingQueue = new Map<string, Promise<void>>();  // Prevent double-invocation
  
  const processSection = async (sectionId: string): Promise<void> => {
    // Check if already processing this section
    if (processingQueue.has(sectionId)) {
      return processingQueue.get(sectionId)!;
    }
    
    const promise = (async () => {
      dispatch({ type: 'START_SECTION', sectionId });
      
      try {
        // Check dependencies are complete
        const dependencies = state.dependencyMap.get(sectionId) || [];
        const missingDeps = dependencies.filter(dep => 
          state.enabledSections.has(dep) && !state.sectionOutputs.has(dep)
        );
        
        if (missingDeps.length > 0) {
          throw new Error(`Missing dependencies: ${missingDeps.join(', ')}`);
        }
        
        // Build variables dynamically
        const variables = buildVariablesForSection(sectionId, state);
        const template = await getTemplate(sectionId, state.templateVersion);
        const modelId = state.modelAssignments.get(sectionId);
        
        // Generate section
        const output = await generateSection(template, variables, modelId);
        
        dispatch({ type: 'COMPLETE_SECTION', sectionId, output });
        
        // Trigger next eligible sections
        await processEligibleSections();
        
      } catch (error) {
        dispatch({ type: 'ERROR_SECTION', sectionId, error: error.message });
      }
    })();
    
    processingQueue.set(sectionId, promise);
    await promise;
    processingQueue.delete(sectionId);
  };
  
  const processEligibleSections = async () => {
    // Find sections ready to process (dependencies complete)
    const eligible = Array.from(state.enabledSections).filter(sectionId => {
      if (state.sectionOutputs.has(sectionId)) return false; // Already complete
      
      const dependencies = state.dependencyMap.get(sectionId) || [];
      return dependencies.every(dep => 
        !state.enabledSections.has(dep) || state.sectionOutputs.has(dep)
      );
    });
    
    // Process eligible sections (potentially in parallel for independent sections)
    await Promise.all(eligible.map(processSection));
  };
};
```

### 3. Flexible Model Assignment Strategy

```typescript
interface ModelAssignmentStrategy {
  type: 'round-robin' | 'user-choice' | 'model-specific' | 'capability-based';
  assignments?: Map<string, string>;  // Manual assignments
  availableModels: string[];
}

const assignModelsToSections = (
  sections: string[], 
  strategy: ModelAssignmentStrategy
): Map<string, string> => {
  const assignments = new Map<string, string>();
  
  switch (strategy.type) {
    case 'round-robin':
      sections.forEach((sectionId, index) => {
        const modelId = strategy.availableModels[index % strategy.availableModels.length];
        assignments.set(sectionId, modelId);
      });
      break;
      
    case 'user-choice':
      // Allow user to manually assign models per section
      break;
      
    case 'capability-based':
      // Assign models based on section requirements (reasoning models for results, creative for abstract)
      break;
  }
  
  return assignments;
};
```

### 4. Persistence & Memory Management

```typescript
interface PersistentSession {
  sessionId: string;
  lastUpdated: number;
  state: VixraState;
  templateMetadata: { version: string; hash: string };
}

// Lazy-load section content to prevent memory bloat
interface SectionOutputMetadata {
  sectionId: string;
  contentHash: string;
  modelId: string;
  timestamp: number;
  size: number;
}

const persistSession = async (state: VixraState) => {
  // Store in localStorage with compression for large content
  const compressed = await compressState(state);
  localStorage.setItem(`vixra-session-${state.sessionId}`, compressed);
};

const loadSectionContent = async (sectionId: string, contentHash: string): Promise<string> => {
  // Lazy-load content from persistent store
  const key = `section-content-${contentHash}`;
  return localStorage.getItem(key) || '';
};
```

### 5. UI Updates (Enhanced)

```typescript
interface VixraUIState {
  // Assembly line visualization
  sectionProgress: Map<string, 'pending' | 'dependencies' | 'processing' | 'complete' | 'error'>;
  
  // Model assignment interface
  modelAssignmentMode: 'automatic' | 'manual';
  sectionModelMap: Map<string, string>;
  
  // Template management
  templateVersion: string;
  templatePreview: Map<string, string>;
  
  // Section toggles for optional sections
  enabledSections: Set<string>;
}

// UI Components:
// - SectionDependencyGraph: Visual DAG of section dependencies
// - ModelAssignmentPanel: Drag-and-drop model-to-section assignment
// - SectionProgressTimeline: Real-time assembly line progress
// - TemplateVersionSelector: Lock template versions for reproducibility
```

### 6. Enhanced Variable Validation

```typescript
const validateWorkflowConfiguration = (
  userVariables: Record<string, string>,
  enabledSections: Set<string>,
  dependencyMap: Map<string, string[]>,
  modelAssignments: Map<string, string>
): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Check user variable shadowing
  const sectionIds = Array.from(enabledSections);
  const shadowingVars = sectionIds.filter(id => id in userVariables);
  if (shadowingVars.length > 0) {
    errors.push(`User variables shadow section IDs: ${shadowingVars.join(', ')}`);
  }
  
  // Check dependency integrity
  enabledSections.forEach(sectionId => {
    const deps = dependencyMap.get(sectionId) || [];
    const missingDeps = deps.filter(dep => !enabledSections.has(dep));
    if (missingDeps.length > 0) {
      errors.push(`Section ${sectionId} requires disabled dependencies: ${missingDeps.join(', ')}`);
    }
  });
  
  // Check model assignments
  enabledSections.forEach(sectionId => {
    if (!modelAssignments.has(sectionId)) {
      errors.push(`No model assigned to section: ${sectionId}`);
    }
  });
  
  return { isValid: errors.length === 0, errors, warnings };
};
```

## Critical Requirements (Enhanced)

### User Variable Retention & Protection
- ✅ All user-entered variables must be available to every section
- ✅ Use `VariableEngine.renderFinal()` for proper substitution  
- ✅ Validate required variables before starting workflow
- ✅ **NEW**: Prevent user variables from shadowing section output keys
- ✅ **NEW**: Validate user input against registry schema continuously

### Section Output Passing (Dynamic Dependencies)
- ✅ **CHANGED**: Dynamic dependency resolution, not hardcoded Abstract/Methodology
- ✅ Store section outputs with canonical IDs, build aliases on-demand
- ✅ Support complex dependency graphs (Discussion → Results, Conclusion → Discussion)
- ✅ Handle optional section skips gracefully in dependency resolution

### Error Handling & Resilience
- ✅ If any section fails, pause workflow and allow retry with same models/templates
- ✅ Preserve completed sections and session state across browser refreshes
- ✅ Show clear error messages with dependency context
- ✅ **NEW**: Atomic state updates prevent race conditions from double-clicks/F5
- ✅ **NEW**: Exponential backoff for retries, maximum retry limits

### Template Versioning & Robustness
- ✅ **NEW**: Lock template versions for entire workflow session
- ✅ **NEW**: Use explicit section markers instead of line-number parsing
- ✅ **NEW**: Support template evolution without breaking in-flight workflows
- ✅ **NEW**: Hash-based template integrity checking

### Memory & Performance
- ✅ **NEW**: Lazy-load section content to prevent memory bloat with long papers
- ✅ **NEW**: Compress persistent state in localStorage
- ✅ **NEW**: Configurable model assignment strategies (not fixed 1:1 mapping)

## File Changes Required (Updated)

1. **`client/public/docs/vixra-prompts.md`**: Add section markers `<!-- SECTION_START:id -->`
2. **`client/src/pages/vixra.tsx`**: Complete rewrite with reducer-based state management
3. **`client/src/lib/promptParser.ts`**: Marker-based parsing with versioning
4. **`client/src/lib/vixraWorkflow.ts`**: **NEW**: Core workflow engine and dependency resolver
5. **`client/src/lib/sessionPersistence.ts`**: **NEW**: Session persistence and recovery
6. **`shared/api-types.ts`**: Add section-specific generation and session types
7. **`server/routes.ts`**: Session-aware section generation endpoints

## Testing Strategy (Comprehensive)

1. **Unit Tests**: 
   - Section template parsing with various markdown formats
   - Dependency resolution with optional sections enabled/disabled
   - Variable shadowing detection and validation
   - State reducer atomic operations

2. **Integration Tests**: 
   - Variable passing between sections with complex dependencies
   - Session persistence and recovery across browser refresh
   - Template versioning during workflow execution
   - Model assignment strategies

3. **End-to-End**: 
   - Complete workflow with all sections enabled
   - Partial workflows with optional sections disabled
   - Error recovery and retry scenarios
   - Memory usage with large section outputs

4. **Load Testing**:
   - Multiple concurrent sessions
   - Large template content parsing
   - Session storage limitations

## Success Criteria (Comprehensive)

- ✅ **Workflow**: Sequential execution with dynamic dependency resolution
- ✅ **Variables**: Generic variable engine with no hardcoded section keys
- ✅ **Robustness**: Race-safe state management and session persistence
- ✅ **Templates**: Version-locked, marker-based parsing
- ✅ **Memory**: Efficient handling of large section outputs
- ✅ **UX**: Clear assembly line progress with model assignment control
- ✅ **Flexibility**: Configurable section enablement and model assignment strategies
- ✅ **Reliability**: Graceful error handling with full recovery capabilities