# Debate Mode Refactoring Task List

## Phase 1: Extract Custom Hooks (2-3 hours)

**Task 1.1: Create State Management Hook**
- Create new file `hooks/useDebateState.ts`
- Move all useState declarations from main component
- Add a `reset()` function that clears all state
- Export all state variables and setters as a single object
- Test that importing and using this hook works

**Task 1.2: Create Prompts Loading Hook**
- Create new file `hooks/useDebatePrompts.ts`
- Move debate data loading logic and useEffect
- Return `debateData`, `loading`, and `error` states
- Verify data loads correctly on component mount

**Task 1.3: Create Export Hook**
- Create new file `hooks/useDebateExport.ts`
- Extract `handleExportMarkdown` and `handleCopyToClipboard` functions
- Create shared `buildExportData` helper function
- Return `exportMarkdown` and `copyToClipboard` functions
- Test both export methods work

## Phase 2: Create Service Layer (2 hours)

**Task 2.1: Build Debate Service**
- Create new file `services/debateService.ts`
- Create `DebateService` class with constructor accepting `debateData` and `models`
- Move `generatePrompts` method (formerly `generateDebatePrompts`)
- Add `buildRebuttalPrompt` method
- Add `getNextDebater` method
- Add `calculateTotalCost` method
- Initialize service in main component using `useMemo`

## Phase 3: Extract UI Components (4-5 hours)

**Task 3.1: Topic Selector Component**
- Create `components/debate/DebateTopicSelector.tsx`
- Extract topic selection UI (preset/custom toggle, dropdown, textarea)
- Break into smaller sub-components: `TopicModeToggle`, `PresetTopicSelect`, `CustomTopicInput`, `CurrentTopicDisplay`
- Pass props from parent, keep it presentational

**Task 3.2: Model Selector Component**
- Create `components/debate/ModelSelector.tsx`
- Extract model selection and configuration UI
- Include both the Select dropdown and ModelConfigurationPanel
- Create one component per debater (reusable)

**Task 3.3: Adversarial Level Component**
- Create `components/debate/AdversarialLevelSelector.tsx`
- Extract intensity selection radio buttons
- Break into `LevelOption` and `IntensityWarning` sub-components

**Task 3.4: Controls Component**
- Create `components/debate/DebateControls.tsx`
- Extract progress display and action buttons
- Break into smaller pieces: `DebateStats`, `ExportButton`, `CopyButton`, `ResetButton`, `ToggleSetupButton`, `StreamingIndicator`

**Task 3.5: Message List Component**
- Create `components/debate/DebateMessageList.tsx`
- Extract message rendering logic
- Include continue button at bottom

**Task 3.6: Setup Panel Component**
- Create `components/debate/DebateSetupPanel.tsx`
- Compose all setup sub-components into single panel
- Keep Card wrapper and grid layout

## Phase 4: Integration & Testing (2 hours)

**Task 4.1: Update Main Component**
- Replace extracted code with hook calls and component imports
- Verify all functionality works identically
- Remove unused imports and variables

**Task 4.2: Testing & Cleanup**
- Test complete debate flow end-to-end
- Verify exports work correctly
- Check streaming display
- Remove any console.logs or debug code
- Update component documentation

## Total Estimated Time: 10-12 hours