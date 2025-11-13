/**
 * Author: Cascade (GPT-5)
 * Date: 2025-11-05 14:05 UTC-05:00
 * PURPOSE: Centralizes Plan Assessment domain metadata, including option lists,
 *          defaults, and helper utilities for aligning UI and prompts across
 *          software plan and academic manuscript reviews.
 * SRP/DRY check: Pass - Encapsulates domain-specific config without duplicating
 *                option arrays across components.
 */

export type AssessmentDomain = 'software-plan' | 'academic-paper';

export interface DomainOption {
  value: string;
  label: string;
  description?: string;
}

export interface DomainMetadata {
  label: string;
  criteriaLabel: string;
  scaleLabel: string;
  planPlaceholder: string;
  contextPlaceholder: string;
}

export interface DomainDefaults {
  assessmentCriteria: string;
  projectScale: string;
}

export const ASSESSMENT_DOMAIN_OPTIONS: DomainOption[] = [
  {
    value: 'software-plan',
    label: 'Software Plan',
    description: 'Product or engineering initiative scoped for delivery teams.',
  },
  {
    value: 'academic-paper',
    label: 'Academic Paper',
    description: 'Scholarly manuscript, thesis chapter, or research article.',
  },
];

const SOFTWARE_CRITERIA_OPTIONS: DomainOption[] = [
  { value: 'overall', label: 'Overall' },
  { value: 'architecture', label: 'Architecture' },
  { value: 'requirements', label: 'Requirements' },
  { value: 'risk', label: 'Risk' },
  { value: 'delivery', label: 'Delivery' },
  { value: 'security', label: 'Security' },
  { value: 'operations', label: 'Operations' },
];

const ACADEMIC_CRITERIA_OPTIONS: DomainOption[] = [
  { value: 'overall', label: 'Overall' },
  { value: 'structure', label: 'Structure' },
  { value: 'methodology', label: 'Methodology' },
  { value: 'evidence', label: 'Evidence & Citations' },
  { value: 'novelty', label: 'Novelty' },
  { value: 'clarity', label: 'Clarity' },
  { value: 'publication-readiness', label: 'Publication Readiness' },
];

const SOFTWARE_SCALE_OPTIONS: DomainOption[] = [
  { value: 'hobby', label: 'Hobby' },
  { value: 'indie', label: 'Indie' },
  { value: 'startup', label: 'Startup' },
  { value: 'enterprise', label: 'Enterprise' },
];

const ACADEMIC_SCALE_OPTIONS: DomainOption[] = [
  { value: 'coursework', label: 'Coursework' },
  { value: 'undergraduate', label: 'Undergraduate Thesis' },
  { value: 'graduate', label: 'Graduate Thesis' },
  { value: 'conference', label: 'Conference Submission' },
  { value: 'journal', label: 'Journal Submission' },
];

export const PLAN_ASSESSMENT_DOMAIN_METADATA: Record<AssessmentDomain, DomainMetadata> = {
  'software-plan': {
    label: 'Software Plan',
    criteriaLabel: 'Assessment Criteria',
    scaleLabel: 'Project Scale',
    planPlaceholder: 'Paste your software plan content here for assessment...',
    contextPlaceholder: "Any specific instructions? e.g., 'Focus on security vulnerabilities'",
  },
  'academic-paper': {
    label: 'Academic Paper',
    criteriaLabel: 'Evaluation Lens',
    scaleLabel: 'Publication Context',
    planPlaceholder: 'Paste your manuscript, chapter, or paper draft here for review...',
    contextPlaceholder: "Provide research focus or constraints? e.g., 'Double-check methodology validity'",
  },
};

export const PLAN_ASSESSMENT_DOMAIN_DEFAULTS: Record<AssessmentDomain, DomainDefaults> = {
  'software-plan': {
    assessmentCriteria: 'overall',
    projectScale: 'startup',
  },
  'academic-paper': {
    assessmentCriteria: 'overall',
    projectScale: 'conference',
  },
};

export function getCriteriaOptionsForDomain(domain: AssessmentDomain): DomainOption[] {
  return domain === 'academic-paper' ? ACADEMIC_CRITERIA_OPTIONS : SOFTWARE_CRITERIA_OPTIONS;
}

export function getProjectScaleOptionsForDomain(domain: AssessmentDomain): DomainOption[] {
  return domain === 'academic-paper' ? ACADEMIC_SCALE_OPTIONS : SOFTWARE_SCALE_OPTIONS;
}

export function getCriteriaValuesForDomain(domain: AssessmentDomain): string[] {
  return getCriteriaOptionsForDomain(domain).map((option) => option.value);
}

export function getProjectScaleValuesForDomain(domain: AssessmentDomain): string[] {
  return getProjectScaleOptionsForDomain(domain).map((option) => option.value);
}
