/**
 * Prompt Parser Utility
 * 
 * Parses the compare-prompts.md file to extract prompt categories and templates
 * dynamically, making the prompt system truly modular and extensible.
 * 
 * Author: Cascade Claude 4 Sonnet Thinking
 * Date: August 11, 2025
 */

export interface PromptTemplate {
  id: string;
  name: string;
  content: string;
}

export interface PromptCategory {
  id: string;
  name: string;
  prompts: PromptTemplate[];
}

/**
 * Parses markdown content to extract prompt categories and templates
 */
export async function parsePromptsFromMarkdown(): Promise<PromptCategory[]> {
  try {
    // Fetch the markdown file
    const response = await fetch('/docs/compare-prompts.md');
    if (!response.ok) {
      throw new Error('Failed to fetch compare-prompts.md');
    }
    const markdown = await response.text();
    
    const categories: PromptCategory[] = [];
    const lines = markdown.split('\n');
    
    let currentCategory: PromptCategory | null = null;
    let currentPrompt: PromptTemplate | null = null;
    let collectingContent = false;
    let contentLines: string[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Category header (## Category Name)
      if (line.startsWith('## ') && !line.includes('Author') && !line.includes('Date')) {
        // Save previous prompt if exists
        if (currentPrompt && currentCategory) {
          currentPrompt.content = contentLines.join('\n').trim();
          currentCategory.prompts.push(currentPrompt);
        }
        
        // Save previous category if exists
        if (currentCategory) {
          categories.push(currentCategory);
        }
        
        // Start new category
        const categoryName = line.substring(3).trim();
        currentCategory = {
          id: categoryName.toLowerCase().replace(/[^a-z0-9]/g, '-'),
          name: categoryName,
          prompts: []
        };
        currentPrompt = null;
        collectingContent = false;
        contentLines = [];
      }
      // Prompt header (### Prompt Name)
      else if (line.startsWith('### ') && currentCategory) {
        // Save previous prompt if exists
        if (currentPrompt) {
          currentPrompt.content = contentLines.join('\n').trim();
          currentCategory.prompts.push(currentPrompt);
        }
        
        // Start new prompt
        const promptName = line.substring(4).trim();
        currentPrompt = {
          id: promptName.toLowerCase().replace(/[^a-z0-9]/g, '-'),
          name: promptName,
          content: ''
        };
        collectingContent = true;
        contentLines = [];
      }
      // Content lines
      else if (collectingContent && currentPrompt && line !== '') {
        contentLines.push(line);
      }
      // Empty line - continue collecting if we're in content mode
      else if (collectingContent && line === '') {
        contentLines.push('');
      }
    }
    
    // Save final prompt and category
    if (currentPrompt && currentCategory) {
      currentPrompt.content = contentLines.join('\n').trim();
      currentCategory.prompts.push(currentPrompt);
    }
    if (currentCategory) {
      categories.push(currentCategory);
    }
    
    return categories;
  } catch (error) {
    console.error('Error parsing prompts from markdown:', error);
    return [];
  }
}

/**
 * Get a specific prompt template by category and prompt ID
 */
export function findPromptTemplate(
  categories: PromptCategory[], 
  categoryId: string, 
  promptId: string
): PromptTemplate | null {
  const category = categories.find(cat => cat.id === categoryId);
  if (!category) return null;
  
  return category.prompts.find(prompt => prompt.id === promptId) || null;
}
