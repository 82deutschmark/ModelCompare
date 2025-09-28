/**
 *
 * Author: Codex using GPT-5
 * Date: 2025-09-28T11:29:14-04:00
 * PURPOSE: Browser-side utilities for Vixra mode covering variable preparation, template parsing, and export helpers while integrating with the shared model response API.
 * SRP/DRY check: Pass - Centralizes Vixra helper routines reused by the page without duplicating workflow logic present elsewhere.
 * shadcn/ui: Pass - Pure utility module with no UI rendering; UI components continue to come from shadcn/ui.
 */

import { apiRequest } from "@/lib/queryClient";
import type { AIModel, ModelResponse } from "@/types/ai-models";

export type VixraVariables = Record<string, string>;
export type VixraSectionResponses = Record<string, Record<string, ModelResponse>>;

const DEFAULT_CATEGORY = "General Science and Philosophy";
const TITLE_PREFIXES = [
  "Revolutionary Breakthrough in",
  "Quantum Insights into",
  "Advanced Theoretical Framework for",
  "Pioneering Discovery of",
  "Fundamental Principles of",
  "Novel Approach to",
  "Unprecedented Analysis of",
  "Groundbreaking Study on"
] as const;

const CATEGORY_THEMES: Record<string, readonly string[]> = {
  physics: [
    "Quantum Coffee Dynamics",
    "Subatomic Breakfast Particles",
    "Wave-Particle Sandwich Duality",
    "Antigravity Sock Containment",
    "Hyperdimensional Bowling Mechanics"
  ],
  mathematics: [
    "Infinite Pizza Division",
    "Topology of Lost Keys",
    "Algebraic Cat Whispering",
    "Prime Number Tea Leaves",
    "Tensor Calculus of Naps"
  ],
  biology: [
    "Telepathic Plant Communication",
    "Quantum Entanglement in Pet Behavior",
    "Mitochondrial Aura Harmonization",
    "Symbiotic Dream Circuits",
    "Biofeedback of Dragon Fruit"
  ],
  computational: [
    "AI-Powered Toaster Intelligence",
    "Neural Networks in Garden Gnomes",
    "Blockchain for Laundry Folding",
    "Quantum-Resistant Origami Algorithms",
    "Latent Space Karaoke Optimization"
  ],
  chemistry: [
    "Molecular Structure of Happiness",
    "Catalytic Properties of Procrastination",
    "Isomerization of Midnight Snacks",
    "Thermodynamics of Glitter",
    "Polymerization of Bubble Thoughts"
  ],
  humanities: [
    "Semiotics of Sneezing",
    "Existential Taxonomy of Coffee Stains",
    "Mythopoetic Elevator Speeches",
    "Post-Structuralist Cat Videos",
    "Phenomenology of Left Socks"
  ],
  general: [
    "Universal Background Radiation",
    "Cosmic String Theory",
    "Dimensional Phase Transitions",
    "Metaphysics of Breakfast Cereals",
    "Epistemology of Moonlight"
  ]
};

const AUTHOR_TITLES = ["Dr.", "Prof.", "Prof. Dr.", "Sir", "Dame", "Arch-Researcher"] as const;
const AUTHOR_FIRST_NAMES = [
  "Quantum",
  "Cosmic",
  "Infinite",
  "Ethereal",
  "Mystical",
  "Planck",
  "Tensor",
  "Aurora"
] as const;
const AUTHOR_LAST_NAMES = [
  "Pseudoscience",
  "Paradigm",
  "Breakthrough",
  "Discovery",
  "Revolution",
  "Singularity",
  "Eigenvector",
  "Flux"
] as const;

const INSTITUTIONS = [
  "Institute for Advanced Pseudoscience",
  "University of Cosmic Awareness",
  "Academy of Quantum Enlightenment",
  "Center for Metaphysical Research",
  "Institute of Theoretical Everything"
] as const;

const FUNDING_SOURCES = [
  "Cosmic Enlightenment Foundation",
  "Institute for Paradigm Shifting",
  "Universal Consciousness Grant",
  "Quantum Awareness Fund",
  "Interdimensional Research Council"
] as const;

const METHODOLOGIES = [
  "quantum consciousness measurement",
  "interdimensional analysis",
  "cosmic resonance testing",
  "metaphysical data collection",
  "paradigmatic observation"
] as const;

const DEFAULT_KEYWORDS = "quantum, consciousness, paradigm shift, breakthrough, revolutionary";

const VARIABLE_PROMPTS = {
  title: "generate-title",
  author: "generate-author"
} as const;

type VariablePromptKey = keyof typeof VARIABLE_PROMPTS;

function hasValue(value: string | undefined | null): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function pickRandom<T>(items: readonly T[], fallback: T): T {
  if (items.length === 0) {
    return fallback;
  }
  const index = Math.floor(Math.random() * items.length);
  return items[index] ?? fallback;
}

function resolveCategoryKey(scienceCategory: string): keyof typeof CATEGORY_THEMES {
  const normalized = scienceCategory.toLowerCase();
  if (normalized.includes("physics")) return "physics";
  if (normalized.includes("math")) return "mathematics";
  if (normalized.includes("biology") || normalized.includes("bio")) return "biology";
  if (normalized.includes("compute") || normalized.includes("ai") || normalized.includes("algorithm")) {
    return "computational";
  }
  if (normalized.includes("chem")) return "chemistry";
  if (normalized.includes("humanities") || normalized.includes("philosophy") || normalized.includes("religion")) {
    return "humanities";
  }
  return "general";
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Fill in any missing satirical variables without touching user-provided fields.
 */
export function autoGenerateVariables(
  userVariables: VixraVariables,
  scienceCategory: string
): VixraVariables {
  const normalizedCategory = hasValue(scienceCategory) ? scienceCategory : DEFAULT_CATEGORY;
  const result: VixraVariables = { ...userVariables };
  result.ScienceCategory = normalizedCategory;

  if (!hasValue(result.Title)) {
    const categoryKey = resolveCategoryKey(normalizedCategory);
    const subject = pickRandom(CATEGORY_THEMES[categoryKey], CATEGORY_THEMES.general[0]);
    const prefix = pickRandom(TITLE_PREFIXES, TITLE_PREFIXES[0]);
    result.Title = `${prefix} ${subject}`;
  }

  if (!hasValue(result.Author)) {
    const title = pickRandom(AUTHOR_TITLES, AUTHOR_TITLES[0]);
    const firstName = pickRandom(AUTHOR_FIRST_NAMES, AUTHOR_FIRST_NAMES[0]);
    const lastName = pickRandom(AUTHOR_LAST_NAMES, AUTHOR_LAST_NAMES[0]);
    result.Author = `${title} ${firstName} ${lastName}`;
  }

  if (!hasValue(result.ResearcherName)) {
    result.ResearcherName = result.Author!;
  }

  if (!hasValue(result.Authors)) {
    result.Authors = result.Author!;
  }

  if (!hasValue(result.Institution)) {
    result.Institution = pickRandom(INSTITUTIONS, INSTITUTIONS[0]);
  }

  if (!hasValue(result.Methodology)) {
    result.Methodology = pickRandom(METHODOLOGIES, METHODOLOGIES[0]);
  }

  if (!hasValue(result.Funding)) {
    result.Funding = pickRandom(FUNDING_SOURCES, FUNDING_SOURCES[0]);
  }

  if (!hasValue(result.Keywords)) {
    result.Keywords = DEFAULT_KEYWORDS;
  }

  return result;
}

/**
 * Generate missing variables by calling the shared model response API while preserving user input.
 */
export async function generateMissingVariables(
  userVariables: VixraVariables,
  promptTemplates: Map<string, string>
): Promise<VixraVariables> {
  const fallback = autoGenerateVariables(userVariables, userVariables.ScienceCategory || DEFAULT_CATEGORY);
  const result: VixraVariables = { ...fallback, ...userVariables };

  const shouldGenerateTitle = !hasValue(userVariables.Title) && promptTemplates.has(VARIABLE_PROMPTS.title);
  if (shouldGenerateTitle) {
    const generatedTitle = await generateSingleVariable(
      VARIABLE_PROMPTS.title,
      { ScienceCategory: result.ScienceCategory || DEFAULT_CATEGORY },
      promptTemplates
    );
    if (hasValue(generatedTitle)) {
      result.Title = generatedTitle;
    }
  }

  const shouldGenerateAuthor = !hasValue(userVariables.Author) && promptTemplates.has(VARIABLE_PROMPTS.author);
  if (shouldGenerateAuthor) {
    const generatedAuthor = await generateSingleVariable(VARIABLE_PROMPTS.author, {}, promptTemplates);
    if (hasValue(generatedAuthor)) {
      result.Author = generatedAuthor;
      result.ResearcherName = generatedAuthor;
      result.Authors = generatedAuthor;
    }
  }

  if (!hasValue(result.ResearcherName)) {
    result.ResearcherName = result.Author || fallback.Author || "Anonymous Research Collective";
  }

  if (!hasValue(result.Authors)) {
    result.Authors = result.Author || result.ResearcherName;
  }

  return result;
}

async function generateSingleVariable(
  templateId: (typeof VARIABLE_PROMPTS)[VariablePromptKey],
  variables: VixraVariables,
  templates: Map<string, string>
): Promise<string> {
  const template = templates.get(templateId);
  if (!template) {
    return "";
  }

  const prompt = substituteVariables(template, variables);

  try {
    const response = await apiRequest("POST", "/api/models/respond", {
      modelId: "gpt-4o-mini",
      prompt
    });

    const data = (await response.json()) as Partial<ModelResponse>;
    const content = typeof data.content === "string" ? data.content.trim() : "";
    return content;
  } catch (error) {
    console.error("Variable generation failed", { templateId, error });
    return "";
  }
}

/**
 * Replace {variable} placeholders within template strings using provided values.
 */
export function substituteVariables(
  template: string,
  variables: VixraVariables
): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    if (!key) continue;
    const replacement = hasValue(value) ? value : "";
    const pattern = new RegExp(`\\{${escapeRegExp(key)}\\}`, "g");
    result = result.replace(pattern, replacement);
  }
  return result;
}

/**
 * Extract section templates delimited by <!-- SECTION_START:id --> markers.
 */
export function parseVixraTemplates(markdownContent: string): Map<string, string> {
  const templates = new Map<string, string>();
  const sectionRegex = /<!-- SECTION_START:(\w+) -->([\s\S]*?)<!-- SECTION_END:\1 -->/g;

  let match: RegExpExecArray | null;
  while ((match = sectionRegex.exec(markdownContent)) !== null) {
    const [, sectionId, content] = match;
    templates.set(sectionId, content.trim());
  }

  return templates;
}

const PAPER_SECTIONS: Array<{ id: string; title: string }> = [
  { id: "abstract", title: "Abstract" },
  { id: "introduction", title: "Introduction" },
  { id: "methodology", title: "Methodology" },
  { id: "results", title: "Results" },
  { id: "discussion", title: "Discussion" },
  { id: "conclusion", title: "Conclusion" },
  { id: "citations", title: "References" },
  { id: "acknowledgments", title: "Acknowledgments" },
  { id: "peer-review", title: "Peer Review Response" }
];

/**
 * Assemble a markdown representation of the generated paper.
 */
export function exportVixraPaper(
  variables: VixraVariables,
  sectionResponses: VixraSectionResponses,
  selectedModels: AIModel[]
): string {
  const timestamp = new Date();
  const completedVariables = autoGenerateVariables(variables, variables.ScienceCategory || DEFAULT_CATEGORY);

  const paperTitle = completedVariables.Title || "Untitled Satirical Paper";
  const authorLine = completedVariables.Authors || completedVariables.Author || completedVariables.ResearcherName || "Anonymous Research Collective";

  let paper = `# ${paperTitle}\n\n`;
  paper += `**Authors:** ${authorLine}\n\n`;

  if (hasValue(completedVariables.Institution)) {
    paper += `**Institution:** ${completedVariables.Institution}\n\n`;
  }

  paper += `**Science Category:** ${completedVariables.ScienceCategory}\n\n`;
  paper += `**Generated:** ${timestamp.toLocaleString()}\n\n`;
  paper += `---\n\n`;

  for (const section of PAPER_SECTIONS) {
    const modelResponses = sectionResponses[section.id];
    const modelIds = modelResponses ? Object.keys(modelResponses) : [];
    if (!modelResponses || modelIds.length === 0) {
      continue;
    }

    paper += `## ${section.title}\n\n`;

    if (modelIds.length === 1) {
      const response = modelResponses[modelIds[0]];
      if (response?.content) {
        paper += `${response.content}\n\n`;
      }
    } else {
      modelIds.forEach((modelId, index) => {
        const response = modelResponses[modelId];
        const model = selectedModels.find(item => item.id === modelId);
        const modelName = model ? `${model.name} (${model.provider})` : modelId;
        if (index > 0) {
          paper += `\n---\n\n`;
        }
        paper += `**${modelName} Response:**\n\n`;
        if (response?.content) {
          paper += `${response.content}\n\n`;
        }
      });
    }

    paper += `---\n\n`;
  }

  paper += `## Generation Metadata\n\n`;
  if (selectedModels.length > 0) {
    paper += `**Generated using AI models:**\n`;
    selectedModels.forEach(model => {
      paper += `- ${model.name} (${model.provider})\n`;
    });
    paper += "\n";
  }

  const generatedSectionCount = Object.values(sectionResponses).reduce((count, responses) => {
    if (responses && Object.keys(responses).length > 0) {
      return count + 1;
    }
    return count;
  }, 0);

  paper += `**Total sections generated:** ${generatedSectionCount}\n\n`;
  paper += `**Paper variables:**\n`;
  Object.entries(completedVariables).forEach(([key, value]) => {
    if (hasValue(value)) {
      paper += `- ${key}: ${value}\n`;
    }
  });

  paper += "\n*This satirical academic paper was generated using the Vixra Mode of the AI Model Comparison Tool.*\n";

  return paper;
}

/**
 * Download the generated paper as a markdown file.
 */
export function downloadVixraPaper(
  variables: VixraVariables,
  sectionResponses: VixraSectionResponses,
  selectedModels: AIModel[]
): void {
  const paperContent = exportVixraPaper(variables, sectionResponses, selectedModels);
  const title = hasValue(variables.Title) ? variables.Title! : "vixra-paper";
  const safeTitle = title.replace(/[^a-z0-9-_]/gi, "_").toLowerCase();
  const timestamp = new Date().toISOString().slice(0, 10);
  const filename = `${safeTitle}_${timestamp}.md`;

  const blob = new Blob([paperContent], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Copy the generated paper to the user clipboard.
 */
export async function copyVixraPaper(
  variables: VixraVariables,
  sectionResponses: VixraSectionResponses,
  selectedModels: AIModel[]
): Promise<void> {
  const paperContent = exportVixraPaper(variables, sectionResponses, selectedModels);
  await navigator.clipboard.writeText(paperContent);
}

/**
 * Open a print dialog to export the paper as PDF via the browser.
 */
export function printVixraPaper(
  variables: VixraVariables,
  sectionResponses: VixraSectionResponses,
  selectedModels: AIModel[]
): void {
  if (typeof window === "undefined") {
    throw new Error("printVixraPaper is only available in the browser");
  }

  const paperContent = exportVixraPaper(variables, sectionResponses, selectedModels);
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    throw new Error("Could not open print window");
  }

  const documentTitle = extractTitleFromMarkdown(paperContent) || "Vixra Research Paper";
  const htmlBody = convertMarkdownToPrintHtml(paperContent);

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${documentTitle}</title>
        <meta charset="utf-8" />
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
            h1:first-of-type {
              page-break-before: avoid;
              margin-top: 0;
            }
          }
        </style>
      </head>
      <body>
        ${htmlBody}
      </body>
    </html>
  `);

  printWindow.document.close();
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 250);
}

function extractTitleFromMarkdown(markdown: string): string | null {
  const match = markdown.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : null;
}

function convertMarkdownToPrintHtml(markdown: string): string {
  let html = markdown;
  html = html.replace(/^# (.+)$/gm, "<h1>$1</h1>");
  html = html.replace(/^## (.+)$/gm, "<h2>$1</h2>");
  html = html.replace(/^\*\*(.+?):\*\* (.+)$/gm, "<p><strong>$1:</strong> $2</p>");
  html = html.replace(/^\*\*(.+)\*\*$/gm, "<p><strong>$1</strong></p>");
  html = html.replace(/^---$/gm, "<hr />");
  html = html.replace(/^- (.+)$/gm, "<li>$1</li>");
  html = html.replace(/\n{2,}/g, "</p><p>");
  html = html.replace(/\n/g, "<br />");
  html = wrapListBlocks(html);
  html = `<p>${html}</p>`;
  return html;
}

function wrapListBlocks(html: string): string {
  return html.replace(/(?:<li>[\s\S]*?<\/li>\s*)+/g, match => `<ul>${match}</ul>`);
}
