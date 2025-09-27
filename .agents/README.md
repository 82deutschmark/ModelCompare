# Codebuff Agents

This directory contains custom agent definitions for your project. Agents are AI-powered tools that can perform specific tasks using various tools and can spawn other agents to help complete complex workflows.

## Directory Structure

```
.agents/
├── types/
│   ├── agent-definition.ts    # Complete type definitions
│   ├── tools.ts              # Tool parameter types
│   └── util-types.ts         # Utility types
├── examples/
│   ├── simple-researcher.ts  # Basic research agent
│   ├── code-assistant.ts     # Code analysis and editing
│   └── coordinator.ts        # Multi-agent coordinator
└── README.md                 # This file
```

## Creating Your First Agent

Create a new `.ts` file in the `.agents` directory:

```typescript
import type { AgentDefinition } from './types/agent-definition'

const definition: AgentDefinition = {
  id: 'my-agent',
  displayName: 'My Custom Agent',
  model: 'x-ai/grok-4-fast:free',
  spawnerPrompt: 'What this agent does and when to use it',
  inputSchema: {
    prompt: {
      type: 'string',
      description: 'What should the user provide?'
    }
  },
  toolNames: ['read_files', 'write_file'],
  instructionsPrompt: 'How the agent should behave'
}

export default definition
```

## Key Concepts

### Agent Types

1. **Base Agents**: Full-featured agents with comprehensive tool access
2. **Specialized Agents**: Focused agents with limited tool sets for specific tasks
3. **Coordinator Agents**: Agents that spawn and coordinate other agents

### Available Tools

- **File Operations**: `read_files`, `write_file`, `str_replace`, `find_files`
- **Code Analysis**: `code_search`, `find_files`
- **Terminal**: `run_terminal_command`
- **Web & Research**: `web_search`, `read_docs`
- **Agent Management**: `spawn_agents`
- **Control**: `end_turn`, `set_output`

### Published Agents You Can Reuse

Add these to your `spawnableAgents` array:

- `codebuff/file-explorer@0.0.6` - Explore codebase structure
- `codebuff/researcher-grok-4-fast@0.0.3` - General research
- `codebuff/thinker@0.0.4` - Deep thinking and analysis
- `codebuff/deep-thinker@0.0.3` - Very deep analysis (slower)
- `codebuff/editor@0.0.4` - Code editing and modifications
- `codebuff/base-lite-grok-4-fast@0.0.1` - General purpose agent

## Best Practices

### Keep It Simple
- Only include fields you actually need
- Use minimal tool sets - only what the agent requires
- Prefer `last_message` output mode unless you need structured output

### Choose the Right Model
- `x-ai/grok-4-fast:free` - Fast, inexpensive, good for simple tasks
- `anthropic/claude-4-sonnet-20250522` - Balanced performance
- `openai/gpt-5` - Best for complex reasoning tasks

### Writing Good Prompts
- **spawnerPrompt**: When and why to use this agent
- **instructionsPrompt**: How the agent should behave (most important)
- **systemPrompt**: Background context (optional)

### Agent Patterns

#### Simple Task Agent
```typescript
{
  id: 'task-agent',
  displayName: 'Task Agent',
  model: 'x-ai/grok-4-fast:free',
  toolNames: ['specific_tool'],
  instructionsPrompt: 'Do this specific thing'
}
```

#### Research Agent
```typescript
{
  id: 'researcher',
  displayName: 'Researcher',
  model: 'x-ai/grok-4-fast:free',
  toolNames: ['web_search', 'read_docs'],
  instructionsPrompt: 'Research topics and provide summaries'
}
```

#### Coordinator Agent
```typescript
{
  id: 'coordinator',
  displayName: 'Coordinator',
  model: 'openai/gpt-5',
  toolNames: ['spawn_agents'],
  spawnableAgents: ['agent1', 'agent2'],
  instructionsPrompt: 'Break down tasks and coordinate agents'
}
```

## Advanced Features

### Input/Output Schemas
Most agents just need a prompt input:
```typescript
inputSchema: {
  prompt: { type: 'string', description: 'What to do' }
}
```

For structured output:
```typescript
outputMode: 'structured_output',
outputSchema: {
  type: 'object',
  properties: {
    result: { type: 'string' },
    confidence: { type: 'number' }
  }
}
```

### Custom Tool Sequences
For complex workflows, use `handleSteps`:
```typescript
handleSteps: function* ({ prompt, logger }) {
  // Step 1: Read files
  const { toolResult } = yield {
    toolName: 'read_files',
    input: { paths: ['file1.ts'] }
  }
  
  // Step 2: Let AI process
  yield 'STEP_ALL'
  
  // Step 3: Set output
  yield {
    toolName: 'set_output',
    input: { result: 'processed' }
  }
}
```

## Examples in Action

Check the `examples/` directory for complete agent definitions:

- **simple-researcher.ts**: Basic web and documentation research
- **code-assistant.ts**: Code analysis, editing, and file operations
- **coordinator.ts**: Multi-agent task coordination

## Testing Your Agents

After creating an agent, you can test it by:
1. Spawning it from another agent
2. Using it directly in the Codebuff interface
3. Adding it to a coordinator agent's spawnable list

## Publishing Agents

To share your agents:
1. Add a `publisher` field to your agent definition
2. Use the Codebuff CLI to publish to the agent store
3. Others can then use `your-publisher/agent-name@version` format

Happy agent building! 🤖