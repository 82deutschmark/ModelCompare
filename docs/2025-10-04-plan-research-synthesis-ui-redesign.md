# Research Synthesis UI Redesign Plan
**Applying Vixra UI/UX Improvements to Luigi Business Plan Workspace**

**Date:** 2025-10-04  
**Status:** Planning  
**Scope:** Migrate hero-centered, user-friendly patterns from Vixra to Research Synthesis page

---

## Executive Summary

The Vixra page redesign delivered significant UX improvements:
- **3 clicks to generate** (down from 8+)
- **Hero-centered single-column layout** (was 3-column sidebar)
- **Visual progress tracking** with section badges
- **Enhanced error recovery** with model swapping
- **Early export** after first section completion
- **Smart defaults** with localStorage persistence

**Goal:** Adapt these patterns to the Luigi Business Plan Workspace (Research Synthesis page) while preserving the multi-agent orchestration workflow.

---

## Current State Analysis

### Existing Layout (3-Column Grid)
```
┌─────────────┬─────────────┬─────────────┐
│  LEFT COL   │  MIDDLE COL │  RIGHT COL  │
├─────────────┼─────────────┼─────────────┤
│ RunForm     │ Timeline    │ Messages    │
│ Controls    │ Status      │ Artifacts   │
│ Reply       │             │             │
└─────────────┴─────────────┴─────────────┘
```

### Current Components
- `LuigiRunForm` - Business idea, industry, goal inputs
- `LuigiRunControls` - Pause/Resume/Cancel/Refresh
- `LuigiStageTimeline` - Visual stage progress
- `LuigiConversationLog` - Agent messages
- `LuigiArtifactPanel` - Generated artifacts
- `CardReply` - User reply input
- `StatusCard` - Run status summary

### Pain Points (Identified from Vixra Experience)
1. **No default values** - User must fill everything manually
2. **3-column layout** - Requires horizontal scrolling on smaller screens
3. **No visual feedback** - Timeline is good but could be enhanced
4. **No early export** - Can't export partial results
5. **No error recovery guidance** - If agent fails, unclear what to do
6. **No model selection** - Uses backend defaults, can't swap models
7. **Busy UI** - Too much information at once

---

## Proposed New Design

### Phase 1: Hero-Centered Single Column Layout

**Inspired by:** Vixra's `PaperSetupCard`

#### New Component: `LuigiWorkspaceSetupCard`
**Location:** `client/src/components/luigi/LuigiWorkspaceSetupCard.tsx`

**Features:**
- **Hero positioning** - Top of page, max-w-4xl centered
- **Smart defaults:**
  - Business Idea: "AI-powered productivity tools"
  - Industry: "Technology - SaaS"
  - Goal: "comprehensive business plan"
- **Inline model selection** - FloatingModelPicker for agent model
- **Mode toggle:** Simple/Advanced (collapsible advanced options)
- **Single CTA:** "🚀 Launch Luigi Pipeline"

**Layout:**
```tsx
<Card className="border-2 border-primary/20 shadow-lg">
  <CardHeader>
    <CardTitle>Launch Luigi Business Plan Generator</CardTitle>
  </CardHeader>
  <CardContent className="space-y-6">
    {/* Business Idea - Required */}
    <Input label="Business Idea *" defaultValue="..." />
    
    {/* Industry - Required with Random */}
    <Select label="Industry *">...</Select>
    <Button variant="outline">🎲 Random Industry</Button>
    
    {/* Advanced Settings (Collapsible) */}
    <Collapsible>
      <Input label="Goal (Optional)" />
      <ModelPicker label="Agent Model" />
    </Collapsible>
    
    {/* Primary CTA */}
    <Button size="lg" onClick={handleLaunch}>
      🚀 Launch Luigi Pipeline
    </Button>
  </CardContent>
</Card>
```

---

### Phase 2: Enhanced Stage Progress Tracker

**Inspired by:** Vixra's `SectionProgressTracker`

#### Enhanced Component: `LuigiStageProgressTracker`
**Location:** `client/src/components/luigi/LuigiStageProgressTracker.tsx`

**Features:**
- **Visual stage badges** (not just timeline items)
- **Click-to-scroll** to stage artifacts
- **Status icons:**
  - ○ Pending (gray)
  - ⏳ Running (blue, animated)
  - ✓ Complete (green)
  - ✗ Failed (red)
  - 🔒 Locked/Waiting (gray, disabled)
- **Progress bar** with percentage
- **Estimated time** based on average stage duration
- **Compact horizontal grid** on mobile

**Layout:**
```
┌────┬────┬────┬────┬────┬────┬────┬────┐
│ ✓  │ ✓  │ ⏳ │ ○  │ 🔒 │ 🔒 │ 🔒 │ 🔒 │
│Idea│Plan│Exec│Mkto│Tech│Fin│Risk│Sum │
└────┴────┴────┴────┴────┴────┴────┴────┘
Progress: ████████░░░░░░░░░░░░  37%  Est: 4 min
```

---

### Phase 3: Streaming Results Display

**Inspired by:** Vixra's `SectionResultsStream`

#### New Component: `LuigiArtifactStream`
**Location:** `client/src/components/luigi/LuigiArtifactStream.tsx`

**Features:**
- **Empty state** - Placeholder grid before generation starts
- **Skeleton loaders** - Show during artifact generation
- **Per-artifact cards** - Expandable with copy/export
- **Auto-scroll** - To newly completed artifacts
- **Failed artifact cards** - With retry and guidance

**States:**
1. **Empty:** Grid of artifact placeholders
2. **Generating:** Skeleton card with stage name
3. **Complete:** Full artifact card with content
4. **Failed:** Error card with "Retry" button

---

### Phase 4: Export Footer

**Inspired by:** Vixra's `PaperExportFooter`

#### New Component: `LuigiExportFooter`
**Location:** `client/src/components/luigi/LuigiExportFooter.tsx`

**Features:**
- **Fixed bottom position** - Appears after first artifact
- **Draft mode** - After 3 artifacts: "Draft Available"
- **Complete mode** - After all artifacts: "Plan Complete! 🎉"
- **Export options:**
  - Download PDF (formatted business plan)
  - Copy Markdown
  - Print
- **Statistics:**
  - X/Y artifacts completed
  - ~Z,ZZZ words
  - YY min generation time

**Visibility Rules:**
- Hidden until first artifact completes
- Shows "Draft Available" after 3+ artifacts
- Shows celebration + full export after all complete

---

### Phase 5: Error Recovery UX

**Inspired by:** Vixra error handling improvements

#### Enhanced Error Handling

**Agent Failure Toast:**
```tsx
toast({
  title: 'Agent Failed: Market Analysis',
  description: 'Agent timed out. Retrying with Claude 4...',
  variant: 'destructive',
  action: (
    <ToastAction onClick={handleStopRun}>
      Stop Pipeline
    </ToastAction>
  )
});
```

**Failed Artifact Card:**
```tsx
<Card className="border-2 border-destructive">
  <CardHeader>
    <CardTitle>❌ Market Analysis Failed</CardTitle>
  </CardHeader>
  <CardContent>
    <Alert variant="warning">
      💡 Tip: Try changing the agent model or simplifying the business idea.
    </Alert>
    <Button onClick={handleRetry}>Retry Stage</Button>
    <Button onClick={handleSkip} variant="outline">Skip & Continue</Button>
  </CardContent>
</Card>
```

---

### Phase 6: Smart Defaults & Persistence

**Inspired by:** Vixra localStorage patterns

#### localStorage Keys
```typescript
'luigi-last-business-idea'
'luigi-last-industry'
'luigi-last-agent-model'
'luigi-preference-mode' // simple | advanced
```

#### Default Values
```typescript
const DEFAULTS = {
  businessIdea: 'AI-powered productivity tools',
  industry: 'Technology - SaaS',
  goal: 'comprehensive business plan',
  agentModel: 'claude-sonnet-4-20250514', // Smart default
  mode: 'simple'
};
```

---

## Implementation Phases

### Phase 1: Component Creation (Week 1)
**Priority: High**

- [ ] Create `LuigiWorkspaceSetupCard` (hero card)
- [ ] Create `LuigiStageProgressTracker` (visual badges)
- [ ] Create `LuigiArtifactStream` (streaming display)
- [ ] Create `LuigiExportFooter` (export controls)

**Acceptance Criteria:**
- All components use shadcn/ui exclusively
- Pass SRP/DRY checks
- Fully typed with TypeScript
- Mobile-responsive

---

### Phase 2: State Management (Week 1)
**Priority: High**

- [ ] Create `useL

uigiWorkspace` hook (similar to `useVixraPaper`)
- [ ] Implement localStorage persistence
- [ ] Add smart defaults
- [ ] Centralize run state management

**Hook Structure:**
```typescript
export function useLuigiWorkspace() {
  const [config, setConfig] = useState({
    businessIdea: getStoredOrDefault('businessIdea'),
    industry: getStoredOrDefault('industry'),
    agentModel: getStoredOrDefault('agentModel'),
  });
  
  const [stages, setStages] = useState<Stage[]>([]);
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // ... similar to useVixraPaper pattern
}
```

---

### Phase 3: Page Layout Rebuild (Week 2)
**Priority: High**

**Old Layout:** 3-column grid (`xl:grid-cols-3`)

**New Layout:** Single-column centered (`max-w-5xl mx-auto`)

```tsx
<div className="max-w-5xl mx-auto px-4 py-6">
  <div className="space-y-6">
    {/* Hero Setup Card */}
    <LuigiWorkspaceSetupCard {...} />
    
    {/* Progress Tracker (conditional) */}
    {isGenerating && <LuigiStageProgressTracker {...} />}
    
    {/* Artifact Stream */}
    <LuigiArtifactStream {...} />
    
    {/* Conversation Log (sidebar → inline) */}
    {messages.length > 0 && <LuigiConversationLog {...} />}
  </div>
</div>

{/* Export Footer (fixed bottom) */}
{showExportFooter && <LuigiExportFooter {...} />}
```

**Responsive Breakpoints:**
- Mobile (< 640px): Full single column
- Tablet (640px - 1024px): Single column, wider cards
- Desktop (> 1024px): Single column, max-w-5xl

---

### Phase 4: UX Enhancements (Week 2)
**Priority: Medium**

- [ ] Add FloatingModelPicker for agent model selection
- [ ] Implement error recovery with helpful tips
- [ ] Add "Stop Pipeline" toast action for failures
- [ ] Implement auto-scroll to new artifacts
- [ ] Add accessibility (aria-live, screen reader support)

---

### Phase 5: Testing & Refinement (Week 3)
**Priority: Medium**

- [ ] User testing with 3-5 users
- [ ] Fix edge cases (empty states, error states)
- [ ] Performance optimization (large artifact lists)
- [ ] Mobile testing on real devices
- [ ] Accessibility audit

---

## Key Differences from Vixra

### Vixra Pattern
- **Sequential generation** (section by section)
- **Single model** for all sections
- **Template-driven** with variable substitution
- **Linear dependency** chain (intro → methods → results)

### Luigi Pattern
- **Parallel generation** (multiple agents at once)
- **Per-stage models** (different models for different stages)
- **Agent-driven** with orchestrator coordination
- **Stage dependencies** (some parallel, some sequential)

### Adaptations Needed

1. **Progress Tracker:**
   - Vixra: Linear 8-section sequence
   - Luigi: Graph-based stage dependencies (show parallel stages side-by-side)

2. **Model Selection:**
   - Vixra: Single model for all
   - Luigi: Per-stage model selection (advanced mode only)

3. **Error Recovery:**
   - Vixra: Regenerate single section
   - Luigi: Retry stage or skip & continue

4. **Export:**
   - Vixra: Markdown paper
   - Luigi: PDF business plan + individual artifacts

---

## Success Metrics

### Quantitative
- **Reduction in clicks:** 10+ → 3-4 to launch pipeline
- **Time to first artifact:** < 30 seconds (vs 1+ min)
- **Mobile usability:** 90%+ task completion on phone
- **Error recovery:** 80%+ users successfully retry failed stages

### Qualitative
- Users describe UI as "clean", "intuitive", "modern"
- No confusion about next steps
- Reduced support questions about "how to use"

---

## Migration Strategy

### Option A: Gradual Migration (Recommended)
1. Create new components alongside old
2. Add feature flag: `ENABLE_NEW_LUIGI_UI`
3. Test with subset of users
4. Migrate 100% after validation
5. Remove old components

### Option B: Big Bang Migration
1. Build all new components
2. Replace entire page in one PR
3. Higher risk, faster delivery

**Recommendation:** Option A for safety

---

## Files to Create

### New Components
```
client/src/components/luigi/
├── LuigiWorkspaceSetupCard.tsx      (hero card)
├── LuigiStageProgressTracker.tsx    (visual badges)
├── LuigiArtifactStream.tsx          (streaming display)
└── LuigiExportFooter.tsx            (export controls)
```

### New Hooks
```
client/src/hooks/
└── useLuigiWorkspace.ts             (state management)
```

### New Utils
```
client/src/lib/
└── luigiUtils.ts                    (localStorage, defaults, exports)
```

### Updated Files
```
client/src/pages/
└── research-synthesis.tsx           (complete rewrite)
```

---

## Timeline

- **Week 1 (Oct 5-11):** Phase 1-2 (Components + State)
- **Week 2 (Oct 12-18):** Phase 3-4 (Layout + UX)
- **Week 3 (Oct 19-25):** Phase 5 (Testing + Refinement)

**Total:** ~3 weeks for complete migration

---

## Open Questions

1. **Multi-model selection:** Should users pick models per-stage (advanced) or one for all (simple)?
2. **Parallel stages:** How to visualize stages that run simultaneously?
3. **Conversation log:** Keep as separate panel or inline with artifacts?
4. **Export format:** PDF with proper business plan formatting vs markdown?
5. **Agent visibility:** Show which agent is running each stage?

---

## Next Steps

1. **Review this plan** with team/stakeholders
2. **Prioritize open questions** - make decisions
3. **Start Phase 1** - Create first component (`LuigiWorkspaceSetupCard`)
4. **Set up feature flag** for gradual rollout
5. **Create tracking issue** for progress monitoring

---

## References

- **Vixra redesign PR:** `features` branch commits from Oct 4
- **Current Research Synthesis:** `client/src/pages/research-synthesis.tsx`
- **Design inspiration:** Vixra hero-centered patterns
- **Component library:** shadcn/ui documentation

---

**Document Status:** Draft  
**Last Updated:** 2025-10-04  
**Author:** Cascade using Claude Sonnet 4  
**Review Required:** Yes - before starting implementation
