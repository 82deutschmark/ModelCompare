/**
 * Author: Cascade using Claude Sonnet 4
 * Date: 2025-10-04
 * PURPOSE: Vixra Mode - Satirical academic paper generation with hero-centered UI redesign.
 *          Single-column layout with PaperSetupCard hero, progress tracker,
 *          streaming section results, and export footer.
 *          Optimized for single-model auto-mode workflow while supporting manual mode.
 * SRP/DRY check: Pass - Page orchestration only, delegates to components
 * shadcn/ui: Pass - Uses AppNavigation and custom Vixra components built on shadcn/ui
 */

import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { apiRequest } from "@/lib/queryClient";
import type { AIModel, ModelResponse } from "@/types/ai-models";

// Components
import { AppNavigation } from "@/components/AppNavigation";
import { PaperSetupCard } from "@/components/vixra/PaperSetupCard";
import { SectionProgressTracker, type Section } from "@/components/vixra/SectionProgressTracker";
import { SectionResultsStream } from "@/components/vixra/SectionResultsStream";
import { PaperExportFooter } from "@/components/vixra/PaperExportFooter";
import { FloatingModelPicker } from "@/components/comparison/FloatingModelPicker";
import { ModelPill } from "@/components/comparison/ModelPill";

// State management and utilities
import { useVixraPaper } from "@/hooks/useVixraPaper";
import { 
  parseVixraTemplates, 
  generateMissingVariables, 
  substituteVariables,
  getNextEligibleSection,
  downloadVixraPaper,
  copyVixraPaper,
  printVixraPaper,
  SCIENCE_CATEGORIES,
  type VixraVariables,
  type VixraSectionResponses
} from "@/lib/vixraUtils";

export default function VixraPage() {
  const { toast } = useToast();
  const { state, actions } = useVixraPaper();
  
  // Template storage
  const [promptTemplates, setPromptTemplates] = useState<Map<string, string>>(new Map());
  const [templatesLoaded, setTemplatesLoaded] = useState(false);

  // Fetch available models
  const { data: models = [], isLoading: modelsLoading } = useQuery({
    queryKey: ['/api/models'],
    queryFn: async () => {
      const response = await fetch('/api/models');
      if (!response.ok) throw new Error('Failed to fetch models');
      return response.json() as Promise<AIModel[]>;
    },
  });

  // Pre-select default model when models load
  useEffect(() => {
    if (models.length > 0 && !state.selectedModel) {
      const defaultModel = models.find(m => m.id === 'gpt-5-nano-2025-08-07');
      if (defaultModel) {
        actions.selectModel(defaultModel.id);
      } else if (models.length > 0) {
        // Fallback to first available model
        actions.selectModel(models[0].id);
      }
    }
  }, [models, state.selectedModel, actions]);

  // Load Vixra prompt templates
  useEffect(() => {
    const loadTemplates = async () => {
      try {
        const response = await fetch('/docs/vixra-prompts.md');
        const markdownContent = await response.text();
        const templates = parseVixraTemplates(markdownContent);
        setPromptTemplates(templates);
        setTemplatesLoaded(true);
        
        if (templates.size === 0) {
          toast({
            title: 'No templates found',
            description: 'Could not parse section templates from vixra-prompts.md',
            variant: 'destructive',
          });
        }
      } catch (error) {
        console.error('Failed to load Vixra templates:', error);
        toast({
          title: 'Failed to load templates',
          description: 'Could not load Vixra section templates.',
          variant: 'destructive',
        });
      }
    };

    loadTemplates();
  }, [toast]);

  // Individual model response mutation
  const modelResponseMutation = useMutation({
    mutationFn: async (data: { prompt: string; modelId: string; sectionId: string }) => {
      const response = await apiRequest('POST', '/api/models/respond', {
        modelId: data.modelId,
        prompt: data.prompt
      });
      const responseData = await response.json() as ModelResponse;
      return { ...responseData, sectionId: data.sectionId, modelId: data.modelId };
    },
    onMutate: (variables) => {
      actions.updateSectionStatus(variables.sectionId, 'generating');
      actions.setCurrentSectionId(variables.sectionId);
    },
    onSuccess: (data) => {
      actions.updateSectionStatus(
        data.sectionId, 
        'completed',
        data.content,
        {
          responseTime: data.responseTime,
          tokenUsage: data.tokenUsage ? {
            prompt: data.tokenUsage.input || 0,
            completion: data.tokenUsage.output || 0,
            total: (data.tokenUsage.input || 0) + (data.tokenUsage.output || 0) + (data.tokenUsage.reasoning || 0)
          } : undefined,
        }
      );

      toast({
        title: 'Section Complete',
        description: `${state.sections.find(s => s.id === data.sectionId)?.name || data.sectionId} generated successfully`,
      });

      // Auto mode: Continue to next section
      if (state.generationMode === 'auto' && state.isGenerating) {
        const completedIds = actions.getCompletedSectionIds();
        const nextSection = getNextEligibleSection([...completedIds, data.sectionId]);
        
        if (nextSection) {
          // Small delay for UX
          setTimeout(() => {
            generateSection(nextSection);
          }, 1500);
        } else {
          // All sections complete
          actions.setIsGenerating(false);
          actions.setCurrentSectionId(null);
          toast({
            title: "Paper Complete! 🎉",
            description: "Your satirical masterpiece is ready to revolutionize science!",
          });
        }
      } else {
        actions.setCurrentSectionId(null);
      }
    },
    onError: (error: Error, variables) => {
      actions.updateSectionStatus(variables.sectionId, 'failed');
      actions.setCurrentSectionId(null);
      
      const sectionName = state.sections.find(s => s.id === variables.sectionId)?.name || variables.sectionId;
      
      // In auto-mode, offer to stop generation
      const toastAction = state.generationMode === 'auto' ? (
        <ToastAction 
          altText="Stop auto-mode generation"
          onClick={() => {
            actions.setIsGenerating(false);
            actions.setCurrentSectionId(null);
          }}
        >
          Stop Auto-Mode
        </ToastAction>
      ) : undefined;
      
      toast({
        title: 'Generation Failed',
        description: `Failed to generate ${sectionName}: ${error.message}. ${state.generationMode === 'auto' ? 'Continuing to next section...' : 'Try changing models or regenerating.'}`,
        variant: "destructive",
        action: toastAction,
      });

      // Auto mode: Continue despite error (but user can stop via toast action)
      if (state.generationMode === 'auto' && state.isGenerating) {
        const completedIds = actions.getCompletedSectionIds();
        const nextSection = getNextEligibleSection(completedIds);
        
        if (nextSection) {
          setTimeout(() => {
            // Check if still generating (user might have stopped via toast)
            if (state.isGenerating) {
              generateSection(nextSection);
            }
          }, 2500); // Slightly longer delay after errors
        } else {
          actions.setIsGenerating(false);
        }
      }
    },
  });

  // Build section prompt with variable substitution
  const buildSectionPrompt = useCallback(async (sectionId: string): Promise<string> => {
    const template = promptTemplates.get(sectionId);
    if (!template) {
      throw new Error(`No template found for section: ${sectionId}`);
    }

    // Generate missing variables (respects user input)
    const userVariables: VixraVariables = {
      Author: state.paperConfig.author,
      ScienceCategory: state.paperConfig.scienceCategory,
      Title: state.paperConfig.title,
    };
    
    const completeVariables = await generateMissingVariables(userVariables, promptTemplates);
    
    // Update UI with generated title if it was missing
    if (!state.paperConfig.title && completeVariables.Title) {
      actions.updateTitle(completeVariables.Title);
    }
    
    // Add previous section content as variables for dependencies
    const section = state.sections.find(s => s.id === sectionId);
    const allVariables = { ...completeVariables };
    
    if (section?.dependencies) {
      section.dependencies.forEach(depId => {
        const depSection = state.sections.find(s => s.id === depId);
        if (depSection?.content) {
          allVariables[depId] = depSection.content;
          // For single dependency, also add as {response}
          if (section.dependencies.length === 1) {
            allVariables.response = depSection.content;
          }
        }
      });
    }

    return substituteVariables(template, allVariables);
  }, [promptTemplates, state.paperConfig, state.sections, actions]);

  // Generate a specific section
  const generateSection = useCallback(async (sectionId?: string) => {
    const targetSection = sectionId || state.currentSectionId || getNextEligibleSection(actions.getCompletedSectionIds());
    
    if (!targetSection) {
      toast({
        title: "No sections available",
        description: "All sections are either completed or locked",
        variant: "destructive",
      });
      return;
    }

    if (!state.selectedModel) {
      toast({
        title: "No model selected",
        description: "Please select an AI model to generate sections",
        variant: "destructive",
      });
      return;
    }

    if (!state.paperConfig.scienceCategory) {
      toast({
        title: "Missing science category",
        description: "Please select a science category",
        variant: "destructive",
      });
      return;
    }

    try {
      const prompt = await buildSectionPrompt(targetSection);
      
      modelResponseMutation.mutate({
        prompt,
        modelId: state.selectedModel,
        sectionId: targetSection
      });
    } catch (error) {
      toast({
        title: "Prompt generation failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  }, [state.currentSectionId, state.selectedModel, state.paperConfig.scienceCategory, actions, toast, buildSectionPrompt, modelResponseMutation]);

  // Start paper generation (manual or auto mode)
  const handleGeneratePaper = useCallback(() => {
    if (!state.paperConfig.scienceCategory || !state.paperConfig.author) {
      toast({
        title: "Missing required fields",
        description: "Please enter author name and select a science category",
        variant: "destructive",
      });
      return;
    }

    if (!state.selectedModel) {
      toast({
        title: "No model selected",
        description: "Please select an AI model",
        variant: "destructive",
      });
      return;
    }

    actions.setIsGenerating(true);
    
    // Start with first section
    const firstSection = getNextEligibleSection([]);
    if (firstSection) {
      generateSection(firstSection);
    }
  }, [state.paperConfig, state.selectedModel, actions, toast, generateSection]);

  // Regenerate a specific section
  const handleRegenerateSection = useCallback((sectionId: string) => {
    if (state.isGenerating) {
      toast({
        title: "Generation in progress",
        description: "Please wait for current generation to complete",
        variant: "destructive",
      });
      return;
    }

    generateSection(sectionId);
  }, [state.isGenerating, toast, generateSection]);

  // Export handlers
  const handleExportPDF = useCallback(() => {
    try {
      const sectionResponses: VixraSectionResponses = {};
      state.sections.forEach(section => {
        if (section.status === 'completed' && section.content) {
          sectionResponses[section.id] = {
            [state.selectedModel]: {
              content: section.content,
              status: 'success',
              responseTime: section.metadata?.responseTime || 0,
              tokenUsage: section.metadata?.tokenUsage,
            } as ModelResponse
          };
        }
      });

      const variables: VixraVariables = {
        Author: state.paperConfig.author,
        ScienceCategory: state.paperConfig.scienceCategory,
        Title: state.paperConfig.title,
      };

      const selectedModelData = models.find(m => m.id === state.selectedModel);
      printVixraPaper(variables, sectionResponses, selectedModelData ? [selectedModelData] : []);
      
      toast({
        title: "Print dialog opened",
        description: "Save as PDF in the print dialog",
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description: error instanceof Error ? error.message : "Could not export paper",
        variant: "destructive",
      });
    }
  }, [state.sections, state.selectedModel, state.paperConfig, models, toast]);

  const handleExportMarkdown = useCallback(async () => {
    try {
      const sectionResponses: VixraSectionResponses = {};
      state.sections.forEach(section => {
        if (section.status === 'completed' && section.content) {
          sectionResponses[section.id] = {
            [state.selectedModel]: {
              content: section.content,
              status: 'success',
              responseTime: section.metadata?.responseTime || 0,
              tokenUsage: section.metadata?.tokenUsage,
            } as ModelResponse
          };
        }
      });

      const variables: VixraVariables = {
        Author: state.paperConfig.author,
        ScienceCategory: state.paperConfig.scienceCategory,
        Title: state.paperConfig.title,
      };

      const selectedModelData = models.find(m => m.id === state.selectedModel);
      await copyVixraPaper(variables, sectionResponses, selectedModelData ? [selectedModelData] : []);
      
      toast({
        title: "Copied to clipboard",
        description: "Paper has been copied as markdown",
      });
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Could not copy to clipboard",
        variant: "destructive",
      });
    }
  }, [state.sections, state.selectedModel, state.paperConfig, models, toast]);

  const handlePrint = handleExportPDF;

  // Check if export footer should be visible
  const abstractComplete = state.sections.find(s => s.id === 'abstract')?.status === 'completed';
  const allComplete = state.sections.every(s => s.status === 'completed');
  const showExportFooter = abstractComplete;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppNavigation
        title="Vixra Mode"
        subtitle="Generate satirical academic papers with AI"
        icon={FileText}
      />

      {/* Screen reader announcements */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {state.currentSectionId && `Now generating ${state.sections.find(s => s.id === state.currentSectionId)?.name || 'section'}`}
        {state.progress.completed > 0 && !state.isGenerating && `Generated ${state.progress.completed} of ${state.progress.total} sections`}
      </div>

      <div className="flex-1">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
          <div className="space-y-6">
            {/* Hero: Paper Setup Card */}
            <PaperSetupCard
              author={state.paperConfig.author}
              onAuthorChange={actions.updateAuthor}
              scienceCategory={state.paperConfig.scienceCategory}
              onCategoryChange={actions.updateCategory}
              onRandomCategory={actions.randomizeCategory}
              title={state.paperConfig.title}
              onTitleChange={actions.updateTitle}
              categories={[...SCIENCE_CATEGORIES]}
              selectedModel={state.selectedModel}
              models={models}
              onModelSelect={actions.selectModel}
              isAutoMode={state.generationMode === 'auto'}
              onModeToggle={(enabled) => actions.setGenerationMode(enabled ? 'auto' : 'manual')}
              onGenerate={handleGeneratePaper}
              isGenerating={state.isGenerating}
              disabled={modelsLoading || !templatesLoaded}
            />

            {/* Progress Tracker (appears when generating or has completed sections) */}
            {(state.isGenerating || state.progress.completed > 0) && (
              <SectionProgressTracker
                sections={state.sections}
                currentSectionId={state.currentSectionId}
                onSectionClick={actions.scrollToSection}
                showProgress={true}
              />
            )}

            {/* Section Results Stream */}
            <SectionResultsStream
              sections={state.sections}
              models={models}
              onRegenerateSection={handleRegenerateSection}
              isGenerating={state.isGenerating}
            />
          </div>
        </div>
      </div>

      {/* Export Footer (conditional) */}
      {showExportFooter && (
        <PaperExportFooter
          sections={state.sections}
          paperTitle={state.paperConfig.title}
          paperAuthor={state.paperConfig.author}
          onExportPDF={handleExportPDF}
          onExportMarkdown={handleExportMarkdown}
          onPrint={handlePrint}
          visible={true}
          isComplete={allComplete}
        />
      )}
    </div>
  );
}
