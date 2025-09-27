# Compare Page Refactor Plan
**Date**: September 27, 2025  
**Author**: Cascade (GPT-5 medium reasoning)  
**Purpose**: Refactor home.tsx into modular compare.tsx using existing reusable components and proper SRP/DRY principles

## Current Status: PLANNING COMPLETE
**Overall Progress**: 0% Complete  
**Current Phase**: Analysis & Component Survey

---

## Problem Statement

The current `home.tsx` (565 lines) is a massive SRP violation that combines:
- Model selection UI (but we have reusable components)
- Prompt input with template management
- API state management and calls  
- Response display (but we have ResponseCard)
- Export functionality (but we have ExportButton)
- Navigation (but we have AppNavigation)

The user wants to:
1. **Decompose** all compare functionality from home.tsx into a new compare.tsx 
2. **Reuse existing components** extensively 
3. Create a **proper modular structure** that follows SRP/DRY
4. Make compare.tsx the **new landing page**
5. Eventually deprecate the old home.tsx

---

## Component Inventory (Existing Reusable Components)

### ✅ EXCELLENT - Ready to Reuse
- **`ModelButton.tsx`** - Individual model selection cards with provider colors, loading states, reasoning badges, cost display. Perfect SRP/DRY.
- **`ResponseCard.tsx`** - Comprehensive response display with collapsible reasoning, cost tracking, copy functionality. Well-designed.
- **`ExportButton.tsx`** - Full export functionality (markdown, text, JSON) with dropdown menu. Ready to use.
- **`AppNavigation.tsx`** - Complete navigation with breadcrumbs, theme toggle, mobile menu. Already supports all modes.
- **`MessageCard.tsx`** - Unified message display across modes. Could be useful for battle/debate integration.

### ⚠️ PARTIAL - Needs Evaluation
- **`ModelSelector.tsx`** - Checkbox-based hierarchical model selection. Different pattern from home.tsx provider grouping.

### 🔧 MISSING - Need to Create  
- **`PromptInput`** - Component for prompt textarea with templates, character counter, validation
- **`ComparisonResults`** - Container component for organizing ResponseCard grid
- **`useComparison`** - Custom hook for state management (already created ✅)

---

## Architecture Analysis

### What home.tsx Does (565 lines):
1. **Lines 64-72**: Fetch models using TanStack Query ✅ **Can reuse**
2. **Lines 74-94**: Load prompt templates from markdown ❌ **Need PromptInput component**
3. **Lines 96-145**: Individual model API mutation logic ✅ **Moved to useComparison hook**
4. **Lines 147-180**: Form submission and validation ✅ **Moved to useComparison hook**  
5. **Lines 182-200**: Retry model logic ✅ **Moved to useComparison hook**
6. **Lines 202-227**: Prompt template handlers ❌ **Need PromptInput component**
7. **Lines 234-565**: Massive UI render method ❌ **Break into components**

### What We Can Reuse vs. Create:

| Functionality | Status | Component to Use |
|---------------|--------|------------------|
| Navigation | ✅ Reuse | `AppNavigation` |
| Model cards | ✅ Reuse | `ModelButton` | 
| Model selection logic | ✅ Created | `useComparison` hook |
| Response display | ✅ Reuse | `ResponseCard` |
| Export functionality | ✅ Reuse | `ExportButton` |
| Prompt input + templates | ❌ Create | `PromptInput` |
| Results grid layout | ❌ Create | `ComparisonResults` |
| Provider grouping | ❌ Create | `ModelSelectionPanel` |

---

## Implementation Strategy

### Phase 1: Create Missing Components ✅ IN PROGRESS
**Goal**: Build the 3 missing modular components following shadcn/ui patterns

**Components to Create**:
1. **`PromptInput.tsx`** - Prompt textarea with template selection, character counter, validation
2. **`ModelSelectionPanel.tsx`** - Provider-grouped model selection using existing ModelButton  
3. **`ComparisonResults.tsx`** - Grid container for ResponseCard components

### Phase 2: Build compare.tsx ⏳ PENDING
**Goal**: Assemble the new page using all reusable components

**Structure**:
```tsx
export default function Compare() {
  const { state, actions, status } = useComparison();
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <AppNavigation 
        title="AI Model Comparison" 
        subtitle="Side-by-side model comparison"
        icon={Brain}
      />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-1">
            <ModelSelectionPanel {...state} {...actions} />
          </div>
          
          <div className="xl:col-span-2 space-y-4">
            <PromptInput {...promptProps} />
            <ComparisonResults {...resultProps} />
          </div>
        </div>
      </div>
    </div>
  );
}
```

### Phase 3: Update Routing ⏳ PENDING  
**Goal**: Make compare.tsx the new landing page

**Actions**:
- Update `App.tsx` to use `Compare` component for "/" route
- Keep old `Home` available at "/legacy" temporarily  
- Update AppNavigation paths if needed

### Phase 4: Testing & Validation ⏳ PENDING
**Goal**: Ensure feature parity with old home.tsx

**Test Scenarios**:
- Model selection (individual + provider groups)
- Prompt templates loading and selection
- API calls and parallel responses  
- Error handling and retry
- Export functionality
- Responsive design
- Theme switching

### Phase 5: Deprecation ⏳ PENDING
**Goal**: Clean up old code

**Actions**:
- Move `home.tsx` to `home-legacy.tsx`
- Remove legacy route
- Update documentation
- Git commit with detailed changes

---

## Component Specifications

### 1. PromptInput Component
```typescript
interface PromptInputProps {
  prompt: string;
  setPrompt: (prompt: string) => void;
  onSubmit: () => void;
  disabled: boolean;
  selectedModels: string[];
}
```
**Features**:
- Textarea with character counter (32k limit)
- Template selection dropdowns (category + prompt)
- Clear selection functionality
- Raw prompt preview toggle
- Validation and submission

### 2. ModelSelectionPanel Component  
```typescript
interface ModelSelectionPanelProps {
  models: AIModel[];
  selectedModels: string[];
  loadingModels: Set<string>;
  onToggleModel: (modelId: string) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
  showTiming: boolean;
  setShowTiming: (show: boolean) => void;
}
```
**Features**:
- Provider grouping (reuse home.tsx logic)
- Individual ModelButton components
- Provider-level select/deselect
- Quick actions (select all, clear all)
- Show timing toggle

### 3. ComparisonResults Component
```typescript
interface ComparisonResultsProps {
  models: AIModel[];
  responses: Record<string, ModelResponse>;
  selectedModels: string[];
  onRetry: (modelId: string) => void;
  showTiming: boolean;
}
```
**Features**:
- Grid layout of ResponseCard components
- Empty state when no models selected
- Loading states coordination
- Retry functionality delegation

---

## File Structure Changes  

### New Files Created:
```
client/src/
├── components/
│   └── comparison/                    # New directory
│       ├── PromptInput.tsx           # ✅ Create
│       ├── ModelSelectionPanel.tsx  # ✅ Create  
│       └── ComparisonResults.tsx     # ✅ Create
├── hooks/
│   └── useComparison.ts              # ✅ Created
└── pages/
    └── compare.tsx                   # ✅ Create (new landing page)
```

### Modified Files:
```
client/src/
├── App.tsx                           # Update routing
└── pages/
    └── home-legacy.tsx              # Rename old file
```

---

## Risks & Considerations

### Technical Risks
- **State Management**: Ensure useComparison hook handles all edge cases from original
- **Template Loading**: Prompt template loading must work identically  
- **Provider Colors**: Maintain consistent provider color theming
- **Export Compatibility**: Ensure ExportButton works with new data structures

### UX Risks  
- **Feature Parity**: All existing functionality must be preserved
- **Performance**: New component structure should not degrade performance
- **Responsive Design**: Mobile/tablet layouts must work properly
- **Loading States**: Ensure smooth loading experience across components

### Development Risks
- **Component Props**: Interface design between components must be clean
- **Import Paths**: Ensure all import paths resolve correctly  
- **TypeScript**: Maintain type safety across component boundaries
- **Testing**: All critical user flows must be tested

---

## Success Criteria

### Functional Requirements ✅/❌
- ❌ New compare.tsx provides identical functionality to old home.tsx
- ❌ All existing features work: model selection, prompts, API calls, responses, export
- ❌ Provider grouping and individual model selection preserved
- ❌ Prompt templates load and work correctly
- ❌ Error handling and retry functionality maintained
- ❌ Export button integrates seamlessly
- ❌ Responsive design works on all screen sizes

### Technical Requirements ✅/❌  
- ✅ Components follow SRP - each has single responsibility
- ❌ DRY principles followed - reuse existing components extensively
- ❌ shadcn/ui components used throughout
- ❌ TypeScript type safety maintained
- ❌ Performance acceptable (no regressions)
- ❌ Clean component interfaces and props

### Code Quality ✅/❌
- ✅ useComparison hook handles all state management  
- ❌ Components are properly sized (under 200 lines each)
- ❌ Import statements clean and organized
- ❌ File headers with author, date, purpose, SRP/DRY check
- ❌ Consistent code formatting and style

---

## Next Steps (Priority Order)

### 1. Create PromptInput Component 🔄 NEXT
- Extract prompt textarea and template logic from home.tsx
- Use shadcn/ui Select, Textarea, Button, Card components
- Handle template loading and selection state
- Add character counter and validation

### 2. Create ModelSelectionPanel Component ⏳
- Extract provider grouping logic from home.tsx  
- Compose existing ModelButton components
- Add provider-level selection controls
- Include show timing toggle

### 3. Create ComparisonResults Component ⏳  
- Simple container that maps models to ResponseCard components
- Handle empty state display
- Coordinate loading states
- Pass retry function through

### 4. Build compare.tsx Page ⏳
- Assemble all components using useComparison hook
- Add AppNavigation and ExportButton
- Test all functionality works end-to-end

### 5. Update Routing & Test ⏳
- Make compare.tsx the new "/" route
- Comprehensive testing of all features
- Performance and responsive testing

---

## Implementation Notes

### Component Communication Pattern:
```
compare.tsx
├── useComparison() hook (state management)
├── AppNavigation (reuse)  
├── ModelSelectionPanel (create) 
│   └── ModelButton[] (reuse)
├── PromptInput (create)
└── ComparisonResults (create)
    ├── ResponseCard[] (reuse)  
    └── ExportButton (reuse)
```

### State Flow:
1. **useComparison** manages all comparison state
2. **ModelSelectionPanel** receives selection state + actions
3. **PromptInput** receives prompt state + submission
4. **ComparisonResults** receives responses + models to display  
5. **ExportButton** receives final results for export

### Key Insight:
The existing components (ModelButton, ResponseCard, ExportButton, AppNavigation) are already excellent and follow proper SRP/DRY principles. The task is to **decompose the monolithic home.tsx** and **create the missing glue components** that orchestrate these existing pieces properly.

---

*This plan will be updated as implementation progresses. Next developer can pick up from any phase.*
