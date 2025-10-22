# Debate Page Split Architecture Plan

**Author:** Claude Code using Sonnet 4.5
**Date:** 2025-10-22
**Purpose:** Architectural plan to split the monolithic `/debate` page into two separate pages: Setup and Active Debate
**Status:** Planning Phase - Awaiting User Approval

---

## Executive Summary

The current debate page mixes setup UI and active debate UI in a single component, leading to complex conditional rendering and poor separation of concerns. This plan proposes splitting the page into two distinct routes:

1. **`/debate`** - Setup page for configuring new debates and viewing history
2. **`/debate/session/:sessionId`** - Active debate page for running and interacting with debates

### Key Benefits:
- ✅ Clear separation of concerns (setup vs. execution)
- ✅ Deep-linkable debate sessions via URL
- ✅ Cleaner component structure (no conditional rendering hacks)
- ✅ Better UX (focused interfaces for each task)
- ✅ Maintains ability to adjust configs mid-debate

---

## Current Architecture Problems

### Issues with Current `/debate` Page:
1. **Mixed Responsibilities:** Setup, streaming, message display, controls all in one component
2. **Conditional Rendering Hell:** Topic selector disappears with `{messages.length === 0}` checks
3. **No Deep Linking:** Can't share URL to specific debate session
4. **State Confusion:** Setup state vs. session state managed in same component
5. **Poor UX:** User has to scroll past setup UI to see debate messages

### Current Component Structure:
```typescript
// debate.tsx (809 lines)
- Topic selector (conditionally hidden)
- Model config (always visible if showSetup)
- Intensity selector (always visible if showSetup)
- System prompts preview
- History drawer
- Debate controls (conditionally shown)
- Streaming display (conditionally shown)
- Message list (conditionally shown)
```

**Problem:** Everything is entangled. Hard to reason about, hard to maintain.

---

## Proposed Architecture

### Page 1: `/debate` (Setup Page)

**Purpose:** Configure and start new debates, view historical debates

**Components:**
```typescript
DebateSetupPage
├── AppNavigation (header)
├── Card: Debate Topic
│   └── DebateTopicSelector (with Start Debate button)
├── Card: Model Configuration
│   └── ModelSelector (collapsible configs)
├── Card: Debate Intensity
│   └── AdversarialLevelSelector
└── DebateHistoryDrawer (sidebar with session list)
```

**State Hooks:**
- `useDebateSetup()` - Topic, models, configs, intensity
- `useDebatePrompts()` - Topic data, intensity descriptors
- `useQuery('/api/models')` - Available AI models
- `useQuery('/api/debate/sessions')` - Historical sessions

**User Actions:**
1. **Start New Debate:**
   - User configures topic, models, intensity
   - Clicks "Start Debate" button
   - API: `POST /api/debate/session` → returns `{ id, ... }`
   - Navigate to `/debate/session/:id`

2. **Load Historical Session:**
   - User clicks session in history drawer
   - Navigate to `/debate/session/:sessionId`

**What's NOT on this page:**
- ❌ Messages
- ❌ Streaming display
- ❌ Debate controls (continue, floor, export)
- ❌ Active debate state

---

### Page 2: `/debate/session/:sessionId` (Active Debate Page)

**Purpose:** Run and interact with an active debate session

**Components:**
```typescript
DebateActivePage
├── AppNavigation (header with debate topic)
├── Grid Layout (responsive)
│   ├── Left Column (25%):
│   │   ├── Card: Session Info
│   │   │   ├── Topic display
│   │   │   ├── Round/phase/cost
│   │   │   └── Jury summary
│   │   ├── Card: Controls
│   │   │   ├── Continue button
│   │   │   ├── Floor controls
│   │   │   ├── Phase advancement
│   │   │   └── Export/reset buttons
│   │   └── Collapsible: Settings
│   │       ├── ModelSelector (collapsed configs)
│   │       └── AdversarialLevelSelector
│   └── Right Column (75%):
│       ├── StreamingDisplay (if streaming)
│       └── DebateMessageList (all messages)
└── DebateHistoryDrawer (optional - see questions)
```

**State Hooks:**
- `useDebateSession()` - Session metadata, messages, jury, phase
- `useDebateStreaming()` - Active streaming state
- `useDebateSetup()` - Model configs for mid-debate adjustments
- `useParams()` from wouter - Get sessionId from URL

**Lifecycle:**
1. **On Mount:**
   ```typescript
   useEffect(() => {
     // Fetch session from API
     const session = await fetch(`/api/debate/session/${sessionId}`);

     // Hydrate session state
     debateSession.hydrateFromSession(session, modelLookup);

     // Populate setup state for config adjustments
     debateSetup.setModel1Id(session.model1Id);
     debateSetup.setModel2Id(session.model2Id);
     debateSetup.setAdversarialLevel(session.adversarialLevel);
     // ... populate model configs
   }, [sessionId]);
   ```

2. **Continue Debate:**
   - User clicks "Continue" button
   - Uses current values from `useDebateSetup()` (may have changed mid-debate)
   - API: `POST /api/debate/turn` with updated configs
   - Streams response to UI

3. **Adjust Configs Mid-Debate:**
   - User expands "Settings" panel
   - Modifies model configs or intensity
   - Changes saved in `useDebateSetup()` state
   - Next turn uses new configs

4. **Reset Debate:**
   - User clicks "Reset" button
   - Confirmation dialog: "Are you sure? This will end the debate."
   - On confirm:
     - Clear session state: `debateSession.resetSession()`
     - Navigate to `/debate`

**Error Handling:**
- Invalid sessionId → Show error + button to return to setup
- Session load failure → Show error + retry button
- Network errors → Toast notifications

---

## Navigation Flow Diagram

```mermaid
graph TD
    A[/debate - Setup Page] -->|Start Debate| B[POST /api/debate/session]
    B -->|Returns sessionId| C[/debate/session/:id - Active Page]
    A -->|Click historical session| C
    C -->|Reset button| A
    C -->|Browser back| A
    C -->|GET /api/debate/session/:id| D[Hydrate session data]
    D --> C
```

### Detailed Navigation Flows:

**Flow 1: Start New Debate**
```
User on /debate
  ↓
User configures: topic="AI Ethics", model1=GPT-5, model2=Claude 4.1, intensity=3
  ↓
User clicks "Start Debate"
  ↓
API: POST /api/debate/session {topic, model1Id, model2Id, adversarialLevel}
  ↓
API returns: {id: "debate-abc123", topic: "AI Ethics", ...}
  ↓
Navigate to: /debate/session/debate-abc123
  ↓
Active page mounts, fetches session, starts first turn
```

**Flow 2: Load Historical Session**
```
User on /debate
  ↓
User clicks "Session from 2025-10-20" in history drawer
  ↓
Navigate to: /debate/session/debate-xyz789
  ↓
Active page mounts, fetches session, displays messages
```

**Flow 3: Mid-Debate Config Change**
```
User on /debate/session/debate-abc123 (round 5/10)
  ↓
User expands "Settings" panel
  ↓
User changes Model 1 reasoning effort: medium → high
  ↓
User changes intensity: 3 → 4
  ↓
User clicks "Continue"
  ↓
API: POST /api/debate/turn with updated configs
  ↓
Round 6 uses new configs, previous rounds unchanged
```

**Flow 4: Reset and Return**
```
User on /debate/session/debate-abc123 (round 7/10)
  ↓
User clicks "Reset" button
  ↓
Confirmation dialog: "End this debate?"
  ↓
User confirms
  ↓
Clear session state
  ↓
Navigate to: /debate
  ↓
User can start new debate or load another session
```

---

## State Management Strategy

### Hook 1: `useDebateSetup()`

**Current State:**
```typescript
{
  // Topic
  selectedTopic: string;
  customTopic: string;
  useCustomTopic: boolean;

  // Models
  model1Id: string;
  model2Id: string;

  // Configs
  model1Config: ModelConfiguration;
  model2Config: ModelConfiguration;

  // Intensity
  adversarialLevel: number;

  // UI
  showSetup: boolean;
  showSystemPrompts: boolean;
}
```

**Usage:**
- ✅ Setup page: Initial configuration
- ✅ Active page: Mid-debate adjustments
- ✅ Persisted across navigation (React context or Zustand)

**No changes needed** - works perfectly for both pages!

---

### Hook 2: `useDebateSession()`

**Current State:**
```typescript
{
  debateSessionId: string | null;
  messages: DebateMessage[];
  turnHistory: Turn[];
  currentRound: number;
  phase: DebatePhase;
  floorOpen: boolean;
  jurySummary: JurySummary | null;
  // ... metadata
}
```

**New Methods Needed:**
```typescript
interface DebateSessionHook {
  // ... existing methods

  // NEW: Hydrate from session ID
  loadSessionFromId: (sessionId: string) => Promise<void>;

  // NEW: Get session loading state
  isLoadingSession: boolean;
  sessionLoadError: string | null;
}
```

**Implementation:**
```typescript
export function useDebateSession() {
  // ... existing state
  const [isLoadingSession, setIsLoadingSession] = useState(false);
  const [sessionLoadError, setSessionLoadError] = useState<string | null>(null);

  const loadSessionFromId = async (sessionId: string) => {
    setIsLoadingSession(true);
    setSessionLoadError(null);

    try {
      const response = await fetch(`/api/debate/session/${sessionId}`);
      if (!response.ok) throw new Error('Failed to load session');

      const session = await response.json();

      // Hydrate state
      hydrateFromSession(session, modelLookup);
      setDebateSessionId(sessionId);
    } catch (error) {
      setSessionLoadError(error.message);
    } finally {
      setIsLoadingSession(false);
    }
  };

  return {
    // ... existing returns
    loadSessionFromId,
    isLoadingSession,
    sessionLoadError,
  };
}
```

**Usage:**
- ❌ Setup page: Not used
- ✅ Active page: Load session on mount, manage active debate

---

### Hook 3: `useDebateStreaming()`

**Current State:**
```typescript
{
  isStreaming: boolean;
  content: string;
  reasoning: string;
  responseId: string | null;
  tokenUsage: TokenUsage;
  cost: number;
  // ...
}
```

**Changes:** None needed! Works perfectly for active page.

**Usage:**
- ❌ Setup page: Not used
- ✅ Active page: Stream responses during debate

---

## Routing Implementation

### Current Router: Wouter

**Current routes in `App.tsx`:**
```typescript
<Route path="/" component={Compare} />
<Route path="/battle" component={Battle} />
<Route path="/debate" component={Debate} />
<Route path="/creative" component={Creative} />
<Route path="/vixra" component={Vixra} />
<Route path="/research" component={Research} />
```

### New Routes:

```typescript
import DebateSetup from './pages/debate-setup';
import DebateActive from './pages/debate-active';

// In App.tsx:
<Route path="/debate" component={DebateSetup} />
<Route path="/debate/session/:sessionId" component={DebateActive} />
```

### Navigation Helpers:

```typescript
// In components
import { useLocation } from 'wouter';

function DebateTopicSelector() {
  const [, navigate] = useLocation();

  const handleStartDebate = async () => {
    const session = await createSession(...);
    navigate(`/debate/session/${session.id}`);
  };

  // ...
}
```

```typescript
// In DebateControls
function DebateControls() {
  const [, navigate] = useLocation();

  const handleReset = () => {
    if (confirm('End this debate?')) {
      debateSession.resetSession();
      navigate('/debate');
    }
  };

  // ...
}
```

---

## Component Structure Changes

### New Files to Create:

#### 1. `/client/src/pages/debate-setup.tsx`
**Purpose:** Setup page for configuring debates
**Source:** Refactored from current `debate.tsx`
**Components used:**
- DebateTopicSelector
- ModelSelector
- AdversarialLevelSelector
- DebateHistoryDrawer

**Rough structure:**
```typescript
export default function DebateSetup() {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  // Only setup-related hooks
  const debateSetup = useDebateSetup();
  const { debateData } = useDebatePrompts();
  const { data: models = [] } = useQuery('/api/models');
  const { data: sessions = [], refetch } = useQuery('/api/debate/sessions');

  const handleStartDebate = async () => {
    try {
      const session = await apiRequest('POST', '/api/debate/session', {
        topic: debateSetup.useCustomTopic ? debateSetup.customTopic : /* get from debateData */,
        model1Id: debateSetup.model1Id,
        model2Id: debateSetup.model2Id,
        adversarialLevel: debateSetup.adversarialLevel,
      });

      navigate(`/debate/session/${session.id}`);
    } catch (error) {
      toast({ title: 'Failed to start debate', variant: 'destructive' });
    }
  };

  const handleLoadSession = (sessionId: string) => {
    navigate(`/debate/session/${sessionId}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <AppNavigation title="Debate Setup" icon={MessageSquare} />

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Left: Setup UI (3 columns) */}
          <div className="lg:col-span-3 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Debate Topic</CardTitle>
              </CardHeader>
              <CardContent>
                <DebateTopicSelector
                  onStartDebate={handleStartDebate}
                  disabled={/* validation logic */}
                />
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader><CardTitle>Model Configuration</CardTitle></CardHeader>
                <CardContent><ModelSelector /></CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Debate Intensity</CardTitle></CardHeader>
                <CardContent><AdversarialLevelSelector /></CardContent>
              </Card>
            </div>
          </div>

          {/* Right: History (1 column) */}
          <div className="lg:col-span-1">
            <DebateHistoryDrawer
              sessions={sessions}
              onSelectSession={handleLoadSession}
              onRefresh={refetch}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

#### 2. `/client/src/pages/debate-active.tsx`
**Purpose:** Active debate page for running debates
**Source:** New file, using components from current `debate.tsx`
**Components used:**
- DebateMessageList
- StreamingDisplay
- DebateControls
- DebateConfigSidebar (NEW)

**Rough structure:**
```typescript
import { useParams } from 'wouter';

export default function DebateActive() {
  const params = useParams<{ sessionId: string }>();
  const sessionId = params.sessionId;
  const [, navigate] = useLocation();
  const { toast } = useToast();

  // Debate hooks
  const debateSession = useDebateSession();
  const debateStreaming = useDebateStreaming();
  const debateSetup = useDebateSetup(); // For mid-debate adjustments

  const { data: models = [] } = useQuery('/api/models');
  const debateService = useMemo(() => /* create service */, [...]);

  // Load session on mount
  useEffect(() => {
    if (!sessionId) {
      navigate('/debate');
      return;
    }

    debateSession.loadSessionFromId(sessionId);
  }, [sessionId]);

  // Hydrate setup state when session loads
  useEffect(() => {
    if (debateSession.sessionMetadata) {
      debateSetup.setModel1Id(debateSession.sessionMetadata.model1Id);
      // ... populate all configs
    }
  }, [debateSession.sessionMetadata]);

  const handleContinueDebate = async () => {
    // Continue debate logic (same as before)
    // Uses current debateSetup values (may have changed)
  };

  const handleReset = () => {
    if (confirm('End this debate?')) {
      debateSession.resetSession();
      navigate('/debate');
    }
  };

  // Loading state
  if (debateSession.isLoadingSession) {
    return <div>Loading debate session...</div>;
  }

  // Error state
  if (debateSession.sessionLoadError) {
    return (
      <div>
        <p>Failed to load session: {debateSession.sessionLoadError}</p>
        <Button onClick={() => navigate('/debate')}>Return to Setup</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <AppNavigation
        title={`Debate: ${debateSession.sessionMetadata?.topic || 'Loading...'}`}
        icon={MessageSquare}
      />

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
          {/* Left Sidebar: Controls + Settings (1 column) */}
          <div className="xl:col-span-1 space-y-4">
            <Card>
              <CardHeader><CardTitle>Session Info</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div>Round: {debateSession.currentRound}</div>
                  <div>Phase: {debateSession.phase}</div>
                  <div>Cost: ${debateSession.calculateTotalCost()}</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Controls</CardTitle></CardHeader>
              <CardContent>
                <DebateControls
                  onContinue={handleContinueDebate}
                  onReset={handleReset}
                  // ... other props
                />
              </CardContent>
            </Card>

            {/* NEW: Collapsible settings panel */}
            <DebateConfigSidebar />
          </div>

          {/* Right: Messages + Streaming (3 columns) */}
          <div className="xl:col-span-3 space-y-4">
            {debateStreaming.isStreaming && (
              <StreamingDisplay {...debateStreaming} />
            )}

            <DebateMessageList
              messages={debateSession.messages}
              models={models}
              onContinue={handleContinueDebate}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

#### 3. `/client/src/components/debate/DebateConfigSidebar.tsx`
**Purpose:** Collapsible sidebar for adjusting configs mid-debate
**Source:** New component

**Structure:**
```typescript
import { useState } from 'react';
import { ChevronDown, ChevronUp, Settings } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ModelSelector } from './ModelSelector';
import { AdversarialLevelSelector } from './AdversarialLevelSelector';

export function DebateConfigSidebar() {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2 text-sm">
            <Settings className="w-4 h-4" />
            <span>Settings</span>
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className="h-6 w-6 p-0"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="pt-2">
          <div className="space-y-4">
            <div>
              <h4 className="text-xs font-semibold mb-2">Model Configuration</h4>
              <ModelSelector />
            </div>

            <div>
              <h4 className="text-xs font-semibold mb-2">Debate Intensity</h4>
              <AdversarialLevelSelector />
            </div>

            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground">
                Changes will apply to the next turn.
              </p>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
```

---

### Components to Modify:

#### DebateHistoryDrawer
**Change:** Add click handler to navigate to session

```typescript
// BEFORE
<div onClick={() => onSelectSession(session)}>

// AFTER
import { useLocation } from 'wouter';

function DebateHistoryDrawer({ sessions }) {
  const [, navigate] = useLocation();

  const handleSelectSession = (sessionId: string) => {
    navigate(`/debate/session/${sessionId}`);
  };

  // ...
}
```

#### DebateControls
**Change:** Add reset handler that navigates back

```typescript
// Add prop
interface DebateControlsProps {
  // ... existing
  onReset: () => void; // Navigates back to setup
}

// In component
<Button onClick={onReset}>Reset Debate</Button>
```

#### DebateTopicSelector
**Already has `onStartDebate` prop** - just wire it up to navigation!

---

## API Integration

### Existing Endpoints Used:

1. **POST /api/debate/session**
   - Creates new debate session
   - Returns: `{ id, topic, model1Id, model2Id, adversarialLevel }`
   - Called from: Setup page (Start Debate button)

2. **GET /api/debate/sessions**
   - Lists all historical sessions
   - Returns: `DebateSessionSummary[]`
   - Called from: Setup page (history drawer)

3. **GET /api/debate/session/:sessionId**
   - Fetches full session details
   - Returns: `DebateSessionHydration` (messages, metadata, jury, etc.)
   - Called from: Active page (on mount)

4. **POST /api/debate/turn**
   - Continues debate with next turn
   - Body: `{ sessionId, modelId, role, intensityLevel, configs, ... }`
   - Called from: Active page (Continue button)

### No new endpoints needed! ✅

---

## Layout Design

### Setup Page Layout (Desktop):

```
┌─────────────────────────────────────────────────────────────┐
│  Debate Setup                                        [User] │
├─────────────────────────────────────────────────────────────┤
│  ┌────────────────────────────────┐  ┌─────────────────┐   │
│  │ Debate Topic                   │  │ History         │   │
│  │ ○ Select from presets          │  │ ┌─────────────┐ │   │
│  │   [Dropdown: AI Ethics...]     │  │ │ 2025-10-20  │ │   │
│  │ ○ Custom topic                 │  │ │ GPT-5 vs... │ │   │
│  │                                │  │ └─────────────┘ │   │
│  │ Current Topic:                 │  │ ┌─────────────┐ │   │
│  │ "AI should regulate itself..." │  │ │ 2025-10-19  │ │   │
│  │                                │  │ │ Claude vs...│ │   │
│  │         [Start Debate]         │  │ └─────────────┘ │   │
│  └────────────────────────────────┘  │ ┌─────────────┐ │   │
│                                      │ │ 2025-10-18  │ │   │
│  ┌────────────────┐ ┌──────────────┐│ │ Gemini vs...│ │   │
│  │ Model Config   │ │ Intensity    ││ └─────────────┘ │   │
│  │                │ │              ││       [↻]       │   │
│  │ Affirmative:   │ │ ○ Respectful││                 │   │
│  │ [GPT-5 Nano]   │ │ ○ Assertive ││                 │   │
│  │ [Collapsed ▼]  │ │ ● Aggressive││                 │   │
│  │                │ │ ○ Combative ││                 │   │
│  │ Negative:      │ │              ││                 │   │
│  │ [Claude 4.1]   │ │ ⚠️ Higher...││                 │   │
│  │ [Collapsed ▼]  │ │              ││                 │   │
│  └────────────────┘ └──────────────┘│                 │   │
│                                      └─────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Active Page Layout (Desktop):

```
┌─────────────────────────────────────────────────────────────┐
│  Active Debate: "AI should regulate itself..."      [User] │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌────────────────────────────────────┐   │
│  │ Session     │  │ Messages                           │   │
│  │ Round: 5/10 │  │ ┌────────────────────────────────┐ │   │
│  │ Phase: Reb. │  │ │ 🟢 GPT-5 Nano (Affirmative)    │ │   │
│  │ Cost: $0.42 │  │ │ I argue that AI regulation...  │ │   │
│  │             │  │ │ [Reasoning: ▼] [Copy] [Export] │ │   │
│  ├─────────────┤  │ └────────────────────────────────┘ │   │
│  │ Controls    │  │                                    │   │
│  │ [Continue]  │  │ ┌────────────────────────────────┐ │   │
│  │ [Export MD] │  │ │ 🔵 Claude 4.1 (Negative)       │ │   │
│  │ [Copy]      │  │ │ However, self-regulation...    │ │   │
│  │ [Reset]     │  │ │ [Reasoning: ▼] [Copy] [Export] │ │   │
│  ├─────────────┤  │ └────────────────────────────────┘ │   │
│  │ Settings ▼  │  │                                    │   │
│  │ [Collapsed] │  │ ┌────────────────────────────────┐ │   │
│  │             │  │ │ 🟢 GPT-5 Nano (Affirmative)    │ │   │
│  └─────────────┘  │ │ That's a fair point, but...    │ │   │
│                   │ │ [Streaming... 47%]              │ │   │
│                   │ └────────────────────────────────┘ │   │
│                   └────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Mobile Layout (Both Pages):
- Stack vertically
- History drawer becomes bottom sheet
- Settings panel in active page collapsed by default
- Topic selector uses full width
- Messages list becomes primary focus

---

## Implementation Phases

### Phase 1: Documentation ✅ (CURRENT)
- [x] Write comprehensive plan
- [ ] Review with user
- [ ] Get approval to proceed

### Phase 2: Routing Foundation (30 min)
1. Create stub files:
   - `/pages/debate-setup.tsx` (copy from debate.tsx)
   - `/pages/debate-active.tsx` (new file, minimal structure)
2. Update `App.tsx`:
   - Add new routes
   - Import new components
3. Test navigation:
   - Can access both routes
   - URL changes correctly

### Phase 3: Refactor Setup Page (45 min)
1. Remove active debate UI from `debate-setup.tsx`:
   - Delete message list rendering
   - Delete streaming display
   - Delete debate controls
   - Keep only setup components
2. Update `handleStartDebate`:
   - Add navigation after session creation
   - Test flow: setup → API → navigate
3. Update `DebateHistoryDrawer`:
   - Add click handler to navigate
   - Test loading historical session
4. Test setup page:
   - Can configure debate
   - Can start debate → navigates
   - Can click history → navigates

### Phase 4: Build Active Page (60 min)
1. Implement session hydration:
   - Add `loadSessionFromId` to `useDebateSession`
   - Call on mount with sessionId from URL
   - Handle loading/error states
2. Build layout:
   - Left sidebar: session info + controls
   - Right column: messages + streaming
3. Create `DebateConfigSidebar` component:
   - Collapsible panel
   - Contains ModelSelector + AdversarialLevelSelector
   - Shows "Changes apply to next turn" notice
4. Wire up interactions:
   - Continue debate
   - Reset → navigate back
   - Adjust configs mid-debate
5. Test active page:
   - Load from URL
   - Display messages correctly
   - Can continue debate
   - Can reset → returns to setup

### Phase 5: State Management Polish (30 min)
1. Ensure `useDebateSetup` persists across navigation
   - May need Zustand or Context if not already persisted
2. Test state flows:
   - Setup page → Active page: configs preserved
   - Active page → Setup page: configs retained
   - Adjust on active page → continue debate uses new values
3. Handle edge cases:
   - Invalid sessionId
   - Network errors
   - Browser refresh on active page

### Phase 6: UI/UX Polish (30 min)
1. Responsive layouts:
   - Mobile: stack vertically, collapse sidebars
   - Tablet: 2-column layout
   - Desktop: optimal widths
2. Loading states:
   - Skeleton screens
   - Spinners for API calls
3. Error states:
   - User-friendly messages
   - Retry buttons
4. Transitions:
   - Smooth page transitions
   - Fade in/out

### Phase 7: Testing (30 min)
1. **Functional tests:**
   - Start new debate → navigates → loads → continues → resets
   - Load historical session → displays messages correctly
   - Adjust config mid-debate → next turn uses new config
   - Browser back button works
   - Browser refresh on active page re-hydrates

2. **Edge cases:**
   - Invalid session ID
   - Network failures
   - Concurrent sessions in multiple tabs
   - Interrupted streaming

3. **Responsive:**
   - Mobile layout
   - Tablet layout
   - Desktop layout
   - Dark mode

### Phase 8: Git Commit (10 min)
```bash
git add -A
git commit -m "Refactor: Split debate page into setup and active pages

BREAKING CHANGE: Debate UI now split into two routes:
- /debate - Setup page (configure debates, view history)
- /debate/session/:sessionId - Active debate page

Changes:
- Created debate-setup.tsx (refactored from debate.tsx)
- Created debate-active.tsx (new active debate page)
- Created DebateConfigSidebar component (collapsible mid-debate settings)
- Updated routing in App.tsx
- Added loadSessionFromId to useDebateSession hook
- Updated DebateHistoryDrawer to navigate on click
- Improved separation of concerns (setup vs. execution)
- Added deep-linking support for debate sessions

Benefits:
- Cleaner code structure
- Better UX (focused interfaces)
- Deep-linkable debate sessions
- Easier to maintain and extend"
```

---

## Edge Cases & Error Handling

### Edge Case 1: Invalid Session ID
**Scenario:** User navigates to `/debate/session/invalid-id`

**Handling:**
```typescript
useEffect(() => {
  debateSession.loadSessionFromId(sessionId)
    .catch(error => {
      toast({
        title: 'Session Not Found',
        description: 'This debate session does not exist.',
        variant: 'destructive',
      });
      setTimeout(() => navigate('/debate'), 2000);
    });
}, [sessionId]);
```

### Edge Case 2: Session Already Completed
**Scenario:** User loads a debate that reached round 10

**Handling:**
- Display all messages (read-only)
- Show jury verdict if available
- Disable "Continue" button
- Show "Debate Completed" badge
- Allow export/copy

**Question for user:** Should completed debates be continuable?

### Edge Case 3: Mid-Debate Config Changes
**Scenario:** User changes model config during active debate

**Handling:**
- Show visual indicator: "Settings changed. Next turn will use updated configs."
- Store changes in `useDebateSetup` state
- Next API call includes updated configs
- Previous messages display their original configs
- Option: Show config diff in message metadata?

### Edge Case 4: Browser Refresh on Active Page
**Scenario:** User on `/debate/session/abc123`, refreshes browser

**Handling:**
```typescript
useEffect(() => {
  // On mount, always re-fetch session
  debateSession.loadSessionFromId(sessionId);
}, [sessionId]);

// This re-hydrates:
// - All messages
// - Session metadata
// - Jury state
// - Current round/phase

// Then populate debateSetup for potential adjustments
useEffect(() => {
  if (debateSession.sessionMetadata) {
    debateSetup.setModel1Id(debateSession.sessionMetadata.model1Id);
    // ... etc
  }
}, [debateSession.sessionMetadata]);
```

### Edge Case 5: Network Failure During Session Load
**Scenario:** API request to load session fails

**Handling:**
```typescript
if (debateSession.sessionLoadError) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Card className="p-6 max-w-md">
        <CardHeader>
          <CardTitle>Failed to Load Debate</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {debateSession.sessionLoadError}
          </p>
          <div className="flex gap-2">
            <Button onClick={() => debateSession.loadSessionFromId(sessionId)}>
              Retry
            </Button>
            <Button variant="outline" onClick={() => navigate('/debate')}>
              Return to Setup
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

### Edge Case 6: Concurrent Sessions in Multiple Tabs
**Scenario:** User opens two debate sessions in different tabs

**Handling:**
- Each tab maintains independent state (sessionId from URL)
- No state conflicts (each session has unique ID)
- Both can stream simultaneously
- Each has own `useDebateSession` instance
- Works out of the box! ✅

### Edge Case 7: User Clicks Back Button
**Scenario:** User on active page, clicks browser back

**Handling:**
- Browser navigates to previous URL (likely `/debate`)
- React cleans up active page component
- Setup page renders
- User can start new debate or load another session
- No special handling needed! ✅

### Edge Case 8: Streaming Interrupted During Navigation
**Scenario:** User starts turn, streaming begins, then navigates away

**Handling:**
```typescript
// In debate-active.tsx
useEffect(() => {
  return () => {
    // Cleanup: abort streaming on unmount
    if (debateStreaming.isStreaming) {
      debateStreaming.abortStream();
    }
  };
}, []);
```

---

## Questions for User

Before proceeding, I need clarification on these decisions:

### Question 1: Completed Debates
**Context:** When a debate reaches round 10 or is explicitly ended

**Options:**
- A) Read-only: Disable "Continue" button, show as completed
- B) Extendable: Allow continuing past round 10 for additional rounds
- C) Configurable: Add "max rounds" setting that can be changed mid-debate

**Recommendation:** Option A (read-only) for cleaner semantics

**Your preference:** ?

---

### Question 2: History Drawer Location
**Context:** Where should the history drawer appear?

**Options:**
- A) Only on setup page (cleaner, focused)
- B) On both pages (easier to switch sessions without going back)
- C) Only on setup page, but add "Load Another Session" button on active page

**Recommendation:** Option A (setup page only)

**Your preference:** ?

---

### Question 3: Config Change Notifications
**Context:** When user adjusts model configs or intensity mid-debate

**Options:**
- A) Silent: Changes apply to next turn, no notification
- B) Toast: Show toast notification "Settings updated for next turn"
- C) Visual indicator: Add badge/dot on message showing config changed from previous
- D) Summary: Show config diff in message metadata (collapsible)

**Recommendation:** Option B (toast notification)

**Your preference:** ?

---

### Question 4: Active Page Header
**Context:** What to show in the navigation bar on active page?

**Options:**
- A) Full topic: "Debate: AI should make decisions about capital punishment..."
- B) Truncated: "Debate: AI should make decisions about..." (truncate long topics)
- C) Generic: "Active Debate" + show topic in sidebar
- D) Dynamic: "Debate - Round 5/10" + show topic on hover

**Recommendation:** Option B (truncated with ellipsis)

**Your preference:** ?

---

### Question 5: Reset Confirmation
**Context:** User clicks "Reset" button on active page

**Options:**
- A) Immediate: Reset immediately, no confirmation
- B) Dialog: Show confirmation dialog "End this debate? This cannot be undone."
- C) Two-step: First click shows warning, second click confirms

**Recommendation:** Option B (confirmation dialog)

**Your preference:** ?

---

### Question 6: Session Persistence
**Context:** What happens to debate sessions after reset?

**Options:**
- A) Kept in database: Session remains in history, can be reloaded
- B) Soft delete: Session marked as "ended" but kept for history
- C) Hard delete: Session removed from database
- D) No change: Reset just clears client state, session persists

**Recommendation:** Option D (session persists, reset clears UI)

**Your preference:** ?

---

### Question 7: URL Redirect on Invalid Session
**Context:** User navigates to `/debate/session/nonexistent`

**Options:**
- A) Immediate redirect: Navigate to `/debate` after showing toast
- B) Error page: Show error UI with "Return to Setup" button
- C) 404 page: Show generic 404 page

**Recommendation:** Option B (error page with button)

**Your preference:** ?

---

## File Structure Summary

### Files to Create:
```
client/src/
├── pages/
│   ├── debate-setup.tsx          ✨ NEW (refactored from debate.tsx)
│   └── debate-active.tsx         ✨ NEW
└── components/
    └── debate/
        └── DebateConfigSidebar.tsx  ✨ NEW
```

### Files to Modify:
```
client/src/
├── pages/
│   ├── App.tsx                   🔧 MODIFY (add new routes)
│   └── debate.tsx                ❌ DELETE (replaced by debate-setup.tsx)
├── components/
│   └── debate/
│       ├── DebateHistoryDrawer.tsx  🔧 MODIFY (add navigation)
│       └── DebateControls.tsx       🔧 MODIFY (add reset handler)
└── hooks/
    └── useDebateSession.ts       🔧 MODIFY (add loadSessionFromId)
```

### Files Unchanged (used by both pages):
```
client/src/
├── components/
│   └── debate/
│       ├── DebateTopicSelector.tsx      ✅ UNCHANGED
│       ├── ModelSelector.tsx            ✅ UNCHANGED
│       ├── AdversarialLevelSelector.tsx ✅ UNCHANGED
│       ├── DebateMessageList.tsx        ✅ UNCHANGED
│       └── DebateMessageCard.tsx        ✅ UNCHANGED
└── hooks/
    ├── useDebateSetup.ts         ✅ UNCHANGED
    ├── useDebateStreaming.ts     ✅ UNCHANGED
    ├── useDebatePrompts.ts       ✅ UNCHANGED
    └── useDebateExport.ts        ✅ UNCHANGED
```

---

## Success Criteria

Before marking this refactor complete, all of these must work:

### ✅ Functional Requirements:
- [ ] Can configure debate on setup page
- [ ] Can start debate → creates session → navigates to active page
- [ ] Active page loads session from URL on mount
- [ ] Active page displays all messages correctly
- [ ] Can continue debate with current model configs
- [ ] Can adjust model configs mid-debate
- [ ] Can adjust intensity mid-debate
- [ ] Next turn uses updated configs
- [ ] Can reset debate → navigates back to setup page
- [ ] Can load historical session from history drawer
- [ ] Browser back button works correctly
- [ ] Browser refresh on active page re-hydrates session

### ✅ Error Handling:
- [ ] Invalid session ID shows error + return button
- [ ] Network failures show retry button
- [ ] Loading states display correctly
- [ ] Session load errors handled gracefully

### ✅ UI/UX:
- [ ] Setup page layout looks clean (no debate UI)
- [ ] Active page layout looks clean (focused on debate)
- [ ] Mobile responsive layouts work
- [ ] Tablet responsive layouts work
- [ ] Desktop layouts use optimal widths
- [ ] Dark mode works on both pages
- [ ] Transitions are smooth

### ✅ Code Quality:
- [ ] No prop drilling (components use hooks)
- [ ] Clear separation of concerns
- [ ] DRY principle followed
- [ ] SRP principle followed
- [ ] Consistent file headers with author/date/purpose
- [ ] TypeScript types are correct
- [ ] No console errors or warnings

---

## Estimated Total Time

- **Phase 1:** Documentation - 60 min ✅
- **Phase 2:** Routing Foundation - 30 min
- **Phase 3:** Refactor Setup Page - 45 min
- **Phase 4:** Build Active Page - 60 min
- **Phase 5:** State Management - 30 min
- **Phase 6:** UI/UX Polish - 30 min
- **Phase 7:** Testing - 30 min
- **Phase 8:** Git Commit - 10 min

**Total: ~5 hours of focused work**

---

## Next Steps

1. **User reviews this document**
2. **User answers the 7 questions above**
3. **User approves plan**
4. **Implementation begins with Phase 2**

---

## Appendix: Alternative Approaches Considered

### Alternative 1: Modal/Drawer Instead of Separate Page
**Idea:** Keep single `/debate` page, show setup in modal/drawer

**Pros:**
- Less routing complexity
- Faster transitions (no page change)

**Cons:**
- ❌ Can't deep-link to sessions
- ❌ Modal overlays debate messages (confusing)
- ❌ Setup UI still mixed with active UI
- ❌ Browser back button doesn't close modal

**Decision:** Rejected - separate pages are cleaner

---

### Alternative 2: Tab-based UI
**Idea:** Keep single page, use tabs: "Setup" | "Active Debate"

**Pros:**
- No routing changes needed
- Familiar UI pattern

**Cons:**
- ❌ Can't deep-link to sessions
- ❌ URL doesn't reflect state
- ❌ Tabs visible when not relevant (e.g., "Setup" tab during active debate)
- ❌ State management still complex

**Decision:** Rejected - tabs don't solve core problems

---

### Alternative 3: Wizard/Stepper UI
**Idea:** Multi-step wizard: Step 1 (Topic) → Step 2 (Models) → Step 3 (Intensity) → Step 4 (Active)

**Pros:**
- Guides user through setup
- Clear progression

**Cons:**
- ❌ Overkill for simple setup (3 fields)
- ❌ Slower UX (must click through steps)
- ❌ Harder to adjust settings mid-debate
- ❌ Doesn't solve deep-linking issue

**Decision:** Rejected - too complex for this use case

---

### Alternative 4: Keep Current Architecture
**Idea:** Don't split pages, just improve conditional rendering

**Pros:**
- No major refactor needed
- Familiar to existing users

**Cons:**
- ❌ Doesn't solve any of the core problems
- ❌ Technical debt accumulates
- ❌ Hard to maintain as features grow
- ❌ Poor separation of concerns

**Decision:** Rejected - doesn't address root issues

---

**Chosen Approach:** Separate pages with explicit routing ✅

**Rationale:**
- Clean separation of concerns
- Deep-linkable sessions
- Better UX (focused interfaces)
- Easier to maintain and extend
- Aligns with REST principles (resource-based URLs)
- Standard pattern in modern web apps

---

## End of Plan Document

**Status:** Awaiting user review and approval
**Next Action:** User answers questions and approves plan
**Then:** Begin Phase 2 implementation
