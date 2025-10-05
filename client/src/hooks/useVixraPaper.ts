/**
 * Author: Cascade using Claude Sonnet 4
 * Date: 2025-10-04
 * PURPOSE: Custom hook for Vixra paper state management.
 *          Centralizes paper configuration, model selection, generation mode,
 *          section tracking, and progress calculation.
 *          Implements smart defaults (Dr. Max Power, General Science, gpt-5-nano, auto-mode).
 * SRP/DRY check: Pass - Single responsibility (Vixra state management)
 * shadcn/ui: N/A - Pure state management hook
 */

import { useState, useCallback } from "react";
import type { Section } from "@/components/vixra/SectionProgressTracker";
import { 
  SECTION_ORDER, 
  SCIENCE_CATEGORIES, 
  getRandomCategory,
  getNextEligibleSection,
  calculateEstimatedTime,
  countWords
} from "@/lib/vixraUtils";

// Smart defaults
const DEFAULT_AUTHOR = "Dr. Max Power";
const DEFAULT_CATEGORY = "General Science and Philosophy";
const DEFAULT_MODEL = "gpt-5-nano-2025-08-07";
const DEFAULT_MODE = "auto";

export interface PaperConfig {
  author: string;
  scienceCategory: string;
  title: string;
}

export interface VixraPaperState {
  paperConfig: PaperConfig;
  selectedModel: string;
  generationMode: 'manual' | 'auto';
  isGenerating: boolean;
  sections: Section[];
  currentSectionId: string | null;
  progress: {
    completed: number;
    total: number;
    estimatedTimeRemaining: number;
  };
}

export interface VixraPaperActions {
  // Paper config
  updateAuthor: (author: string) => void;
  updateCategory: (category: string) => void;
  randomizeCategory: () => void;
  updateTitle: (title: string) => void;
  
  // Model selection
  selectModel: (modelId: string) => void;
  
  // Mode control
  setGenerationMode: (mode: 'manual' | 'auto') => void;
  
  // Generation control
  setIsGenerating: (isGenerating: boolean) => void;
  setCurrentSectionId: (sectionId: string | null) => void;
  
  // Section management
  updateSectionStatus: (sectionId: string, status: Section['status'], content?: string, metadata?: Section['metadata']) => void;
  getSectionById: (sectionId: string) => Section | undefined;
  getCompletedSectionIds: () => string[];
  
  // Navigation
  scrollToSection: (sectionId: string) => void;
  
  // Reset
  resetPaper: () => void;
}

/**
 * Custom hook for managing Vixra paper generation state.
 */
export function useVixraPaper() {
  // Initialize sections from SECTION_ORDER
  const initialSections: Section[] = SECTION_ORDER.map(section => ({
    id: section.id,
    name: section.name,
    status: section.dependencies.length === 0 ? 'pending' : 'locked',
    dependencies: [...section.dependencies],
  }));

  const [paperConfig, setPaperConfig] = useState<PaperConfig>({
    author: DEFAULT_AUTHOR,
    scienceCategory: DEFAULT_CATEGORY,
    title: '',
  });

  const [selectedModel, setSelectedModel] = useState<string>(DEFAULT_MODEL);
  const [generationMode, setGenerationMode] = useState<'manual' | 'auto'>(DEFAULT_MODE as 'manual' | 'auto');
  const [isGenerating, setIsGenerating] = useState(false);
  const [sections, setSections] = useState<Section[]>(initialSections);
  const [currentSectionId, setCurrentSectionId] = useState<string | null>(null);

  // Calculate progress
  const completedCount = sections.filter(s => s.status === 'completed').length;
  const totalCount = sections.length;
  
  // Calculate average section time from completed sections
  const completedSections = sections.filter(s => s.status === 'completed' && s.metadata?.responseTime);
  const avgTime = completedSections.length > 0
    ? completedSections.reduce((sum, s) => sum + (s.metadata?.responseTime || 0), 0) / completedSections.length / 1000
    : 30; // Default 30 seconds
  
  const estimatedTimeRemaining = calculateEstimatedTime(completedCount, totalCount, avgTime);

  const progress = {
    completed: completedCount,
    total: totalCount,
    estimatedTimeRemaining
  };

  // Actions
  const updateAuthor = useCallback((author: string) => {
    setPaperConfig(prev => ({ ...prev, author }));
  }, []);

  const updateCategory = useCallback((category: string) => {
    setPaperConfig(prev => ({ ...prev, scienceCategory: category }));
  }, []);

  const randomizeCategory = useCallback(() => {
    const randomCat = getRandomCategory(SCIENCE_CATEGORIES);
    setPaperConfig(prev => ({ ...prev, scienceCategory: randomCat }));
  }, []);

  const updateTitle = useCallback((title: string) => {
    setPaperConfig(prev => ({ ...prev, title }));
  }, []);

  const selectModel = useCallback((modelId: string) => {
    setSelectedModel(modelId);
  }, []);

  const updateSectionStatus = useCallback((
    sectionId: string, 
    status: Section['status'], 
    content?: string,
    metadata?: Section['metadata']
  ) => {
    setSections(prevSections => {
      const newSections = prevSections.map(section => {
        if (section.id === sectionId) {
          // Calculate word count if content is provided
          const wordCount = content ? countWords(content) : section.metadata?.wordCount;
          return {
            ...section,
            status,
            content: content !== undefined ? content : section.content,
            metadata: metadata 
              ? { ...metadata, wordCount }
              : section.metadata 
              ? { ...section.metadata, wordCount }
              : undefined
          };
        }
        return section;
      });

      // Update locked sections to pending if dependencies are met
      const completedIds = newSections.filter(s => s.status === 'completed').map(s => s.id);
      return newSections.map(section => {
        if (section.status === 'locked') {
          const allDepsMet = section.dependencies.every(dep => completedIds.includes(dep));
          if (allDepsMet) {
            return { ...section, status: 'pending' as const };
          }
        }
        return section;
      });
    });
  }, []);

  const getSectionById = useCallback((sectionId: string) => {
    return sections.find(s => s.id === sectionId);
  }, [sections]);

  const getCompletedSectionIds = useCallback(() => {
    return sections.filter(s => s.status === 'completed').map(s => s.id);
  }, [sections]);

  const scrollToSection = useCallback((sectionId: string) => {
    const element = document.getElementById(`section-${sectionId}`);
    if (element) {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
        inline: 'nearest'
      });
    }
  }, []);

  const resetPaper = useCallback(() => {
    setPaperConfig({
      author: DEFAULT_AUTHOR,
      scienceCategory: DEFAULT_CATEGORY,
      title: '',
    });
    setSelectedModel(DEFAULT_MODEL);
    setGenerationMode(DEFAULT_MODE as 'manual' | 'auto');
    setIsGenerating(false);
    setSections(initialSections);
    setCurrentSectionId(null);
  }, []);

  const state: VixraPaperState = {
    paperConfig,
    selectedModel,
    generationMode,
    isGenerating,
    sections,
    currentSectionId,
    progress
  };

  const actions: VixraPaperActions = {
    updateAuthor,
    updateCategory,
    randomizeCategory,
    updateTitle,
    selectModel,
    setGenerationMode,
    setIsGenerating,
    setCurrentSectionId,
    updateSectionStatus,
    getSectionById,
    getCompletedSectionIds,
    scrollToSection,
    resetPaper
  };

  return {
    state,
    actions
  };
}
