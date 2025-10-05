# Vixra UI Redesign - Implementation Task List
**Author:** Cascade using Claude Sonnet 4  
**Date:** 2025-10-04  
**Status:** Ready for Implementation  
**Parent Doc:** 2025-10-04-plan-vixra-ui-redesign.md

---

## Key Requirements from User Feedback

### ✅ User Decisions Applied
1. **Author Input:** Required field with default "Dr. Max Power"
2. **Science Category:** Pre-select "General Science and Philosophy" + Random button option
3. **Auto-Mode Behavior:** 
   - Use single selected model for ALL sections (no multi-model in auto)
   - NO pause between sections - continuous generation
   - Show grid of sections with loading animations
   - Sections clickable to read while waiting for next
4. **Export Timing:** BOTH after Abstract (early) AND after completion
5. **Commit Strategy:** Git commit after each phase 1-4

---

## Phase 1: Create New Vixra Component Files
**Goal:** Build reusable components following Compare page patterns  
**Estimated Time:** 45 minutes  
**Commit Message:** "feat(vixra): Create new hero-centered UI components"

### Task 1.1: PaperSetupCard Component
**File:** `client/src/components/vixra/PaperSetupCard.tsx`

**Requirements:**
- ✅ Author Name input (required, default: "Dr. Max Power")
- ✅ Science Category select with pre-selection to "General Science and Philosophy"
- ✅ Random Category button (dice icon) next to dropdown
- ✅ Title input (optional, collapsible under "Advanced Settings")
- ✅ Single model selection as pill (default: gpt-5-nano)
- ✅ Model picker button (+ icon) opens floating picker
- ✅ Mode toggle: Manual vs. Auto (Switch component)
- ✅ Primary CTA: "🚀 Generate Paper" button
- ✅ Disabled states with helpful tooltips
- ✅ Form validation for required fields

**Props Interface:**
```typescript
interface PaperSetupCardProps {
  // Paper config
  author: string;
  onAuthorChange: (value: string) => void;
  scienceCategory: string;
  onCategoryChange: (value: string) => void;
  onRandomCategory: () => void;
  title: string;
  onTitleChange: (value: string) => void;
  
  // Model selection
  selectedModel: string;
  models: AIModel[];
  onModelSelect: (modelId: string) => void;
  
  // Mode & generation
  isAutoMode: boolean;
  onModeToggle: (enabled: boolean) => void;
  onGenerate: () => void;
  isGenerating: boolean;
  disabled?: boolean;
}
```

**shadcn/ui Components:**
- Card, CardHeader, CardTitle, CardContent
- Input (author, title)
- Select (science category)
- Button (generate, random, model picker)
- Switch (manual/auto toggle)
- Badge (model pill)
- Tooltip (help text)

**Testing Checklist:**
- [ ] Default values populate correctly
- [ ] Random category button cycles through categories
- [ ] Model picker opens on + click
- [ ] Form validates before submission
- [ ] Disabled states prevent interaction

---

### Task 1.2: SectionProgressTracker Component
**File:** `client/src/components/vixra/SectionProgressTracker.tsx`

**Requirements:**
- ✅ Horizontal grid of 8 section cards/badges
- ✅ Section states: Completed (✓), Generating (⏳), Locked (🔒), Pending (○)
- ✅ Click completed section → scroll to that section
- ✅ Click generating section → show in loading state
- ✅ Locked sections show tooltip explaining dependencies
- ✅ Overall progress bar below section grid
- ✅ Estimated time remaining (based on avg section time)
- ✅ Smooth transitions between states

**Section States:**
```typescript
type SectionStatus = 'locked' | 'pending' | 'generating' | 'completed' | 'failed';

interface Section {
  id: string;
  name: string;
  status: SectionStatus;
  dependencies: string[];
  content?: string;
  metadata?: {
    responseTime: number;
    tokenUsage: number;
    wordCount: number;
  };
}
```

**Props Interface:**
```typescript
interface SectionProgressTrackerProps {
  sections: Section[];
  currentSectionId: string | null;
  onSectionClick: (sectionId: string) => void;
  showProgress?: boolean;
}
```

**Visual Design:**
- Grid layout: `grid-cols-4 md:grid-cols-8 gap-2`
- Section badges: 
  - Completed: green bg, white text, ✓ icon
  - Generating: blue bg, pulse animation, ⏳ icon
  - Locked: gray bg, gray text, 🔒 icon, cursor-not-allowed
  - Pending: white bg, border, ○ icon
- Progress bar: full width below grid
- Time estimate: text-sm text-muted-foreground

**Testing Checklist:**
- [ ] Section states render correctly
- [ ] Click navigation scrolls to section
- [ ] Locked sections show dependency tooltips
- [ ] Progress bar updates smoothly
- [ ] Responsive on mobile (4 cols) and desktop (8 cols)

---

### Task 1.3: SectionResultsStream Component
**File:** `client/src/components/vixra/SectionResultsStream.tsx`

**Requirements:**
- ✅ Sequential display of section cards
- ✅ Each section uses existing ResponseCard component
- ✅ Section headers with icon, model used, metadata
- ✅ Smooth scroll animation when new section appears
- ✅ Skeleton loaders for generating sections
- ✅ Per-section export controls (Copy, Regenerate)
- ✅ Grid view when no content yet (shows placeholders)
- ✅ Click placeholder → scroll to progress tracker

**Props Interface:**
```typescript
interface SectionResultsStreamProps {
  sections: Section[];
  models: AIModel[];
  onRegenerateSection: (sectionId: string) => void;
  isGenerating: boolean;
}
```

**Layout:**
- Empty state: Grid of 8 placeholder cards with section names
- Generating state: Placeholder shows skeleton loader
- Completed state: Full ResponseCard with content
- Failed state: Error card with retry button

**shadcn/ui Components:**
- Card (section wrapper)
- ResponseCard (reuse existing)
- Button (copy, regenerate)
- Skeleton (loading state)

**Testing Checklist:**
- [ ] Empty state shows 8 placeholder cards
- [ ] Sections appear in order as generated
- [ ] Smooth scroll to new section
- [ ] Copy/regenerate buttons work per section
- [ ] Skeleton loaders show during generation

---

### Task 1.4: PaperExportFooter Component
**File:** `client/src/components/vixra/PaperExportFooter.tsx`

**Requirements:**
- ✅ Fixed position footer (or floating card)
- ✅ Three export buttons: Download PDF, Copy Markdown, Print
- ✅ Shows total paper stats (word count, generation time, reading time)
- ✅ Celebration animation on first appearance
- ✅ Appears after Abstract AND after completion (two visibility states)
- ✅ Compact mobile layout

**Props Interface:**
```typescript
interface PaperExportFooterProps {
  sections: Section[];
  paperTitle: string;
  paperAuthor: string;
  onExportPDF: () => void;
  onExportMarkdown: () => void;
  onPrint: () => void;
  visible: boolean;
  isComplete: boolean; // true = all sections, false = partial
}
```

**Visual States:**
- **After Abstract:** "Export Draft" badge, muted colors
- **After Completion:** "Export Complete Paper" badge, vibrant colors + animation

**shadcn/ui Components:**
- Card (footer container)
- Button (export actions)
- Badge (draft vs. complete indicator)

**Testing Checklist:**
- [ ] Appears after Abstract generation
- [ ] Updates appearance after full completion
- [ ] Export functions work correctly
- [ ] Mobile layout is compact
- [ ] Celebration animation plays once

---

## Phase 2: Refactor Page State Management
**Goal:** Simplify state for single-model auto-mode workflow  
**Estimated Time:** 30 minutes  
**Commit Message:** "refactor(vixra): Simplify state management for single-model workflow"

### Task 2.1: Create useVixraPaper Custom Hook
**File:** `client/src/hooks/useVixraPaper.ts`

**Purpose:** Centralize Vixra page state and logic

**State Structure:**
```typescript
interface VixraPaperState {
  // Paper configuration
  paperConfig: {
    author: string;
    scienceCategory: string;
    title: string;
  };
  
  // Model selection (single model for auto, can be array for manual)
  selectedModel: string;
  
  // Generation mode
  generationMode: 'manual' | 'auto';
  isGenerating: boolean;
  
  // Section management
  sections: Section[];
  currentSectionId: string | null;
  
  // Progress tracking
  progress: {
    completed: number;
    total: number;
    estimatedTimeRemaining: number;
  };
}
```

**Actions:**
```typescript
interface VixraPaperActions {
  // Paper config
  updateAuthor: (author: string) => void;
  updateCategory: (category: string) => void;
  randomizeCategory: () => void;
  updateTitle: (title: string) => void;
  
  // Model selection
  selectModel: (modelId: string) => void;
  
  // Mode control
  setGenerationMode: (mode: 'manual' | 'auto') => void;
  
  // Generation control
  startGeneration: () => void;
  stopGeneration: () => void;
  generateNextSection: () => void;
  regenerateSection: (sectionId: string) => void;
  
  // Section navigation
  scrollToSection: (sectionId: string) => void;
}
```

**Key Logic:**
- Initialize with defaults (Dr. Max Power, General Science and Philosophy, gpt-5-nano)
- Auto-mode: Sequential section generation with single model
- Manual-mode: User-controlled section generation
- Dependency checking before section generation
- Progress calculation based on completed sections

**Testing Checklist:**
- [ ] Defaults initialize correctly
- [ ] Random category function works
- [ ] Auto-mode generates all sections sequentially
- [ ] Manual-mode waits for user trigger
- [ ] Dependency blocking prevents premature generation

---

### Task 2.2: Refactor vixraUtils.ts
**File:** `client/src/lib/vixraUtils.ts`

**Changes Needed:**
- ✅ Add `getRandomCategory()` function
- ✅ Ensure `generateMissingVariables()` respects user input
- ✅ Add section state helpers (`isSectionLocked`, `getNextSection`, etc.)
- ✅ Keep existing export functions (downloadVixraPaper, copyVixraPaper, printVixraPaper)

**New Functions:**
```typescript
// Get random science category
export function getRandomCategory(categories: string[]): string {
  return categories[Math.floor(Math.random() * categories.length)];
}

// Check if section is locked due to dependencies
export function isSectionLocked(
  sectionId: string,
  completedSections: string[],
  sectionOrder: typeof SECTION_ORDER
): boolean {
  const section = sectionOrder.find(s => s.id === sectionId);
  if (!section) return true;
  return section.dependencies.some(dep => !completedSections.includes(dep));
}

// Get next eligible section for auto-mode
export function getNextEligibleSection(
  completedSections: string[],
  sectionOrder: typeof SECTION_ORDER
): string | null {
  for (const section of sectionOrder) {
    if (completedSections.includes(section.id)) continue;
    if (!isSectionLocked(section.id, completedSections, sectionOrder)) {
      return section.id;
    }
  }
  return null;
}

// Calculate estimated time remaining
export function calculateEstimatedTime(
  completedSections: number,
  totalSections: number,
  avgSectionTime: number
): number {
  const remainingSections = totalSections - completedSections;
  return remainingSections * avgSectionTime;
}
```

**Testing Checklist:**
- [ ] Random category returns valid category
- [ ] Section locking logic correct
- [ ] Next section calculation respects dependencies
- [ ] Time estimation reasonable

---

## Phase 3: Rebuild Page Layout
**Goal:** Single-column hero-centered design  
**Estimated Time:** 40 minutes  
**Commit Message:** "feat(vixra): Implement hero-centered single-column layout"

### Task 3.1: Update vixra.tsx Page Structure
**File:** `client/src/pages/vixra.tsx`

**Major Changes:**
1. **Remove 3-column grid layout**
   - Before: `<div className="grid grid-cols-1 xl:grid-cols-3 gap-6">`
   - After: `<div className="max-w-4xl mx-auto px-4 py-6 space-y-6">`

2. **Replace fragmented UI with components**
   - Before: Inline model selection sidebar, variables panel, section controls
   - After: `<PaperSetupCard />`, `<SectionProgressTracker />`, `<SectionResultsStream />`, `<PaperExportFooter />`

3. **Integrate useVixraPaper hook**
   - Replace multiple useState calls with single hook
   - Pass state and actions to components via props

**New Page Structure:**
```tsx
export default function VixraPage() {
  const { paperState, actions, sections, progress } = useVixraPaper();
  const { data: models = [] } = useQuery({ /* ... */ });

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppNavigation 
        title="Vixra Mode" 
        subtitle="Generate satirical academic papers with AI"
        icon={FileText}
      />

      <div className="flex-1">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
          <div className="space-y-6">
            {/* Hero: Paper Setup */}
            <PaperSetupCard
              author={paperState.paperConfig.author}
              onAuthorChange={actions.updateAuthor}
              scienceCategory={paperState.paperConfig.scienceCategory}
              onCategoryChange={actions.updateCategory}
              onRandomCategory={actions.randomizeCategory}
              title={paperState.paperConfig.title}
              onTitleChange={actions.updateTitle}
              selectedModel={paperState.selectedModel}
              models={models}
              onModelSelect={actions.selectModel}
              isAutoMode={paperState.generationMode === 'auto'}
              onModeToggle={(enabled) => actions.setGenerationMode(enabled ? 'auto' : 'manual')}
              onGenerate={actions.startGeneration}
              isGenerating={paperState.isGenerating}
            />

            {/* Progress Tracker (conditional) */}
            {paperState.isGenerating && (
              <SectionProgressTracker
                sections={sections}
                currentSectionId={paperState.currentSectionId}
                onSectionClick={actions.scrollToSection}
              />
            )}

            {/* Section Results */}
            <SectionResultsStream
              sections={sections}
              models={models}
              onRegenerateSection={actions.regenerateSection}
              isGenerating={paperState.isGenerating}
            />

            {/* Export Footer (conditional) */}
            {sections.some(s => s.status === 'completed') && (
              <PaperExportFooter
                sections={sections}
                paperTitle={paperState.paperConfig.title}
                paperAuthor={paperState.paperConfig.author}
                onExportPDF={() => downloadVixraPaper(sections)}
                onExportMarkdown={() => copyVixraPaper(sections)}
                onPrint={() => printVixraPaper(sections)}
                visible={true}
                isComplete={sections.every(s => s.status === 'completed')}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
```

**Code Removal:**
- [ ] Remove old model sidebar (lines ~420-520)
- [ ] Remove old variables panel (lines ~525-605)
- [ ] Remove old section selector dropdown (lines ~680-745)
- [ ] Remove old manual generation controls (lines ~710-760)
- [ ] Keep template loading logic (lines ~119-148)
- [ ] Keep mutation logic but simplify (lines ~151-214)

**Testing Checklist:**
- [ ] Page renders without errors
- [ ] All components receive correct props
- [ ] Layout is single-column and centered
- [ ] Mobile responsive (320px - 1920px)

---

### Task 3.2: Update Template Loading
**No file changes needed** - existing logic works

**Verify:**
- [ ] Templates load from `/docs/vixra-prompts.md`
- [ ] `parseVixraTemplates()` correctly extracts sections
- [ ] Template map populates `promptTemplates` state

---

### Task 3.3: Simplify Mutation Logic
**File:** `client/src/pages/vixra.tsx`

**Changes:**
- Auto-mode: Generate sections sequentially without user interaction
- Manual-mode: Wait for user click on "Generate Next Section" button
- Single model: Remove logic for handling multiple models in auto-mode
- Keep multi-model support for manual mode (edge case)

**Auto-Mode Flow:**
```typescript
// In useVixraPaper hook or page component
const startAutoGeneration = async () => {
  setIsGenerating(true);
  
  let nextSectionId = getNextEligibleSection(completedSections, SECTION_ORDER);
  
  while (nextSectionId) {
    setCurrentSectionId(nextSectionId);
    
    // Generate with selected model
    const prompt = await buildSectionPrompt(nextSectionId);
    await modelResponseMutation.mutateAsync({
      prompt,
      modelId: selectedModel,
      sectionId: nextSectionId
    });
    
    // Get next section (continuous, no delay)
    nextSectionId = getNextEligibleSection(completedSections, SECTION_ORDER);
  }
  
  setIsGenerating(false);
  // Show completion celebration
};
```

**Testing Checklist:**
- [ ] Auto-mode generates all sections without pause
- [ ] Manual-mode waits for user action
- [ ] Single model used consistently in auto-mode
- [ ] Section dependencies respected

---

## Phase 4: Add UX Enhancements
**Goal:** Polish with animations, smart defaults, visual feedback  
**Estimated Time:** 35 minutes  
**Commit Message:** "feat(vixra): Add UX enhancements - animations, defaults, visual feedback"

### Task 4.1: Smart Defaults & Initialization
**File:** `client/src/hooks/useVixraPaper.ts` or `client/src/pages/vixra.tsx`

**Defaults to Set:**
```typescript
const DEFAULT_AUTHOR = "Dr. Max Power";
const DEFAULT_CATEGORY = "General Science and Philosophy";
const DEFAULT_MODEL = "gpt-5-nano-2025-08-07";
const DEFAULT_MODE = "auto";
```

**Initialization Logic:**
```typescript
useEffect(() => {
  // Set defaults on mount
  if (!paperState.paperConfig.author) {
    actions.updateAuthor(DEFAULT_AUTHOR);
  }
  if (!paperState.paperConfig.scienceCategory) {
    actions.updateCategory(DEFAULT_CATEGORY);
  }
  if (!paperState.selectedModel && models.length > 0) {
    const defaultModel = models.find(m => m.id === DEFAULT_MODEL);
    if (defaultModel) {
      actions.selectModel(defaultModel.id);
    }
  }
}, [models]);
```

**localStorage Persistence (Optional):**
- Save last-used author name
- Save last-used model
- Restore on page load

**Testing Checklist:**
- [ ] Page loads with Dr. Max Power as author
- [ ] Science category pre-selected
- [ ] gpt-5-nano pre-selected (if available)
- [ ] Auto-mode enabled by default

---

### Task 4.2: Smooth Scroll to Sections
**File:** `client/src/hooks/useVixraPaper.ts` or new `client/src/lib/vixraAnimations.ts`

**Function:**
```typescript
export function scrollToSection(sectionId: string) {
  const element = document.getElementById(`section-${sectionId}`);
  if (element) {
    element.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
      inline: 'nearest'
    });
  }
}
```

**Integration:**
- Call on new section completion (in mutation onSuccess)
- Call when user clicks completed section in progress tracker

**Testing Checklist:**
- [ ] Smooth scroll animation works
- [ ] Scrolls to correct section
- [ ] Works on mobile and desktop

---

### Task 4.3: Section Grid with Loading Animations
**File:** `client/src/components/vixra/SectionResultsStream.tsx`

**Empty State:**
```tsx
{sections.filter(s => s.status === 'completed').length === 0 && (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    {sections.map((section) => (
      <Card key={section.id} className="p-6 hover:border-primary/50 transition-colors cursor-pointer">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
            {section.status === 'locked' ? '🔒' : '○'}
          </div>
          <div>
            <h3 className="font-semibold">{section.name}</h3>
            <p className="text-xs text-muted-foreground">
              {section.status === 'locked' 
                ? `Requires: ${section.dependencies.join(', ')}`
                : 'Ready to generate'}
            </p>
          </div>
        </div>
      </Card>
    ))}
  </div>
)}
```

**Generating State:**
```tsx
{section.status === 'generating' && (
  <Card className="animate-pulse">
    <CardContent className="pt-6">
      <Skeleton className="h-4 w-full mb-2" />
      <Skeleton className="h-4 w-3/4 mb-2" />
      <Skeleton className="h-4 w-5/6" />
    </CardContent>
  </Card>
)}
```

**Testing Checklist:**
- [ ] Empty state shows 8 placeholder cards
- [ ] Generating state shows pulse animation
- [ ] User can click placeholders
- [ ] Grid responsive on mobile/desktop

---

### Task 4.4: Completion Celebration Animation
**File:** `client/src/components/vixra/PaperExportFooter.tsx`

**Animation Options:**
- Confetti burst (use react-confetti library if available)
- Fade-in slide-up animation
- Success toast notification

**Simple CSS Animation:**
```tsx
// On first appearance (isComplete = true)
<Card className="animate-in slide-in-from-bottom-5 duration-500">
  <CardContent className="flex items-center justify-center space-x-4 py-4">
    <Badge variant="success" className="animate-pulse">
      ✨ Paper Complete!
    </Badge>
    {/* Export buttons */}
  </CardContent>
</Card>
```

**Testing Checklist:**
- [ ] Animation plays on completion
- [ ] Animation only plays once
- [ ] Footer visible after animation

---

### Task 4.5: Error Handling & Retry
**File:** `client/src/components/vixra/SectionResultsStream.tsx`

**Failed Section Card:**
```tsx
{section.status === 'failed' && (
  <Card className="border-destructive">
    <CardHeader>
      <CardTitle className="flex items-center space-x-2 text-destructive">
        <XCircle className="w-5 h-5" />
        <span>Failed to generate {section.name}</span>
      </CardTitle>
    </CardHeader>
    <CardContent>
      <p className="text-sm text-muted-foreground mb-4">
        An error occurred while generating this section.
      </p>
      <Button
        onClick={() => onRegenerateSection(section.id)}
        variant="outline"
        size="sm"
      >
        <RotateCw className="w-4 h-4 mr-2" />
        Regenerate Section
      </Button>
    </CardContent>
  </Card>
)}
```

**Testing Checklist:**
- [ ] Failed sections show error card
- [ ] Regenerate button works
- [ ] Error doesn't break auto-mode flow

---

### Task 4.6: Accessibility Improvements
**Files:** All component files

**ARIA Labels:**
- Progress tracker: `aria-label="Paper generation progress"`
- Section badges: `aria-label="Section status: completed/generating/locked"`
- Generate button: `aria-busy="true"` when generating

**Keyboard Navigation:**
- Tab order: Author → Category → Generate → Section cards
- Enter key triggers generate button
- Arrow keys navigate section grid

**Screen Reader Announcements:**
```tsx
// Use aria-live for progress updates
<div aria-live="polite" aria-atomic="true" className="sr-only">
  {currentSectionId && `Now generating ${currentSectionId} section`}
</div>
```

**Testing Checklist:**
- [ ] Tab navigation works logically
- [ ] Screen reader announces progress
- [ ] All interactive elements have labels

---

## Post-Phase Checklist

### After Phase 1:
- [ ] All 4 component files created
- [ ] Components compile without errors
- [ ] Props interfaces match plan
- [ ] shadcn/ui components imported correctly
- [ ] Git commit with message: "feat(vixra): Create new hero-centered UI components"

### After Phase 2:
- [ ] useVixraPaper hook created
- [ ] vixraUtils.ts updated with new functions
- [ ] State structure simplified
- [ ] No breaking changes to existing utils
- [ ] Git commit with message: "refactor(vixra): Simplify state management for single-model workflow"

### After Phase 3:
- [ ] vixra.tsx refactored with new layout
- [ ] Old UI code removed
- [ ] Page renders correctly
- [ ] All props connected
- [ ] Mobile responsive tested
- [ ] Git commit with message: "feat(vixra): Implement hero-centered single-column layout"

### After Phase 4:
- [ ] Smart defaults working
- [ ] Smooth scroll implemented
- [ ] Loading animations polished
- [ ] Completion celebration works
- [ ] Error handling robust
- [ ] Accessibility features added
- [ ] Git commit with message: "feat(vixra): Add UX enhancements - animations, defaults, visual feedback"

---

## Ready for User Testing (Phase 5)

Once all 4 phases are complete and committed, the user will:
1. Test basic flow: Load page → Generate paper → Export
2. Test manual mode: Generate individual sections
3. Test auto mode: Full paper generation
4. Test edge cases: Random category, failed sections, multi-model manual
5. Test mobile responsiveness
6. Provide feedback for refinements

---

## Notes & Considerations

### Performance Optimizations
- Lazy load ResponseCard content when section is large
- Virtualize section grid if >20 sections (future enhancement)
- Debounce author/title inputs

### Future Enhancements (Post-MVP)
- Save paper drafts to database
- Resume interrupted generation
- Compare papers from different models
- Custom section templates
- Social sharing of papers

### Known Limitations
- Export PDF requires browser print dialog (no server-side PDF generation)
- Large papers (>10k words) may impact browser performance
- Section regeneration doesn't preserve failed section content for comparison

---

## Questions for User (If Any)

1. **Model Picker UI:** Should we reuse Compare page's floating model picker, or create a simpler inline dropdown?
2. **Random Category Behavior:** Should random button cycle through categories or jump to truly random one each time?
3. **Export Footer Position:** Fixed bottom bar or floating card that scrolls?

---

**Ready to begin implementation!** 🚀
