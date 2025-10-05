# Mark the Manager Agent - Best Practices Upgrade

**Date:** 2025-09-30
**Agent:** Mark the Manager (`mark.ts`)
**Purpose:** Comprehensive upgrade implementing AgentDefinition best practices
**Status:** Implementation In Progress

---

## Executive Summary

This document outlines 12 improvements to Mark the Manager agent based on deep analysis of `agent-definition.ts` best practices. The improvements are prioritized by impact and organized into 5 implementation phases.

**Critical Finding:** Mark uses `outputMode: 'structured_output'` but lacks an `outputSchema` definition, making output unpredictable and not machine-readable.

---

## Improvement Categories

### 🔴 CRITICAL (Must Fix Immediately)
1. **Missing outputSchema** - Core functionality broken
2. **Missing 'think_deeply' tool** - Core capability unavailable
3. **Agent reference mismatch** - Documentation inconsistency

### 🟡 HIGH VALUE (Significant Enhancement)
4. **No handleSteps function** - Missing programmatic workflow control
5. **Limited file operation tools** - Can't self-service research
6. **Underpowered inputSchema** - Can't capture request metadata

### 🟢 QUALITY IMPROVEMENTS (Polish & Optimization)
7. **No stepPrompt** - Missed reinforcement opportunity
8. **Unorganized spawnable agents** - Poor documentation
9. **No complexity framework** - Subjective assessments
10. **No pre-flight validation** - Missing quality gate
11. **Limited MCP guidance** - Unclear tool usage
12. **No progress tracking strategy** - Difficult to monitor execution

---

## Detailed Analysis

### 1. CRITICAL: Missing outputSchema ⚠️

**Current State:**
```typescript
outputMode: 'structured_output',
// ❌ NO outputSchema defined!
```

**Problem:**
- Structured output mode requires explicit schema
- Without schema, output format is unpredictable
- Downstream systems can't parse results reliably
- Violates TypeScript principle of explicit contracts

**Solution:**
Define comprehensive schema with:
- Executive summary
- Complexity and risk scoring
- Execution plan with steps
- Engineering quality metrics
- Success criteria and testing strategy
- Dependencies and risks
- Next steps for user

**Impact:** 🔴 **CRITICAL** - Core functionality affected

---

### 2. CRITICAL: Missing 'think_deeply' Tool

**Current State:**
```typescript
toolNames: [
  'spawn_agents',
  'set_output',
  'add_message',
  'end_turn',
  'mcp_list_tools',
  'mcp_call_tool'
  // ❌ NO 'think_deeply'!
]
```

**Problem:**
- Mark is a MANAGER who needs deep thinking capability
- Currently can only spawn thinker agents (adds latency)
- Can't do quick analysis without external agents
- Type definition shows 'think_deeply' is available

**Solution:**
Add `'think_deeply'` to toolNames array

**Impact:** 🔴 **CRITICAL** - Core capability missing

---

### 3. CRITICAL: Agent Reference Mismatch

**Current State:**
```typescript
systemPrompt: `...
- simple-researcher: Basic web/docs research  // ❌ Not in spawnableAgents!
- code-assistant: Code analysis and editing   // ❌ Not in spawnableAgents!
`
```

**Problem:**
- Documentation references agents that can't be spawned
- Misleading to Mark and confusing for debugging
- Creates false expectations

**Solution:**
- Remove references to unavailable agents
- Document only spawnable agents
- Organize agents by category with comments

**Impact:** 🔴 **CRITICAL** - Documentation accuracy

---

### 4. HIGH VALUE: No handleSteps Function

**Current State:**
No `handleSteps` function defined - relies entirely on LLM orchestration

**Problem:**
- Workflow is non-deterministic
- Can't guarantee execution order
- No programmatic quality gates
- Harder to debug and test
- Misses powerful orchestration capability

**Solution:**
Implement generator function with:
1. Initial deep thinking phase
2. Parallel research and critical analysis (file-explorer + Benny)
3. Model processing step
4. Engineering pre-check (Edgar)
5. Final plan synthesis (STEP_ALL)

**Benefits:**
- ✅ Deterministic workflow
- ✅ Parallel agent spawning
- ✅ Guaranteed quality checks
- ✅ Better logging and debugging
- ✅ Enforced best practices

**Impact:** 🟡 **HIGH** - Significant capability enhancement

---

### 5. HIGH VALUE: Limited File Operation Tools

**Current State:**
Mark can't read files, search code, or discover patterns independently

**Problem:**
- Must spawn agents for every file read
- Adds latency and complexity
- Can't quickly verify facts
- Inefficient for simple lookups

**Solution:**
Add to toolNames:
- `'read_files'` - Read CLAUDE.md, docs, plans
- `'find_files'` - Discover related files
- `'code_search'` - Search for patterns

**Benefits:**
- ✅ Self-service research capability
- ✅ Reduced agent spawning overhead
- ✅ Faster fact verification
- ✅ Better context awareness

**Impact:** 🟡 **HIGH** - Significant efficiency gain

---

### 6. HIGH VALUE: Underpowered Input Schema

**Current State:**
```typescript
inputSchema: {
  prompt: {
    type: 'string',
    description: 'What crazy new feature do you want to add!? 😁'
  }
  // ❌ No params object!
}
```

**Problem:**
- Can only accept freeform text
- No structured metadata capture
- Can't pre-categorize requests
- Misses opportunity for smart routing

**Solution:**
Add params object with:
- `priority`: low/medium/high/critical
- `complexity`: simple/moderate/complex/unknown
- `affectedSystems`: array of impacted components
- `hasExistingCode`: boolean
- `timeframe`: target completion
- `constraints`: special requirements

**Benefits:**
- ✅ Structured request metadata
- ✅ Better prioritization
- ✅ Smarter agent routing
- ✅ Improved analytics

**Impact:** 🟡 **HIGH** - Better input processing

---

### 7. QUALITY: No stepPrompt Defined

**Current State:**
Only `systemPrompt` and `instructionsPrompt` defined

**Opportunity:**
`stepPrompt` is inserted at EVERY agent step - perfect for reinforcing critical checks

**Solution:**
Add stepPrompt with checklist:
```
Before each action:
1. Have I gathered enough information?
2. Have I considered Benny's concerns?
3. Have I validated with Edgar?
4. Is this the simplest approach?
5. Am I documenting decisions?
```

**Impact:** 🟢 **MEDIUM** - Behavior reinforcement

---

### 8. QUALITY: Unorganized Spawnable Agents

**Current State:**
Flat list of 13+ agents with no categorization

**Problem:**
- Hard to scan and understand capabilities
- No clear purpose documentation
- Difficult to maintain

**Solution:**
Organize with category comments:
- Research & Discovery (3 agents)
- Analysis & Planning (4 agents)
- Quality & Review (3 agents)
- Execution & DevOps (3 agents)

**Impact:** 🟢 **LOW** - Documentation quality

---

### 9. QUALITY: No Complexity Assessment Framework

**Current State:**
No objective criteria for judging complexity

**Problem:**
- Subjective assessments
- Inconsistent handling
- Poor resource allocation

**Solution:**
Add to systemPrompt:
```
COMPLEXITY SCORING (1-10):
1-3: Simple (single file, clear requirements, no dependencies)
4-6: Moderate (multiple files, some unknowns, manageable dependencies)
7-9: Complex (cross-system changes, architectural decisions, high risk)
10: Critical (major refactor, breaking changes, extensive testing needed)
```

**Impact:** 🟢 **MEDIUM** - Better assessment quality

---

### 10. QUALITY: No Pre-Flight Validation

**Current State:**
Mark proceeds immediately without validation checklist

**Problem:**
- May work with incomplete information
- Doesn't verify prerequisites
- No systematic requirement gathering

**Solution:**
Add pre-flight checklist to instructions:
```
PRE-FLIGHT CHECKLIST:
□ Requirements are clear and unambiguous
□ Success criteria are defined
□ Affected systems are identified
□ Dependencies are understood
□ Resources are available
□ User has been asked clarifying questions

If ANY fails: Request more information before proceeding.
```

**Impact:** 🟢 **MEDIUM** - Quality gate

---

### 11. QUALITY: Limited MCP Server Guidance

**Current State:**
Generic mention of MCP servers without specific use cases

**Problem:**
- Underutilized powerful tools
- Unclear when to use which server

**Solution:**
Add specific guidance:
```
USE chlorpromazine WHEN:
- Need current MCP specifications
- Looking for MCP implementation patterns
- Validating MCP server configurations

USE exa WHEN:
- Researching similar projects
- Finding industry best practices
- Discovering new approaches
```

**Impact:** 🟢 **LOW** - Tool utilization

---

### 12. QUALITY: No Progress Tracking Strategy

**Current State:**
`add_message` tool available but no guidance on progress tracking

**Opportunity:**
Use `add_message` to create milestone markers

**Solution:**
Add to instructions:
```
Use add_message to log progress milestones:
- "✅ Research complete"
- "🔄 Edgar reviewing"
- "⚠️ Issues found, addressing..."
- "✨ Plan ready for review"
```

**Impact:** 🟢 **LOW** - Visibility improvement

---

## Implementation Plan

### Phase 1: Critical Fixes (Priority 1-3)
**Time:** 10 minutes
- Add comprehensive outputSchema
- Add 'think_deeply' and file operation tools
- Fix agent references
- Organize spawnable agents list

### Phase 2: High-Value Enhancements (Priority 4-6)
**Time:** 15 minutes
- Implement handleSteps function
- Enhance inputSchema with params

### Phase 3: Quality Improvements (Priority 7-12)
**Time:** 10 minutes
- Add stepPrompt
- Add complexity framework
- Add pre-flight checklist
- Enhance MCP guidance
- Add progress tracking strategy

### Phase 4: Testing & Validation
**Time:** 10 minutes
- Update file header
- Test type checking
- Verify all references
- Create verbose commit message

---

## Expected Outcomes

### Before vs After

**Before:**
- ❌ Unpredictable output format
- ❌ Missing core thinking capability
- ❌ Inefficient (spawns agents for everything)
- ❌ Non-deterministic workflow
- ❌ Poor request metadata capture

**After:**
- ✅ Structured, machine-readable output
- ✅ Full tooling capability
- ✅ Self-service research
- ✅ Deterministic, programmatic workflow
- ✅ Rich request context
- ✅ Comprehensive quality gates

### Metrics

**Efficiency:**
- 50% reduction in agent spawning for simple tasks
- Faster response times for straightforward requests

**Quality:**
- 100% guaranteed Edgar review via handleSteps
- Consistent output schema for downstream processing
- Better requirement gathering via enhanced inputs

**Maintainability:**
- Clear agent categorization
- Documented complexity framework
- Explicit workflow steps

---

## SRP/DRY Analysis

### SRP Compliance: ✅ PASS
Mark retains single responsibility: **Project management and orchestration**

All improvements enhance this core responsibility without adding unrelated concerns:
- Output schema → Better communication of plans
- handleSteps → Better workflow orchestration
- File tools → Better context gathering for planning
- Input params → Better request understanding

### DRY Compliance: ✅ PASS
- Reuses existing agent definitions (no duplication)
- Leverages built-in tools (no custom implementations)
- References established patterns from agent-definition.ts

### Over-Engineering Check: ✅ PASS
All improvements address real gaps:
- outputSchema: Required by structured_output mode
- handleSteps: Enables deterministic workflows (optional but valuable)
- File tools: Reduces unnecessary agent spawning
- Input params: Standard practice for structured agents

### Under-Engineering Check: ✅ PASS
No critical abstractions missing after improvements.

---

## Risk Assessment

### Low Risk Changes:
- Adding tools to toolNames
- Adding outputSchema
- Organizing comments
- Enhancing prompts

### Medium Risk Changes:
- Implementing handleSteps (can be disabled if issues arise)
- Changing inputSchema (backward compatible - params optional)

### Mitigation:
- Test with simple requests first
- Verify type checking passes
- Keep git history for rollback
- Document all changes in verbose commit

---

## Conclusion

These 12 improvements transform Mark from a basic agent into a production-grade project manager with:
- **Deterministic workflow orchestration**
- **Structured, predictable outputs**
- **Self-service research capabilities**
- **Built-in quality gates**
- **Comprehensive request processing**

The changes follow all AgentDefinition best practices and maintain strict adherence to SRP/DRY principles.

**Total Implementation Time:** ~45 minutes
**Risk Level:** Low to Medium
**Expected Value:** High
**Recommended:** Proceed with implementation

---

**Author:** Claude Code using Sonnet 4
**Date:** 2025-09-30
**File:** docs/30092025-mark-agent-improvements.md