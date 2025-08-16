/**
 * Export Utilities - Generate downloadable files from model responses
 * 
 * This module provides utilities for exporting model comparison results
 * to various formats including Markdown and plain text files.
 */

import type { AIModel, ModelResponse } from "@/types/ai-models";

export interface ExportData {
  prompt: string;
  timestamp: Date;
  models: Array<{
    model: AIModel;
    response: ModelResponse;
  }>;
}

/**
 * Generate a markdown export of model comparison results
 */
export function generateMarkdownExport(data: ExportData): string {
  const { prompt, timestamp, models } = data;
  
  // Detect if this is a chat conversation (multiple responses from same models)
  const modelIds = models.map(item => item.model.id);
  const uniqueModelIds = Array.from(new Set(modelIds));
  const isChatConversation = modelIds.length > uniqueModelIds.length;
  
  let markdown = isChatConversation 
    ? `# AI Model Battle Chat Export\n\n`
    : `# Model Comparison Results\n\n`;
    
  markdown += `**Generated:** ${timestamp.toLocaleString()}\n\n`;
  markdown += `## Prompt\n\n${prompt}\n\n`;
  
  if (isChatConversation) {
    markdown += `## Conversation\n\n`;
    models.forEach((item, index) => {
      const { model, response } = item;
      const messageNumber = index + 1;
      
      markdown += `**Message ${messageNumber} - ${model.name}**\n\n`;
      
      if (response.status === 'success') {
        markdown += `${response.content}\n\n`;
        
        // Add metadata if available
        if (response.responseTime || response.tokenUsage || response.cost) {
          markdown += `<details>\n<summary>Metadata</summary>\n\n`;
          if (response.responseTime) {
            markdown += `- Response Time: ${(response.responseTime / 1000).toFixed(1)}s\n`;
          }
          if (response.tokenUsage) {
            markdown += `- Tokens: ${response.tokenUsage.input} → ${response.tokenUsage.output}`;
            if (response.tokenUsage.reasoning) {
              markdown += ` (+${response.tokenUsage.reasoning} reasoning)`;
            }
            markdown += `\n`;
          }
          if (response.cost) {
            markdown += `- Cost: $${response.cost.total.toFixed(6)}`;
            if (response.cost.reasoning) {
              markdown += ` (+$${response.cost.reasoning.toFixed(6)} reasoning)`;
            }
            markdown += `\n`;
          }
          markdown += `\n</details>\n\n`;
        }

        // Add reasoning if available
        if (response.reasoning) {
          markdown += `<details>\n<summary>Reasoning</summary>\n\n\`\`\`\n${response.reasoning}\n\`\`\`\n\n</details>\n\n`;
        }
      } else if (response.status === 'error') {
        markdown += `*Error: ${response.error || 'An error occurred'}*\n\n`;
      } else {
        markdown += `*No response available*\n\n`;
      }
      
      markdown += `---\n\n`;
    });
  } else {
    markdown += `## Responses\n\n`;
    models.forEach((item, index) => {
      const { model, response } = item;
      
      markdown += `### ${index + 1}. ${model.name} (${model.provider})\n\n`;
      
      if (response.status === 'success') {
        markdown += `${response.content}\n\n`;
        
        // Add metadata if available
        if (response.responseTime || response.tokenUsage || response.cost) {
          markdown += `**Metadata:**\n`;
          if (response.responseTime) {
            markdown += `- Response Time: ${(response.responseTime / 1000).toFixed(1)}s\n`;
          }
          if (response.tokenUsage) {
            markdown += `- Tokens: ${response.tokenUsage.input} → ${response.tokenUsage.output}`;
            if (response.tokenUsage.reasoning) {
              markdown += ` (+${response.tokenUsage.reasoning} reasoning)`;
            }
            markdown += `\n`;
          }
          if (response.cost) {
            markdown += `- Cost: $${response.cost.total.toFixed(6)}`;
            if (response.cost.reasoning) {
              markdown += ` (+$${response.cost.reasoning.toFixed(6)} reasoning)`;
            }
            markdown += `\n`;
          }
          markdown += `\n`;
        }

        // Add reasoning if available
        if (response.reasoning) {
          markdown += `**Reasoning:**\n\n\`\`\`\n${response.reasoning}\n\`\`\`\n\n`;
        }
      } else if (response.status === 'error') {
        markdown += `*Error: ${response.error || 'An error occurred'}*\n\n`;
      } else {
        markdown += `*No response available*\n\n`;
      }
      
      markdown += `---\n\n`;
    });
  }

  markdown += `*Generated with ModelCompare*\n`;
  
  return markdown;
}

/**
 * Generate a plain text export of model comparison results
 */
export function generateTextExport(data: ExportData): string {
  const { prompt, timestamp, models } = data;
  
  // Detect if this is a chat conversation
  const modelIds = models.map(item => item.model.id);
  const uniqueModelIds = Array.from(new Set(modelIds));
  const isChatConversation = modelIds.length > uniqueModelIds.length;
  
  let text = isChatConversation 
    ? `AI MODEL BATTLE CHAT EXPORT\n============================\n\n`
    : `MODEL COMPARISON RESULTS\n========================\n\n`;
    
  text += `Generated: ${timestamp.toLocaleString()}\n\n`;
  text += `PROMPT:\n${prompt}\n\n`;
  
  if (isChatConversation) {
    text += `CONVERSATION:\n\n`;
    models.forEach((item, index) => {
      const { model, response } = item;
      const messageNumber = index + 1;
      
      text += `MESSAGE ${messageNumber} - ${model.name}\n`;
      text += `${'='.repeat(50)}\n\n`;
      
      if (response.status === 'success') {
        text += `${response.content}\n\n`;
        
        // Add metadata if available
        if (response.responseTime || response.tokenUsage || response.cost) {
          text += `METADATA:\n`;
          if (response.responseTime) {
            text += `Response Time: ${(response.responseTime / 1000).toFixed(1)}s\n`;
          }
          if (response.tokenUsage) {
            text += `Tokens: ${response.tokenUsage.input} → ${response.tokenUsage.output}`;
            if (response.tokenUsage.reasoning) {
              text += ` (+${response.tokenUsage.reasoning} reasoning)`;
            }
            text += `\n`;
          }
          if (response.cost) {
            text += `Cost: $${response.cost.total.toFixed(6)}`;
            if (response.cost.reasoning) {
              text += ` (+$${response.cost.reasoning.toFixed(6)} reasoning)`;
            }
            text += `\n`;
          }
          text += `\n`;
        }

        // Add reasoning if available
        if (response.reasoning) {
          text += `REASONING:\n${response.reasoning}\n\n`;
        }
      } else if (response.status === 'error') {
        text += `Error: ${response.error || 'An error occurred'}\n\n`;
      } else {
        text += `No response available\n\n`;
      }
      
      text += `${'-'.repeat(50)}\n\n`;
    });
  } else {
    text += `RESPONSES:\n\n`;
    models.forEach((item, index) => {
      const { model, response } = item;
      
      text += `${index + 1}. ${model.name} (${model.provider})\n`;
      text += `${'='.repeat(50)}\n\n`;
      
      if (response.status === 'success') {
        text += `${response.content}\n\n`;
        
        // Add metadata if available
        if (response.responseTime || response.tokenUsage || response.cost) {
          text += `METADATA:\n`;
          if (response.responseTime) {
            text += `Response Time: ${(response.responseTime / 1000).toFixed(1)}s\n`;
          }
          if (response.tokenUsage) {
            text += `Tokens: ${response.tokenUsage.input} → ${response.tokenUsage.output}`;
            if (response.tokenUsage.reasoning) {
              text += ` (+${response.tokenUsage.reasoning} reasoning)`;
            }
            text += `\n`;
          }
          if (response.cost) {
            text += `Cost: $${response.cost.total.toFixed(6)}`;
            if (response.cost.reasoning) {
              text += ` (+$${response.cost.reasoning.toFixed(6)} reasoning)`;
            }
            text += `\n`;
          }
          text += `\n`;
        }

        // Add reasoning if available
        if (response.reasoning) {
          text += `REASONING:\n${response.reasoning}\n\n`;
        }
      } else if (response.status === 'error') {
        text += `Error: ${response.error || 'An error occurred'}\n\n`;
      } else {
        text += `No response available\n\n`;
      }
      
      text += `${'-'.repeat(50)}\n\n`;
    });
  }

  text += `Generated with ModelCompare\n`;
  
  return text;
}

/**
 * Download a file with the given content and filename
 */
export function downloadFile(content: string, filename: string, mimeType: string = 'text/plain'): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generate a safe filename from the prompt
 */
export function generateSafeFilename(prompt: string, extension: string): string {
  // Take first 50 characters of prompt and make it filename-safe
  const truncatedPrompt = prompt.slice(0, 50).trim();
  const safePrompt = truncatedPrompt
    .replace(/[^a-zA-Z0-9\s]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .toLowerCase();
  
  const timestamp = new Date().toISOString().slice(0, 16).replace(/[T:]/g, '-');
  
  return `model-comparison-${safePrompt || 'export'}-${timestamp}.${extension}`;
}

/**
 * Copy content to clipboard
 */
export async function copyToClipboard(content: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(content);
    return true;
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
}