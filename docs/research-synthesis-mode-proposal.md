# Research Synthesis Mode - Advanced Variable System Demonstration

**Mode Name**: `research-synthesis`  
**Status**: Proposed  
**Author**: Claude Code Assistant  
**Date**: August 17, 2025

## Concept

A sophisticated research collaboration mode where multiple AI models work together to build comprehensive research on complex topics, each contributing different perspectives and expertise areas.

## Variable Registry Definition

```typescript
'research-synthesis': [
  // Core research topic
  { 
    name: 'researchTopic', 
    type: 'string', 
    required: true, 
    description: 'Primary research question or topic' 
  },
  
  // Research methodology  
  { 
    name: 'methodology', 
    type: 'enum', 
    required: true, 
    enum: ['systematic-review', 'meta-analysis', 'comparative-study', 'exploratory', 'experimental'], 
    description: 'Research methodology approach' 
  },
  
  // Depth level
  { 
    name: 'depth', 
    type: 'enum', 
    required: true, 
    enum: ['surface', 'intermediate', 'deep', 'exhaustive'], 
    description: 'Research depth and comprehensiveness' 
  },
  
  // Academic discipline focus
  { 
    name: 'discipline', 
    type: 'enum', 
    required: true, 
    enum: ['computer-science', 'psychology', 'economics', 'biology', 'physics', 'interdisciplinary'], 
    description: 'Primary academic discipline lens' 
  },
  
  // Time horizon
  { 
    name: 'timeHorizon', 
    type: 'enum', 
    required: true, 
    enum: ['historical', 'current', 'future-trends', 'comprehensive'], 
    description: 'Temporal focus of research' 
  },
  
  // Evidence quality requirement
  { 
    name: 'evidenceLevel', 
    type: 'enum', 
    required: true, 
    enum: ['peer-reviewed', 'academic-sources', 'mixed-sources', 'open-web'], 
    description: 'Required evidence quality level' 
  },
  
  // Previous research findings (for iterative synthesis)
  { 
    name: 'previousFindings', 
    type: 'string', 
    required: false, 
    description: 'Previous research synthesis to build upon' 
  },
  
  // Research gap or hypothesis
  { 
    name: 'researchGap', 
    type: 'string', 
    required: false, 
    description: 'Specific gap or hypothesis to investigate' 
  },
  
  // Target audience
  { 
    name: 'audience', 
    type: 'enum', 
    required: true, 
    enum: ['academic', 'professional', 'policy-makers', 'general-public', 'specialists'], 
    description: 'Intended audience for research synthesis' 
  },
  
  // Synthesis round (for multi-round collaboration)
  { 
    name: 'round', 
    type: 'number', 
    required: false, 
    default: '1',
    description: 'Current synthesis round number' 
  },
  
  // Model expertise role
  { 
    name: 'expertiseRole', 
    type: 'enum', 
    required: true, 
    enum: ['literature-reviewer', 'methodologist', 'data-analyst', 'theory-builder', 'critic', 'synthesizer'], 
    description: 'Specialized role for this model in research process' 
  }
]
```

## Template System Examples

### Literature Reviewer Role Template
```markdown
You are acting as a **Literature Reviewer** in a collaborative research synthesis on: "{researchTopic}"

**Research Parameters:**
- Methodology: {methodology}
- Discipline Focus: {discipline}
- Depth Level: {depth}
- Time Horizon: {timeHorizon}
- Evidence Level Required: {evidenceLevel}
- Target Audience: {audience}

**Your Role:** Conduct comprehensive literature review, identify key sources, summarize findings, and highlight research gaps.

{researchGap|Focus your review broadly across the topic area}

**Instructions:**
1. Identify 8-12 key sources relevant to the research topic
2. Summarize major findings and methodological approaches
3. Highlight consensus areas and controversial findings  
4. Identify gaps in current research
5. Suggest directions for further investigation

**Previous Research Context:**
{previousFindings|This is the first round of research synthesis}

**Output Format:**
- Executive Summary (2-3 sentences)
- Key Sources (with brief annotations)
- Major Findings
- Research Gaps Identified
- Recommendations for Further Research
```

### Data Analyst Role Template  
```markdown
You are acting as a **Data Analyst** in a collaborative research synthesis on: "{researchTopic}"

**Research Context:**
- Round: {round}
- Previous Findings: {previousFindings}
- Research Gap: {researchGap}

**Your Role:** Analyze quantitative aspects, identify patterns, assess statistical validity, and provide data-driven insights.

**Instructions:**
1. Evaluate statistical methodologies used in existing research
2. Identify quantitative patterns and trends
3. Assess sample sizes and statistical power
4. Highlight data limitations and biases
5. Suggest analytical improvements

**Focus Areas:**
- Sample sizes and demographics
- Statistical methods and validity
- Effect sizes and confidence intervals
- Reproducibility concerns
- Meta-analysis opportunities
```

### Theory Builder Role Template
```markdown
You are acting as a **Theory Builder** in a collaborative research synthesis on: "{researchTopic}"

**Synthesis Context:**
- Discipline: {discipline}
- Audience: {audience}
- Depth: {depth}
- Previous Work: {previousFindings}

**Your Role:** Develop theoretical frameworks, connect disparate findings, and propose unified models.

**Instructions:**
1. Identify underlying theoretical frameworks
2. Connect findings across different studies
3. Propose integrated theoretical models
4. Identify causal mechanisms and relationships
5. Generate testable hypotheses

**Theoretical Focus:**
- Causal relationships and mechanisms
- Boundary conditions and moderators
- Integration across findings
- Predictive framework development
- Theory refinement opportunities
```

## Multi-Round Collaboration Flow

### Round 1: Individual Expertise
1. **Literature Reviewer** analyzes existing research
2. **Data Analyst** evaluates quantitative evidence  
3. **Methodologist** assesses research quality
4. **Theory Builder** identifies theoretical frameworks

### Round 2: Cross-Pollination
- Each model receives others' findings via `{previousFindings}`
- **Critic** role identifies inconsistencies and weaknesses
- **Synthesizer** role begins integration

### Round 3: Unified Synthesis
- **Synthesizer** creates comprehensive synthesis
- **Critic** provides final quality assessment
- Output: Comprehensive research synthesis document

## Advanced Features Enabled by Variable System

### 1. **Dynamic Role Assignment**
```typescript
// Server can assign different expertise roles based on model capabilities
const assignOptimalRole = (modelId: string): string => {
  const capabilities = getModelCapabilities(modelId);
  if (capabilities.reasoning) return 'data-analyst';
  if (capabilities.creative) return 'theory-builder';
  return 'literature-reviewer';
}
```

### 2. **Progressive Complexity**
```typescript
// Variables enable adaptive depth based on round number
const adaptDepth = (round: number): string => {
  return round === 1 ? 'surface' : round === 2 ? 'intermediate' : 'deep';
}
```

### 3. **Contextual Memory**
```typescript
// Rich context passing between rounds
const buildContext = (previousSynthesis: string[], round: number) => {
  return {
    previousFindings: previousSynthesis.join('\n\n---\n\n'),
    round: round.toString(),
    // Additional contextual variables
  };
}
```

### 4. **Quality Validation**
```typescript
// Variable-driven quality checks
const validateSynthesis = (variables: Record<string, string>) => {
  const requiredElements = {
    'academic': ['methodology', 'evidenceLevel', 'researchGap'],
    'professional': ['audience', 'timeHorizon'],
    'policy-makers': ['researchTopic', 'audience', 'evidenceLevel']
  };
  
  return requiredElements[variables.audience].every(elem => 
    variables[elem] && variables[elem].length > 0
  );
}
```

## Implementation Benefits

### 1. **Type Safety**
- Variable registry ensures all templates use consistent variable names
- Server-side validation prevents runtime errors
- Auto-generated UI helpers for variable input

### 2. **Expandability**
- New roles easily added to `expertiseRole` enum
- Additional variables for specialized research types
- Template system supports complex multi-variable substitution

### 3. **Streaming Synthesis**
- Real-time collaboration between models
- Progressive synthesis building
- Live updating of research synthesis document

### 4. **Audit Trail**
- Complete variable resolution logging
- Research methodology transparency
- Reproducible synthesis processes

## UI Components Generated

The variable registry automatically generates:

```typescript
// Methodology selector
<Select value={methodology} onValueChange={setMethodology}>
  <SelectItem value="systematic-review">Systematic Review</SelectItem>
  <SelectItem value="meta-analysis">Meta-Analysis</SelectItem>
  // ... other options
</Select>

// Expertise role assignment
<RadioGroup value={expertiseRole} onValueChange={setExpertiseRole}>
  <RadioGroupItem value="literature-reviewer">Literature Reviewer</RadioGroupItem>
  <RadioGroupItem value="data-analyst">Data Analyst</RadioGroupItem>
  // ... other roles
</RadioGroup>
```

## Research Output Example

Given variables:
```json
{
  "researchTopic": "Impact of AI on software development productivity",
  "methodology": "systematic-review", 
  "discipline": "computer-science",
  "depth": "deep",
  "audience": "professional",
  "expertiseRole": "literature-reviewer"
}
```

The template resolves to a comprehensive research prompt that produces structured, role-specific analysis contributing to a larger collaborative synthesis.

---

**This demonstrates how the unified variable system enables sophisticated, multi-model collaboration workflows that would be impossible with simple string replacement approaches.**