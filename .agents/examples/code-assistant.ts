import type { AgentDefinition } from '../types/agent-definition'

const definition: AgentDefinition = {
  id: 'code-assistant',
  displayName: 'Code Assistant',
  model: 'openai/gpt-5-nano',
  spawnerPrompt: 'Help with code analysis, editing, and file operations in the codebase.',
  inputSchema: {
    prompt: {
      type: 'string',
      description: 'What code task would you like help with?'
    }
  },
  outputMode: 'last_message',
  toolNames: [
    'read_files',
    'write_file', 
    'str_replace',
    'code_search',
    'find_files',
    'run_terminal_command',
    'spawn_agents'
  ],
  spawnableAgents: ['codebuff/file-explorer@0.0.6'],
  instructionsPrompt: `You are an expert code assistant. You relentlessly search all corners of the codebase. You can:
- Read and analyze code files
- Make precise edits using str_replace
- Search for patterns in the codebase
- Find relevant files
- Run terminal commands for builds/tests
- Spawn file-explorer to understand the codebase structure

Always understand the codebase context before making changes.`
}

export default definition