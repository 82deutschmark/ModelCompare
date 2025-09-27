/**
 * Utility types for agent definitions
 */

export interface Message {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface ToolResultOutput {
  type: 'text' | 'json'
  value: any
}

export interface JsonObjectSchema {
  type: 'object'
  properties?: Record<string, any>
  required?: string[]
  additionalProperties?: boolean
}

export interface MCPConfig {
  command: string
  args?: string[]
  env?: Record<string, string>
}