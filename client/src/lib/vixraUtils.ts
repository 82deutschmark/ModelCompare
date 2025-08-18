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