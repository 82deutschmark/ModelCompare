/**
 * Vixra Mode Utility Functions
 * 
 * Contains satirical content generation and variable utilities for Vixra mode.
 * Extracted from the complex workflow system to be more maintainable and reusable.
 * 
 * Author: Claude Code
 * Date: August 18, 2025
 */

/**
 * Auto-generate missing user variables with satirical academic content.
 * This is the core feature that makes Vixra mode fun - it generates 
 * hilarious academic-sounding names, titles, and institutions when 
 * the user leaves fields blank.
 */
export function autoGenerateVariables(
  userVariables: Record<string, string>,
  scienceCategory: string
): Record<string, string> {
  const generated = { ...userVariables };
  
  // Auto-generate Title if not provided
  if (!generated.Title || generated.Title.trim() === '') {
    const titlePrefixes = [
      'Revolutionary Breakthrough in',
      'Quantum Insights into',
      'Advanced Theoretical Framework for',
      'Pioneering Discovery of',
      'Fundamental Principles of',
      'Novel Approach to',
      'Unprecedented Analysis of',
      'Groundbreaking Study on'
    ];
    
    const subjects: Record<string, string[]> = {
      'Physics - Quantum Physics': ['Quantum Coffee Dynamics', 'Subatomic Breakfast Particles', 'Wave-Particle Sandwich Duality'],
      'Mathematics - General Mathematics': ['Infinite Pizza Division', 'The Mathematics of Sock Disappearance', 'Algebraic Relationship Between Cats and Physics'],
      'Biology - Mind Science': ['Telepathic Plant Communication', 'The Consciousness of Kitchen Appliances', 'Quantum Entanglement in Pet Behavior'],
      'Computational Science - Artificial Intelligence': ['AI-Powered Toaster Intelligence', 'Machine Learning for Predicting Netflix Choices', 'Neural Networks in Garden Gnomes'],
      'Chemistry': ['Molecular Structure of Happiness', 'Chemical Analysis of Monday Morning Blues', 'Catalytic Properties of Procrastination'],
      'General Science and Philosophy': ['Universal Background Radiation', 'Cosmic String Theory', 'Dimensional Phase Transitions'],
      'default': ['Universal Background Radiation', 'Cosmic String Theory', 'Dimensional Phase Transitions']
    };
    
    const categorySubjects = subjects[scienceCategory] || subjects['default'];
    const prefix = titlePrefixes[Math.floor(Math.random() * titlePrefixes.length)];
    const subject = categorySubjects[Math.floor(Math.random() * categorySubjects.length)];
    
    generated.Title = `${prefix} ${subject}`;
  }
  
  // Auto-generate ResearcherName if not provided
  if (!generated.ResearcherName || generated.ResearcherName.trim() === '') {
    const firstNames = ['Dr. Quantum', 'Prof. Cosmic', 'Dr. Infinite', 'Prof. Ethereal', 'Dr. Mystical'];
    const lastNames = ['Pseudoscience', 'Paradigm', 'Breakthrough', 'Discovery', 'Revolution'];
    generated.ResearcherName = `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;
  }
  
  // Auto-generate Authors if not provided
  if (!generated.Authors || generated.Authors.trim() === '') {
    generated.Authors = `${generated.ResearcherName}, Independent Researcher`;
  }
  
  // Auto-generate Institution if not provided
  if (!generated.Institution || generated.Institution.trim() === '') {
    const institutions = [
      'Institute for Advanced Pseudoscience',
      'University of Cosmic Awareness',
      'Academy of Quantum Enlightenment',
      'Center for Metaphysical Research',
      'Institute of Theoretical Everything'
    ];
    generated.Institution = institutions[Math.floor(Math.random() * institutions.length)];
  }
  
  // Auto-generate Keywords if not provided
  if (!generated.Keywords || generated.Keywords.trim() === '') {
    generated.Keywords = 'quantum, consciousness, paradigm shift, breakthrough, revolutionary';
  }
  
  // Auto-generate Methodology if not provided
  if (!generated.Methodology || generated.Methodology.trim() === '') {
    const methodologies = [
      'quantum consciousness measurement',
      'interdimensional analysis',
      'cosmic resonance testing',
      'metaphysical data collection',
      'paradigmatic observation'
    ];
    generated.Methodology = methodologies[Math.floor(Math.random() * methodologies.length)];
  }
  
  // Auto-generate Funding if not provided
  if (!generated.Funding || generated.Funding.trim() === '') {
    const funders = [
      'Cosmic Enlightenment Foundation',
      'Institute for Paradigm Shifting',
      'Universal Consciousness Grant',
      'Quantum Awareness Fund',
      'Interdimensional Research Council'
    ];
    generated.Funding = funders[Math.floor(Math.random() * funders.length)];
  }
  
  return generated;
}

/**
 * Generate missing variables using LLM while respecting user input.
 * This is the core feature that makes Vixra mode fun - it generates 
 * hilarious academic-sounding names, titles, and institutions when 
 * the user leaves fields blank, but never overwrites user input.
 */
export async function generateMissingVariables(
  userVariables: Record<string, string>,
  promptTemplates: Map<string, string>
): Promise<Record<string, string>> {
  const result = { ...userVariables };
  
  // Only generate if user hasn't provided value
  if (!result.Title?.trim() && result.ScienceCategory) {
    result.Title = await generateSingleVariable(
      'generate-title', 
      { ScienceCategory: result.ScienceCategory }, 
      promptTemplates
    );
  }
  
  if (!result.Author?.trim()) {
    result.Author = await generateSingleVariable('generate-author', {}, promptTemplates);
  }
  
  return result;
}

/**
 * Generate a single variable using LLM
 */
async function generateSingleVariable(
  templateId: string, 
  variables: Record<string, string>,
  templates: Map<string, string>
): Promise<string> {
  const template = templates.get(templateId);
  if (!template) return '';
  
  const prompt = substituteVariables(template, variables);
  
  // Use same pattern as section generation
  try {
    const { apiRequest } = await import('@/lib/queryClient');
    const response = await apiRequest('POST', '/api/models/respond', {
      modelId: 'gpt-4o-mini', // Fast, cheap model for variables
      prompt
    });
    
    const data = await response.json();
    return data.content?.trim() || '';
  } catch (error) {
    console.error('Variable generation failed:', error);
    return ''; // Return empty - don't overwrite with fallback
  }
}

/**
 * Simple variable substitution for templates.
 * Replaces {variableName} placeholders with actual values.
 */
export function substituteVariables(
  template: string, 
  variables: Record<string, string>
): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    const placeholder = `{${key}}`;
    result = result.replaceAll(placeholder, value || '');
  }
  return result;
}

/**
 * Parse section templates from markdown with section markers.
 * Extracts templates between <!-- SECTION_START:id --> and <!-- SECTION_END:id --> markers.
 */
export function parseVixraTemplates(markdownContent: string): Map<string, string> {
  const templates = new Map<string, string>();
  const sectionRegex = /<!-- SECTION_START:(\w+) -->(.*?)<!-- SECTION_END:\1 -->/gs;
  
  let match;
  while ((match = sectionRegex.exec(markdownContent)) !== null) {
    const [, sectionId, content] = match;
    templates.set(sectionId, content.trim());
  }
  
  return templates;
}

/**
 * Export Vixra sections as a properly formatted academic paper
 */
export function exportVixraPaper(
  variables: Record<string, string>,
  sectionResponses: Record<string, any>,
  selectedModels: any[]
): string {
  const timestamp = new Date();
  
  // Auto-generate variables to ensure we have all needed fields
  const autoGeneratedVars = autoGenerateVariables(variables, variables.ScienceCategory || '');
  
  // Start with the paper header using auto-generated variables
  let paper = `# ${autoGeneratedVars.Title}\n\n`;
  paper += `**Authors:** ${autoGeneratedVars.Authors}\n\n`;
  
  if (autoGeneratedVars.Institution) {
    paper += `**Institution:** ${autoGeneratedVars.Institution}\n\n`;
  }
  
  paper += `**Science Category:** ${autoGeneratedVars.ScienceCategory}\n\n`;
  paper += `**Generated:** ${timestamp.toLocaleString()}\n\n`;
  paper += `---\n\n`;

  // Define the paper structure in order
  const PAPER_SECTIONS = [
    { id: 'abstract', title: 'Abstract' },
    { id: 'introduction', title: 'Introduction' },
    { id: 'methodology', title: 'Methodology' },
    { id: 'results', title: 'Results' },
    { id: 'discussion', title: 'Discussion' },
    { id: 'conclusion', title: 'Conclusion' },
    { id: 'citations', title: 'References' },
    { id: 'acknowledgments', title: 'Acknowledgments' },
    { id: 'peer-review', title: 'Peer Review Response' }
  ];

  // Add each section that has been generated
  for (const section of PAPER_SECTIONS) {
    const sectionModelResponses = sectionResponses[section.id];
    if (sectionModelResponses && Object.keys(sectionModelResponses).length > 0) {
      paper += `## ${section.title}\n\n`;
      
      // If multiple models generated this section, show all responses
      const modelIds = Object.keys(sectionModelResponses);
      if (modelIds.length === 1) {
        // Single model - just show the content
        const response = sectionModelResponses[modelIds[0]];
        paper += `${response.content}\n\n`;
      } else {
        // Multiple models - show each with model attribution
        modelIds.forEach((modelId, index) => {
          const response = sectionModelResponses[modelId];
          const model = selectedModels.find(m => m.id === modelId);
          const modelName = model ? model.name : modelId;
          
          if (index > 0) paper += `\n---\n\n`;
          paper += `**${modelName} Response:**\n\n`;
          paper += `${response.content}\n\n`;
        });
      }
      
      paper += `---\n\n`;
    }
  }

  // Add generation metadata
  paper += `## Generation Metadata\n\n`;
  paper += `**Generated using AI models:**\n`;
  selectedModels.forEach(model => {
    paper += `- ${model.name} (${model.provider})\n`;
  });
  const completedSections = Object.keys(sectionResponses).filter(sectionId => 
    sectionResponses[sectionId] && Object.keys(sectionResponses[sectionId]).length > 0
  ).length;
  paper += `\n**Total sections generated:** ${completedSections}\n\n`;
  
  // Add variable summary
  paper += `**Paper variables:**\n`;
  Object.entries(autoGeneratedVars).forEach(([key, value]) => {
    if (value && value.trim() !== '') {
      paper += `- ${key}: ${value}\n`;
    }
  });

  paper += `\n*This satirical academic paper was generated using the Vixra Mode of the AI Model Comparison Tool.*\n`;

  return paper;
}

/**
 * Download the generated paper as a markdown file
 */
export function downloadVixraPaper(
  variables: Record<string, string>,
  sectionResponses: Record<string, any>,
  selectedModels: any[]
): void {
  const paperContent = exportVixraPaper(variables, sectionResponses, selectedModels);
  
  // Create a safe filename
  const title = variables.Title || 'vixra-paper';
  const safeTitle = title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  const timestamp = new Date().toISOString().slice(0, 10);
  const filename = `${safeTitle}_${timestamp}.md`;
  
  // Create and download the file
  const blob = new Blob([paperContent], { type: 'text/markdown' });
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
 * Copy the generated paper to clipboard
 */
export async function copyVixraPaper(
  variables: Record<string, string>,
  sectionResponses: Record<string, any>,
  selectedModels: any[]
): Promise<void> {
  const paperContent = exportVixraPaper(variables, sectionResponses, selectedModels);
  await navigator.clipboard.writeText(paperContent);
}

/**
 * Export paper as PDF using browser print functionality
 */
export function printVixraPaper(
  variables: Record<string, string>,
  sectionResponses: Record<string, any>,
  selectedModels: any[]
): void {
  const paperContent = exportVixraPaper(variables, sectionResponses, selectedModels);
  
  // Create a new window with the paper content formatted for printing
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    throw new Error('Could not open print window');
  }

  // Convert markdown to basic HTML for better printing
  const htmlContent = paperContent
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^\*\*(.+)\*\*$/gm, '<strong>$1</strong>')
    .replace(/^\*\*(.+):\*\* (.+)$/gm, '<strong>$1:</strong> $2')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/^---$/gm, '<hr>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>')
    .replace(/(<li>.*?<\/li>)/gs, '<ul>$1</ul>') // Wrap list items in ul tags
    .replace(/^/, '<p>') // Start with paragraph
    .replace(/$/, '</p>'); // End with paragraph

  // Create a proper title - use the actual paper title from content, not variables
  const titleMatch = paperContent.match(/^# (.+)$/m);
  const documentTitle = titleMatch ? titleMatch[1] : 'Vixra Research Paper';

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${documentTitle}</title>
        <style>
          body {
            font-family: 'Times New Roman', serif;
            line-height: 1.6;
            max-width: 800px;
            margin: 20px auto;
            padding: 20px;
            color: #000;
          }
          h1 {
            text-align: center;
            border-bottom: 2px solid #333;
            padding-bottom: 10px;
            margin-bottom: 30px;
            margin-top: 0;
          }
          h2 {
            color: #333;
            margin-top: 30px;
            margin-bottom: 15px;
            border-bottom: 1px solid #666;
            padding-bottom: 5px;
          }
          hr {
            border: none;
            border-top: 1px solid #ccc;
            margin: 20px 0;
          }
          ul {
            margin: 10px 0;
            padding-left: 20px;
          }
          li {
            margin: 5px 0;
          }
          p {
            margin: 10px 0;
          }
          @media print {
            body {
              margin: 0;
              padding: 15mm;
            }
            @page {
              margin: 20mm;
              size: A4;
              @top-center {
                content: none;
              }
              @top-left {
                content: none;
              }
              @top-right {
                content: none;
              }
              @bottom-center {
                content: counter(page);
              }
            }
            h1:first-of-type {
              page-break-before: avoid;
              margin-top: 0;
            }
          }
        </style>
      </head>
      <body>
        ${htmlContent}
      </body>
    </html>
  `);

  printWindow.document.close();
  
  // Wait for content to load then print
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 250);
}