<!--
File: docs/vixra-variable-generation-fix.md
Purpose: Plan to fix VixraUtils variable generation system to properly respect user input and use LLM-based dynamic generation
How it works: Analysis of current problems and step-by-step implementation plan using existing project architecture
How the project uses it: Developer reference for implementing proper variable generation in Vixra mode
Author: Claude Code
Date: 2025-08-18
Status: UPDATED - Incorporates insights from completed vixra-fix.md plan
-->

# Vixra Variable Generation Fix Plan (Updated)

## Project Context Understanding

### Completed Work from vixra-fix.md
The project already completed a comprehensive vixra-fix that:
- ✅ **Simplified the approach**: Moved away from complex staged workflow to simple sequential generation
- ✅ **Uses existing architecture**: Leverages `/api/models/respond` endpoint like other pages  
- ✅ **Maintains critical auto-generation**: Preserves the satirical variable generation feature
- ✅ **Follows established patterns**: Uses ModelButton, ResponseCard, ExportButton components

### Current Implementation Status
The current Vixra page is a **simplified version** that works correctly except for variable generation. It:
- Uses simple section-by-section generation (not complex staging)
- Follows same mutation patterns as home.tsx, battle-chat.tsx, etc.
- Has proper UI with template selection, model selection, and sequential controls
- Needs only the variable generation system fixed

## Problem Analysis (Updated)

The current `VixraUtils.autoGenerateVariables()` function has critical flaws that violate the project's design principles:

### Current Issues:
1. **Overwrites User Input**: Hardcoded generation ignores user-provided values  
2. **Static Content**: Uses predefined arrays instead of dynamic LLM generation
3. **No Persistence**: Generated values don't appear in UI inputs for user visibility
4. **Field Confusion**: Had both "ResearcherName" AND "Authors" fields (now consolidated to "Author")
5. **Limited Categories**: Only 6 science categories instead of full viXra taxonomy (now fixed - 37 categories)

### Code Evidence:
```typescript
// WRONG - This overwrites user input every time:
if (!generated.Title || generated.Title.trim() === '') {
  // Hardcoded array selection instead of LLM generation
  generated.Title = `${prefix} ${subject}`;  // Static content from arrays
}
```

### What's Already Fixed:
- ✅ **Science Categories**: Updated to full viXra taxonomy (37 categories)
- ✅ **Field Consolidation**: Single "Author" field instead of "ResearcherName" + "Authors"
- ✅ **Reply Persistence**: Auto mode waits for all models to complete before advancing
- ✅ **Architecture**: Already uses `/api/models/respond` and established patterns

## Architecture Analysis (Updated)

### Robust Systems Already in Use:

1. **Simplified API Pattern** (`/api/models/respond`):
   - ✅ Already implemented in vixra.tsx following home.tsx patterns
   - ✅ Consistent mutation handling with proper loading states
   - ✅ Error handling matches other pages

2. **Template System**:
   - ✅ Uses `parseVixraTemplates()` to load section templates from markdown
   - ✅ Template selection UI already working
   - ✅ Variable substitution via `substituteVariables()` function

3. **UI Components**:
   - ✅ Already uses ModelButton, ResponseCard, ExportButton
   - ✅ Proper state management with controlled inputs
   - ✅ Sequential section generation with dependency checking

## Solution Architecture (Updated)

### Core Principle: **Minimal Changes, Maximum Impact**

The key insight from the completed vixra-fix.md is that we should:
1. **Keep the simplified approach** - no complex workflow changes needed
2. **Only fix variable generation** - the rest of the implementation is correct
3. **Respect user input always** - never overwrite user-provided values
4. **Use LLM for missing values** - dynamic satirical content instead of hardcoded arrays

### Updated Variable Fields:
```typescript
// Current simplified variable state (already corrected):
const [variables, setVariables] = useState({
  Author: '',           // Consolidated from ResearcherName + Authors  
  ScienceCategory: '',  // Full viXra taxonomy (37 options)
  Title: ''            // User-provided or LLM-generated
});
```

### Variable Generation Flow:
```
User Input → Check Empty Fields → LLM Generate Missing → Update UI State → Section Generation
```

## Implementation Plan (Revised)

### Phase 1: Add Variable Generation Prompts

Add new sections to existing `client/public/docs/vixra-prompts.md`:

```markdown
## Variable Generation

<!-- SECTION_START:generate-title -->
### Generate Paper Title
Generate a satirical but believable academic paper title for "{ScienceCategory}". 
The title should sound grandiose and revolutionary while being completely absurd.
Examples: "Revolutionary Breakthrough in Quantum Coffee Dynamics", "Novel Approach to Interdimensional Sock Teleportation"
Output only the title, no commentary.
<!-- SECTION_END:generate-title -->

<!-- SECTION_START:generate-author -->
### Generate Author Name  
Generate a satirical researcher name that sounds academic but ridiculous.
Format: "Dr./Prof. [Pretentious First Name] [Academic-sounding Last Name]"
Examples: "Dr. Quantum Pseudoscience", "Prof. Cosmic Paradigm", "Dr. Ethereal Breakthrough"
Output only the name, no commentary.
<!-- SECTION_END:generate-author -->
```

### Phase 2: Replace Hardcoded Generation (Simplified)

Replace `autoGenerateVariables()` in `vixraUtils.ts` with LLM-based function that respects user input:

```typescript
// UPDATED: Respects user input, uses LLM for missing values
export async function generateMissingVariables(
  userVariables: Record<string, string>,
  promptTemplates: Map<string, string>
): Promise<Record<string, string>> {
  const result = { ...userVariables };
  
  // Only generate if user hasn't provided value
  if (!result.Title?.trim() && result.ScienceCategory) {
    result.Title = await generateSingleVariable(
      'generate-title', 
      { ScienceCategory: result.ScienceCategory }, 
      promptTemplates
    );
  }
  
  if (!result.Author?.trim()) {
    result.Author = await generateSingleVariable('generate-author', {}, promptTemplates);
  }
  
  return result;
}

async function generateSingleVariable(
  templateId: string, 
  variables: Record<string, string>,
  templates: Map<string, string>
): Promise<string> {
  const template = templates.get(templateId);
  if (!template) return '';
  
  const prompt = substituteVariables(template, variables);
  
  // Use same pattern as section generation
  try {
    const response = await apiRequest('POST', '/api/models/respond', {
      modelId: 'gpt-4o-mini', // Fast, cheap model for variables
      prompt
    });
    
    const data = await response.json();
    return data.content?.trim() || '';
  } catch (error) {
    console.error('Variable generation failed:', error);
    return ''; // Return empty - don't overwrite with fallback
  }
}
```

### Phase 3: Minimal Vixra Page Updates

Only update the `buildSectionPrompt` function in `client/src/pages/vixra.tsx`:

```typescript
// BEFORE: Uses hardcoded generation that overwrites user input
const buildSectionPrompt = (sectionId: string): string => {
  // Auto-generate any missing variables
  const autoGeneratedVars = autoGenerateVariables(variables, variables.ScienceCategory || '');
  // ... rest of function
};

// AFTER: Respects user input, generates only missing values
const buildSectionPrompt = async (sectionId: string): Promise<string> => {
  const template = promptTemplates.get(sectionId);
  if (!template) throw new Error(`No template found for section: ${sectionId}`);

  // Generate missing variables ONLY (respects user input)
  const completeVariables = await generateMissingVariables(variables, promptTemplates);
  
  // Update UI with any newly generated variables
  if (completeVariables.Title !== variables.Title || completeVariables.Author !== variables.Author) {
    setVariables(completeVariables);
  }
  
  // Continue with existing dependency and substitution logic...
  const sectionInfo = SECTION_ORDER.find(s => s.id === sectionId);
  const allVariables = { ...completeVariables };
  
  // ... existing dependency logic unchanged ...
  
  return substituteVariables(template, allVariables);
};
```

### Phase 4: Optional UI Enhancements (Later)

Add generation buttons for individual variables:
```jsx
<div className="flex items-center space-x-2">
  <Input
    value={variables.Title || ''}
    onChange={(e) => updateVariable('Title', e.target.value)}
    placeholder=""
  />
  <Button
    variant="outline" 
    size="sm"
    onClick={async () => {
      const generated = await generateMissingVariables(
        { ...variables, Title: '' }, // Force regenerate Title
        promptTemplates
      );
      setVariables(prev => ({ ...prev, Title: generated.Title }));
    }}
  >
    🎲
  </Button>
</div>
```

## Benefits of This Updated Approach

### Technical Benefits
- ✅ **Minimal Code Changes**: Only updates variable generation, keeps working architecture
- ✅ **Respects User Input**: Never overwrites user-provided values
- ✅ **Uses Existing Patterns**: Same `/api/models/respond` pattern as other pages
- ✅ **Dynamic Content**: LLM generates contextually appropriate satirical content  
- ✅ **Maintains Simplicity**: No complex workflow changes needed

### User Experience Benefits
- ✅ **Immediate Visibility**: Generated variables appear in input fields
- ✅ **User Control**: Can edit generated content or provide own values
- ✅ **Transparent Process**: Clear when values are generated vs user-provided
- ✅ **Reliable Generation**: No hardcoded repetition, always fresh content

### Alignment with Completed Work
- ✅ **Preserves vixra-fix.md gains**: Maintains simplified, working architecture
- ✅ **Critical auto-generation**: Keeps satirical variable generation feature
- ✅ **Established patterns**: Uses same mutation/loading patterns as other pages
- ✅ **Component reuse**: ModelButton, ResponseCard, ExportButton already working

## Implementation Priority (Updated)

### Phase 1: Core Fix (High Priority)
1. Add variable generation prompts to `vixra-prompts.md`
2. Replace `autoGenerateVariables()` with LLM-based `generateMissingVariables()`
3. Update `buildSectionPrompt()` to use new async generation
4. Test that user input is respected and missing values are generated

### Phase 2: UI Polish (Optional)
1. Add 🎲 buttons for individual variable regeneration
2. Loading indicators during generation
3. Better visual distinction between user vs generated content

## Success Criteria (Updated)

### Must Have (Critical)
- ✅ User-provided values are never overwritten
- ✅ Empty fields are generated using LLM with satirical content
- ✅ Generated values appear immediately in UI inputs
- ✅ Uses existing `/api/models/respond` pattern consistently

### Nice to Have (Optional)
- Individual variable regeneration buttons
- Visual indicators for generated vs user content
- Batch "generate all missing" functionality

## Conclusion

This updated plan focuses on the **minimal necessary changes** to fix the variable generation system while preserving all the good work from the completed vixra-fix.md. The key insight is that the current Vixra implementation is actually working well - it just needs the variable generation fixed to respect user input and use LLM generation instead of hardcoded arrays.

By keeping the changes minimal and targeted, we maintain the stability and simplicity achieved in the previous fix while solving the core variable generation problem.