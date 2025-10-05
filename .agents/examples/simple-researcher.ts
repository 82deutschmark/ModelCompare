import type { AgentDefinition } from '../types/agent-definition'

const definition: AgentDefinition = {
  id: 'simple-researcher',
  displayName: 'Simple Researcher',
  model: 'x-ai/grok-4-fast:free',
  spawnerPrompt: 'Research any topic using web search and documentation lookups.',
  inputSchema: {
    prompt: {
      type: 'string',
      description: 'What would you like me to research?'
    }
  },
  outputMode: 'last_message',
  toolNames: ['web_search', 'read_docs'],
  instructionsPrompt: `You are a helpful researcher. Use web_search to find current information and read_docs to get technical documentation when needed. Provide a comprehensive summary of your findings.`
}

export default definition