/*
 * Author: gpt-5-codex
 * Date: 2025-10-19 00:00 UTC
 * PURPOSE: Expose reusable debate prompt parsing utilities so both client and
 *          server can derive base templates, intensity descriptors, and topic
 *          metadata from the canonical markdown source.
 * SRP/DRY check: Pass - Dedicated to parsing debate instructions without mixing
 *                transport or storage responsibilities.
 */

import { replaceTemplatePlaceholders } from "./template-tokens.ts";

export interface DebateTopic {
  id: string;
  title: string;
  proposition: string;
}

export interface DebateFlowTemplates {
  opening?: string;
  rebuttal?: string;
  closing?: string;
}

export interface DebateIntensityDescriptor {
  level: number;
  label: string;
  summary?: string;
  heading: string;
  guidance: string;
  fullText: string;
}

export interface DebateInstructions {
  baseTemplate: string;
  intensities: Record<number, DebateIntensityDescriptor>;
  topics: DebateTopic[];
  templates: DebateFlowTemplates;
}

function splitLines(markdown: string): string[] {
  return markdown.split(/\r?\n/);
}

function findHeadingIndex(lines: string[], pattern: RegExp): number {
  for (let i = 0; i < lines.length; i++) {
    if (pattern.test(lines[i].trim())) {
      return i;
    }
  }
  return -1;
}

function collectCodeFence(lines: string[], startIndex: number): string {
  let inFence = false;
  const buffer: string[] = [];

  for (let i = startIndex; i < lines.length; i++) {
    const raw = lines[i];
    const line = raw.trim();

    if (!inFence) {
      if (line.startsWith("```") || line.startsWith("~~~")) {
        inFence = true;
      }
      continue;
    }

    if (line.startsWith("```") || line.startsWith("~~~")) {
      break;
    }

    buffer.push(raw.replace(/\r?$/, ""));
  }

  return buffer.join("\n").trim();
}

function parseIntensityDescriptor(lines: string[], level: number): DebateIntensityDescriptor | undefined {
  const headingPattern = new RegExp(`^####\\s+Level\\s+${level}\\b`, "i");
  const headingIndex = findHeadingIndex(lines, headingPattern);
  if (headingIndex === -1) {
    return undefined;
  }

  const headingLine = lines[headingIndex].trim().replace(/^####\s+/, "").trim();
  const headingWithoutPrefix = headingLine.replace(new RegExp(`^Level\\s+${level}\\s*-\\s*`, "i"), "").trim();

  let label = headingWithoutPrefix;
  let summary: string | undefined;
  const summaryMatch = headingWithoutPrefix.match(/^(.*?)\s*\((.+)\)$/);
  if (summaryMatch) {
    label = summaryMatch[1].trim();
    summary = summaryMatch[2].trim();
  }

  const guidance = collectCodeFence(lines, headingIndex + 1);
  const fullText = guidance ? `${headingLine}\n${guidance}` : headingLine;

  return {
    level,
    label,
    summary,
    heading: headingLine,
    guidance,
    fullText,
  };
}

function parseTopics(lines: string[]): DebateTopic[] {
  const topics: DebateTopic[] = [];
  let inTopicsSection = false;
  let currentTitle: string | null = null;

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();

    if (!inTopicsSection) {
      if (/^##\s+Debate\s+Topics/i.test(trimmed)) {
        inTopicsSection = true;
      }
      continue;
    }

    if (trimmed.startsWith("## ") && !/^##\s+Debate\s+Topics/i.test(trimmed)) {
      break;
    }

    if (trimmed.startsWith("### ")) {
      currentTitle = trimmed.substring(4).trim();
      continue;
    }

    if (currentTitle && trimmed.startsWith("**Proposition:**")) {
      const proposition = trimmed
        .replace("**Proposition:**", "")
        .trim()
        .replace(/^"|"$/g, "");
      const id = currentTitle.toLowerCase().replace(/[^a-z0-9]/g, "-");
      topics.push({ id, title: currentTitle, proposition });
      currentTitle = null;
    }
  }

  return topics;
}

function parseFlowTemplates(lines: string[]): DebateFlowTemplates {
  const templateHeadingPatterns: Array<{ key: keyof DebateFlowTemplates; pattern: RegExp }> = [
    { key: "opening", pattern: /^###\s+Opening\s+Statement\s+Template/i },
    { key: "rebuttal", pattern: /^###\s+Rebuttal\s+Template/i },
    { key: "closing", pattern: /^###\s+Closing\s+Argument\s+Template/i },
  ];

  const templates: DebateFlowTemplates = {};

  for (const entry of templateHeadingPatterns) {
    const headingIndex = findHeadingIndex(lines, entry.pattern);
    if (headingIndex !== -1) {
      templates[entry.key] = collectCodeFence(lines, headingIndex + 1);
    }
  }

  return templates;
}

export function extractDebateInstructions(markdown: string): DebateInstructions {
  const lines = splitLines(markdown);

  const baseHeadingIndex = findHeadingIndex(lines, /^###\s+Base\s+Debate\s+Instructions/i);
  const baseTemplate = baseHeadingIndex !== -1 ? collectCodeFence(lines, baseHeadingIndex + 1) : "";

  const intensities: Record<number, DebateIntensityDescriptor> = {};
  for (let level = 1; level <= 4; level++) {
    const descriptor = parseIntensityDescriptor(lines, level);
    if (descriptor) {
      intensities[level] = descriptor;
    }
  }

  return {
    baseTemplate,
    intensities,
    topics: parseTopics(lines),
    templates: parseFlowTemplates(lines),
  };
}

export function getDebateIntensityDescriptor(
  instructions: DebateInstructions | null | undefined,
  level: number
): DebateIntensityDescriptor | null {
  if (!instructions) {
    return null;
  }
  return instructions.intensities[level] ?? null;
}

export function formatDebateTemplate(template: string, replacements: Record<string, string>): string {
  return replaceTemplatePlaceholders(template, replacements);
}
