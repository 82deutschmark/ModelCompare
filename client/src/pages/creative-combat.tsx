/**
 * Creative Combat Page - Manual Sequential Creative Editing
 * 
 * This page implements a MANUAL, SEQUENTIAL creative editing process where:
 * 1. User selects multiple AI models and enters a creative prompt
 * 2. First model creates original content from the prompt
 * 3. SYSTEM STOPS and waits for user to manually choose the next editor
 * 4. User selects which model should enhance the previous work
 * 5. Selected model improves/revises the content with enhancement prompts
 * 6. Process repeats until user decides to finish the session
 * 
 * KEY FEATURES:
 * - Manual model selection between each pass (no automatic processing)
 * - Modular prompt system integration (no hardcoded prompts)
 * - Centralized navigation component
 * - Real-time cost tracking and timing
 * - Copy and session management controls
 * 
 * WORKFLOW:
 * User Flow: Select Models → Enter Prompt → Start Session → Choose Next Editor → Repeat
 * Technical Flow: Manual triggers → API calls → UI updates → User choice → Continue
 * 
 * Like a writing workshop where each AI model takes turns enhancing the work,
 * but the user controls who goes next and when to stop.
 * 
 * Author: Cascade with Claude 4 Sonnet Thinking
 * Date: August 11, 2025
 * Refactored: Manual sequential workflow, modular prompts, centralized navigation
 */

import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/components/ThemeProvider";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  Play, Plus, Loader2, Brain, GitCompare, Edit3, FileEdit,
  Mic, Feather, Music, FileText, Code, BookOpen, 
  Clock, Timer, Users, Settings, ArrowRight, CheckCircle,
  Sword, MessageSquare, Palette, Copy, Download
} from "lucide-react";
import type { AIModel, ModelResponse } from "@/types/ai-models";
import { MessageCard } from "@/components/MessageCard";
import type { MessageCardData } from "@/components/MessageCard";
import { AppNavigation } from "@/components/AppNavigation";
import { parsePromptsFromMarkdown, type PromptCategory, type PromptTemplate, findPromptTemplate } from "@/lib/promptParser";
import { 
  generateMarkdownExport, 
  downloadFile, 
  generateSafeFilename, 
  copyToClipboard, 
  type ExportData 
} from "@/lib/exportUtils";

/**
 * Creative Category Icons Mapping
 * 
 * Maps category IDs from creative-combat-prompts.md to their corresponding Lucide icons.
 * This allows the UI to display appropriate icons for each creative category.
 * 
 * TODO: When creative-combat-prompts.md parser is implemented, this mapping
 * should be automatically generated or configured based on the markdown file.
 * 
 * Author: Cascade with Claude 4 Sonnet Thinking
 */
const categoryIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  'battle-rap': Mic,
  'poetry-enhancement': Feather,
  'song-lyrics-enhancement': Music,
  'essay-enhancement': FileText,
  'code-enhancement': Code,
  'story-enhancement': BookOpen,
};

/**
 * Editorial Pass Interface
 * 
 * Represents a single editorial pass in the creative combat workflow.
 * Each pass contains the model's response, metadata, and tracking information.
 * 
 * Key Fields:
 * - isOriginal: true for the first model's original creation, false for enhancements
 * - passNumber: sequential number of the editorial pass (1, 2, 3, etc.)
 * - content: the actual creative work produced by the model
 * - reasoning: model's explanation of their creative choices (if supported)
 * - cost/timing: performance metrics for tracking and analysis
 * 
 * This interface supports the manual sequential workflow by providing all
 * necessary data for users to make informed decisions about the next editor.
 * 
 * Author: Cascade with Claude 4 Sonnet Thinking
 */
interface EditorialPass {
  id: string;
  modelName: string;
  modelId: string;
  content: string;
  reasoning?: string;
  passNumber: number;
  responseTime: number;
  cost?: {
    input: number;
    output: number;
    total: number;
  };
  tokenUsage?: {
    input: number;
    output: number;
  };
  timestamp: Date;
  isOriginal: boolean;
  editorialNotes?: string;
}

export default function CreativeCombat() {
  const { toast } = useToast();
  const scrollRef = useRef<HTMLDivElement>(null);

  /**
   * STATE MANAGEMENT: Modular Prompt System
   * 
   * Handles integration with the modular prompt template system:
   * - selectedCategory: Currently chosen creative category (poetry, lyrics, etc.)
   * - selectedPromptTemplate: Which template within category (original vs enhancement)
   * - promptCategories: All available categories loaded from markdown
   * - promptsLoading: Loading state for template system
   * - customPrompt: The actual prompt text (from template or user input)
   * 
   * This replaces the old hardcoded category/prompt system.
   * Author: Cascade with Claude 4 Sonnet Thinking
   */
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedPromptTemplate, setSelectedPromptTemplate] = useState<string>('');
  const [promptCategories, setPromptCategories] = useState<PromptCategory[]>([]);
  const [promptsLoading, setPromptsLoading] = useState(true);
  const [customPrompt, setCustomPrompt] = useState('Write a hardcore battle rap.');
  
  /**
   * STATE MANAGEMENT: Manual Sequential Creative Combat Flow
   * 
   * Core state for the manual sequential workflow:
   * - selectedModels: Models chosen by user for the editorial queue
   * - editorialPasses: Array of completed passes (original + enhancements)
   * - currentModelIndex: Current position in the selectedModels array
   * - isProcessing: True when API call is in progress
   * - awaitingNextEdit: CRITICAL - True when waiting for user to choose next editor
   * - showTiming: UI preference for displaying response times
   * - totalCost: Running total of API costs for the session
   * - sessionStartTime: When the session began (for analytics)
   * 
   * KEY: awaitingNextEdit controls the manual workflow - when true,
   * the "Choose Next Editor" UI is displayed and no automatic processing occurs.
   * Author: Cascade with Claude 4 Sonnet Thinking
   */
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [editorialPasses, setEditorialPasses] = useState<EditorialPass[]>([]);
  const [currentModelIndex, setCurrentModelIndex] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [awaitingNextEdit, setAwaitingNextEdit] = useState(false);
  const [showTiming, setShowTiming] = useState(true);
  const [totalCost, setTotalCost] = useState(0);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);

  // Load available models
  const { data: models = [], isLoading: modelsLoading } = useQuery({
    queryKey: ['models'],
    queryFn: async () => {
      const response = await fetch('/api/models');
      if (!response.ok) throw new Error('Failed to fetch models');
      return response.json();
    },
  });

  // Model response mutation
  const modelResponseMutation = useMutation({
    mutationFn: async ({ prompt, modelId }: { prompt: string; modelId: string }) => {
      const response = await fetch('/api/models/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, modelId }),
      });
      if (!response.ok) throw new Error('Failed to get model response');
      return response.json();
    },
  });

  /**
   * EFFECT: Load Modular Prompt Templates
   * 
   * Loads prompt categories and templates from the modular prompt system.
   * Currently uses placeholder data but designed to integrate with
   * creative-combat-prompts.md parser when implemented.
   * 
   * The structure includes:
   * - Multiple creative categories (poetry, lyrics, stories, etc.)
   * - Each category has 'original' and 'enhancement' prompt templates
   * - Original prompts: For the first model to create initial content
   * - Enhancement prompts: For subsequent models to improve previous work
   * 
   * This replaces the old hardcoded prompt system and enables
   * true modular prompt management.
   * 
   * Author: Cascade with Claude 4 Sonnet Thinking
   */
  useEffect(() => {
    const loadPrompts = async () => {
      setPromptsLoading(true);
      try {
        // TODO: Create a parser for creative-combat-prompts.md
        // For now, use a comprehensive placeholder structure
        const categories: PromptCategory[] = [
          {
            id: 'poetry-enhancement',
            name: 'Poetry Enhancement', 
            prompts: [
              {
                id: 'original',
                name: 'Original Prompt',
                content: 'You are a skilled poet and literary artist. Create a beautiful poem that demonstrates mastery of vivid imagery, emotional depth, and technical skill. Focus on creating something beautiful and memorable (100-200 words).'
              },
              {
                id: 'enhancement',
                name: 'Enhancement Prompt', 
                content: 'You are a masterful poet and literary critic. Take this poem and elevate it to an even higher level of artistry. Improve upon imagery, emotional depth, technical craft, and originality. Create an enhanced version that builds upon the original while demonstrating superior poetic skill.'
              }
            ]
          },
          {
            id: 'song-lyrics-enhancement',
            name: 'Song Lyrics Enhancement',
            prompts: [
              {
                id: 'original',
                name: 'Original Prompt',
                content: 'You are a talented songwriter. Create compelling song lyrics with strong emotional resonance, memorable hooks, and vivid storytelling. Focus on universal themes that connect with listeners.'
              },
              {
                id: 'enhancement', 
                name: 'Enhancement Prompt',
                content: 'You are a master songwriter and lyricist. Take these lyrics and enhance them with stronger emotional impact, better flow, more memorable hooks, and deeper meaning. Improve the overall songwriting craft.'
              }
            ]
          },
          {
            id: 'story-enhancement',
            name: 'Story Enhancement',
            prompts: [
              {
                id: 'original',
                name: 'Original Prompt', 
                content: 'You are a skilled storyteller. Write a compelling short story with vivid characters, engaging plot, and meaningful themes. Focus on creating an emotionally resonant narrative.'
              },
              {
                id: 'enhancement',
                name: 'Enhancement Prompt',
                content: 'You are a master storyteller and editor. Take this story and elevate it with stronger character development, tighter pacing, more vivid descriptions, and deeper thematic resonance.'
              }
            ]
          }
        ];
        setPromptCategories(categories);
      } catch (error) {
        console.error('Failed to load prompt templates:', error);
        toast({
          title: 'Failed to load prompt templates',
          description: 'Using default prompt input only.',
          variant: 'destructive',
        });
      } finally {
        setPromptsLoading(false);
      }
    };
    loadPrompts();
  }, [toast]);

  /**
   * EFFECT: Update Prompt from Template Selection
   * 
   * When user selects a category and template, automatically update
   * the custom prompt field with the template content.
   * 
   * This enables seamless switching between:
   * - Pre-defined prompt templates
   * - Custom user-written prompts
   * 
   * Author: Cascade with Claude 4 Sonnet Thinking
   */
  useEffect(() => {
    if (selectedCategory && selectedPromptTemplate) {
      const template = findPromptTemplate(promptCategories, selectedCategory, selectedPromptTemplate);
      if (template) {
        setCustomPrompt(template.content);
      }
    }
  }, [selectedCategory, selectedPromptTemplate, promptCategories]);

  // Auto-scroll to latest pass
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [editorialPasses]);

  // Convert editorial pass to MessageCardData format
  const convertToMessageCardData = (pass: EditorialPass): MessageCardData => {
    return {
      id: pass.id,
      content: pass.content,
      modelName: pass.modelName,
      modelId: pass.modelId,
      reasoning: pass.reasoning,
      responseTime: pass.responseTime,
      tokenUsage: pass.tokenUsage ? {
        input: pass.tokenUsage.input,
        output: pass.tokenUsage.output
      } : undefined,
      cost: pass.cost ? {
        input: pass.cost.input,
        output: pass.cost.output,
        total: pass.cost.input + pass.cost.output
      } : undefined,
      modelConfig: {
        capabilities: {
          reasoning: !!pass.reasoning,
          multimodal: false,
          functionCalling: false,
          streaming: false
        }
      }
    };
  };

  // Export handlers
  const handleExportMarkdown = () => {
    if (editorialPasses.length === 0) return;

    const exportData: ExportData = {
      prompt: userPrompt || 'Creative Combat Session',
      timestamp: new Date(),
      models: editorialPasses.map(pass => ({
        model: {
          id: pass.modelId,
          name: pass.modelName,
          provider: 'AI Model',
        } as AIModel,
        response: {
          status: 'success' as const,
          content: pass.content,
          reasoning: pass.reasoning,
          responseTime: pass.responseTime,
          tokenUsage: pass.tokenUsage,
          cost: pass.cost,
        }
      }))
    };

    const markdown = generateMarkdownExport(exportData);
    const filename = generateSafeFilename(`creative-combat-${userPrompt}`, 'md');
    downloadFile(markdown, filename, 'text/markdown');
    
    toast({
      title: "Creative Combat Exported",
      description: "Downloaded as markdown file",
    });
  };

  const handleCopyToClipboard = async () => {
    if (editorialPasses.length === 0) return;

    const exportData: ExportData = {
      prompt: userPrompt || 'Creative Combat Session',
      timestamp: new Date(),
      models: editorialPasses.map(pass => ({
        model: {
          id: pass.modelId,
          name: pass.modelName,
          provider: 'AI Model',
        } as AIModel,
        response: {
          status: 'success' as const,
          content: pass.content,
          reasoning: pass.reasoning,
          responseTime: pass.responseTime,
          tokenUsage: pass.tokenUsage,
          cost: pass.cost,
        }
      }))
    };

    const markdown = generateMarkdownExport(exportData);
    const success = await copyToClipboard(markdown);
    
    if (success) {
      toast({
        title: "Copied to Clipboard",
        description: "Creative combat session exported as markdown",
      });
    } else {
      toast({
        title: "Copy Failed",
        description: "Could not copy to clipboard",
        variant: "destructive",
      });
    }
  };

  /**
   * FUNCTION: Toggle Model Selection
   * 
   * Adds or removes a model from the editorial queue.
   * Users can select multiple models that will be available
   * for manual selection during the creative combat workflow.
   * 
   * The order doesn't matter since users manually choose
   * which model edits next at each step.
   * 
   * Author: Cascade with Claude 4 Sonnet Thinking
   */
  const toggleModel = (modelId: string) => {
    setSelectedModels(prev => 
      prev.includes(modelId) 
        ? prev.filter(id => id !== modelId)
        : [...prev, modelId]
    );
  };

  /**
   * FUNCTION: Start Editorial Session (MANUAL WORKFLOW ENTRY POINT)
   * 
   * Initiates the manual sequential creative combat workflow.
   * This is the main entry point for the entire creative editing process.
   * 
   * WORKFLOW:
   * 1. Validate user inputs (models selected, prompt entered)
   * 2. Reset all session state for a fresh start
   * 3. Call processNextEditorialPass with isOriginal=true
   * 4. First model creates original content
   * 5. System stops and waits for user to choose next editor
   * 
   * CRITICAL: After the first model responds, the system enters
   * 'awaitingNextEdit' state and shows the "Choose Next Editor" UI.
   * No automatic processing occurs - user must manually select next model.
   * 
   * Author: Cascade with Claude 4 Sonnet Thinking
   */
  const startEditorialSession = async () => {
    if (selectedModels.length === 0) {
      toast({
        title: "No Models Selected",
        description: "Please select at least one model to start the editorial session",
        variant: "destructive",
      });
      return;
    }

    if (!customPrompt.trim()) {
      toast({
        title: "No Prompt",
        description: "Please enter a creative prompt to begin",
        variant: "destructive",
      });
      return;
    }

    setEditorialPasses([]);
    setCurrentModelIndex(0);
    setIsProcessing(true);
    setAwaitingNextEdit(false);
    setSessionStartTime(new Date());
    setTotalCost(0);

    // First model creates the original content
    await processNextEditorialPass(customPrompt, true);
  };

  /**
   * FUNCTION: Process Editorial Pass (CORE API INTERACTION)
   * 
   * Handles the actual API call to a model and processes the response.
   * This function is called for both original content creation and enhancements.
   * 
   * PARAMETERS:
   * - currentPrompt: The prompt to send to the model
   * - isOriginal: true for first model (original content), false for enhancements
   * 
   * WORKFLOW:
   * 1. Get the model from selectedModels at currentModelIndex
   * 2. Make API call to /api/models/respond
   * 3. Process response and create EditorialPass object
   * 4. Add pass to editorialPasses array
   * 5. Set awaitingNextEdit = true (CRITICAL for manual workflow)
   * 6. Stop processing and wait for user to choose next model
   * 
   * KEY DIFFERENCE from old automatic system:
   * - OLD: Automatically continued to next model
   * - NEW: Stops and waits for manual user selection
   * 
   * Author: Cascade with Claude 4 Sonnet Thinking
   */
  const processNextEditorialPass = async (currentPrompt: string, isOriginal: boolean = false) => {
    const modelIndex = currentModelIndex;
    const modelId = selectedModels[modelIndex];
    const model = models.find((m: AIModel) => m.id === modelId);
    
    if (!model) {
      setIsProcessing(false);
      return;
    }

    const editorialPrompt = isOriginal 
      ? currentPrompt
      : `Please act as a literary editor and improve the following ${selectedCategory}. Make it better while preserving the core message and style. Focus on clarity, impact, and artistry:\n\n${editorialPasses[editorialPasses.length - 1]?.content}\n\nYour improved version:`;

    try {
      const startTime = Date.now();
      const response = await modelResponseMutation.mutateAsync({
        prompt: editorialPrompt,
        modelId
      });
      const endTime = Date.now();

      const newPass: EditorialPass = {
        id: `${modelId}-${Date.now()}`,
        modelName: model.name,
        modelId,
        content: response.content,
        reasoning: response.reasoning,
        passNumber: editorialPasses.length + 1,
        responseTime: endTime - startTime,
        cost: response.cost,
        tokenUsage: response.tokenUsage,
        timestamp: new Date(),
        isOriginal,
        editorialNotes: isOriginal ? 'Original creation' : `Editorial revision by ${model.name}`
      };

      setEditorialPasses(prev => [...prev, newPass]);
      setTotalCost(prev => prev + (response.cost?.total || 0));
      setCurrentModelIndex((prev: number) => prev + 1);
      setAwaitingNextEdit(true);
      setIsProcessing(false);
      
      // MANUAL FLOW: Stop here and wait for user to choose next model
      toast({
        title: "Editorial Pass Complete",
        description: `Content ready for next enhancement. Choose another model to continue.`,
      });
    } catch (error) {
      toast({
        title: "Editorial Pass Failed",
        description: `Failed to get response from ${model.name}`,
        variant: "destructive",
      });
      // MANUAL FLOW: Stop processing on error
      setCurrentModelIndex((prev: number) => prev + 1);
      setIsProcessing(false);
      setAwaitingNextEdit(false);
    }
  };

  /**
   * FUNCTION: Reset Session
   * 
   * Clears all session state to allow starting a fresh creative combat session.
   * Useful when user wants to start over with different models or prompts.
   * 
   * Resets all critical state variables to their initial values.
   * 
   * Author: Cascade with Claude 4 Sonnet Thinking
   */
  const resetSession = () => {
    setEditorialPasses([]);
    setCurrentModelIndex(0);
    setIsProcessing(false);
    setAwaitingNextEdit(false);
    setSessionStartTime(null);
    setTotalCost(0);
  };

  /**
   * FUNCTION: Continue with Next Model (MANUAL WORKFLOW CORE)
   * 
   * This is the HEART of the manual sequential workflow that you specifically requested.
   * Called when user manually selects a model from the "Choose Next Editor" UI.
   * 
   * CRITICAL WORKFLOW:
   * 1. User sees "Choose Next Editor" UI after a model completes
   * 2. User clicks on a model button
   * 3. This function is called with the selected modelId
   * 4. System exits 'awaitingNextEdit' state
   * 5. Creates enhancement prompt with previous content
   * 6. Calls processNextEditorialPass for the selected model
   * 7. After response, system returns to 'awaitingNextEdit' state
   * 
   * ENHANCEMENT PROMPT STRUCTURE:
   * - Includes the previous model's content to be enhanced
   * - References the original user prompt for context
   * - Provides clear instructions for improvement
   * 
   * This implements your requirement: "send the first prompt to ONE model,
   * then we need to wait for that to come back... only once it comes back
   * will the other models be able to have something to edit."
   * 
   * Author: Cascade with Claude 4 Sonnet Thinking
   */
  const continueWithNextModel = async (modelId: string) => {
    const latestPass = editorialPasses[editorialPasses.length - 1];
    if (!latestPass) return;

    setAwaitingNextEdit(false);
    setIsProcessing(true);
    
    // Update current model index to match the selected model
    const modelIndex = selectedModels.findIndex(id => id === modelId);
    if (modelIndex !== -1) {
      setCurrentModelIndex(modelIndex);
    }
    
    // Use enhancement prompt with previous content
    const enhancementPrompt = `Previous work to enhance: "${latestPass.content}"

Original prompt was: "${customPrompt}"

Take this creative work and elevate it to an even higher level. Improve upon imagery, emotional depth, technical craft, and originality while maintaining the core essence.`;
    
    await processNextEditorialPass(enhancementPrompt, false);
  };

  /**
   * COMPUTED VALUES AND UTILITY FUNCTIONS
   * 
   * Helper functions and computed values for the UI and workflow management.
   * 
   * Author: Cascade with Claude 4 Sonnet Thinking
   */
  
  // Get the latest (current best) version for display
  const latestPass = editorialPasses.length > 0 ? editorialPasses[editorialPasses.length - 1] : null;
  const originalPass = editorialPasses.find(pass => pass.isOriginal);

  // Format cost display for UI
  const formatCost = (cost?: { total: number }) => {
    return cost ? `$${cost.total.toFixed(4)}` : '-';
  };

  // Calculate simple diff indicators between editorial passes
  const getDiffStats = (current: string, previous?: string) => {
    if (!previous) return { added: 0, removed: 0 };
    
    const currentWords = current.split(/\s+/).length;
    const previousWords = previous.split(/\s+/).length;
    
    return {
      added: Math.max(0, currentWords - previousWords),
      removed: Math.max(0, previousWords - currentWords)
    };
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <AppNavigation 
        title="Creative Combat" 
        subtitle="Sequential creative editing"
        icon={Palette}
      />
      {/* Page Header */}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {/* Session Stats Header */}
        {editorialPasses.length > 0 && (
          <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Badge className="bg-blue-600">
                  Editorial Session Active
                </Badge>
                <div className="text-sm text-blue-700 dark:text-blue-300">
                  <span className="font-medium">{editorialPasses.length}</span> passes completed
                </div>
                {showTiming && sessionStartTime && (
                  <div className="text-sm text-blue-700 dark:text-blue-300">
                    <Clock className="w-3 h-3 inline mr-1" />
                    {Math.round((Date.now() - sessionStartTime.getTime()) / 1000)}s elapsed
                  </div>
                )}
                <div className="text-sm text-blue-700 dark:text-blue-300">
                  Total cost: ${totalCost.toFixed(4)}
                </div>
              </div>
              <Button onClick={resetSession} variant="outline" size="sm">
                Reset
              </Button>
            </div>
          </div>
        )}

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Left Panel - Setup */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center space-x-2 text-sm">
                  <Settings className="w-4 h-4" />
                  <span>Setup</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                {/* Category Selection */}
                <div>
                  <Label className="text-xs font-medium mb-2 block">Category</Label>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {promptCategories.map((cat: PromptCategory) => {
                        const IconComponent = categoryIcons[cat.id] || FileText;
                        return (
                          <SelectItem key={cat.id} value={cat.id}>
                            <div className="flex items-center">
                              <IconComponent className="w-3 h-3 mr-2" />
                              <span className="text-xs">{cat.name}</span>
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                {/* Prompt Input */}
                <div>
                  <Label className="text-xs font-medium mb-2 block">Creative Prompt</Label>
                  <Textarea
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    placeholder="Enter your creative challenge..."
                    className="min-h-20 text-sm"
                    rows={3}
                  />
                </div>

                {/* Model Selection */}
                <div>
                  <Label className="text-xs font-medium mb-2 block">Editorial Queue ({selectedModels.length} selected)</Label>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {modelsLoading ? (
                      <div className="space-y-2">
                        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                      </div>
                    ) : (
                      models.map((model: AIModel) => (
                        <div
                          key={model.id}
                          className={`p-2 rounded border cursor-pointer transition-colors ${
                            selectedModels.includes(model.id)
                              ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800'
                              : 'bg-gray-50 border-gray-200 dark:bg-gray-800 dark:border-gray-700'
                          }`}
                          onClick={() => toggleModel(model.id)}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium">{model.name}</span>
                            <Badge variant="outline" className="text-xs px-1 py-0">
                              {model.provider}
                            </Badge>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Editorial Progress */}
                {editorialPasses.length > 0 && (
                  <div className="pt-4 border-t">
                    <div className="flex items-center justify-between text-sm">
                      <span>Passes:</span>
                      <Badge variant="outline">{editorialPasses.length}</Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm mt-2">
                      <span>Queue:</span>
                      <Badge variant="outline">{selectedModels.length}</Badge>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Center Panel - Creative Evolution */}
          <div className="lg:col-span-3">
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Editorial Evolution</span>
                  {isProcessing && <Loader2 className="w-5 h-5 animate-spin" />}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {editorialPasses.length === 0 ? (
                  <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                    <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                      <Play className="w-8 h-8" />
                    </div>
                    <p>Start an editorial session to see AI models collaborate</p>
                    
                    {/* Settings */}
                    <div className="mt-6 space-y-3">
                      <div className="flex items-center justify-center space-x-2">
                        <Checkbox
                          id="timing"
                          checked={showTiming}
                          onCheckedChange={(checked) => setShowTiming(checked === true)}
                        />
                        <Label htmlFor="timing" className="text-xs">
                          Show timing info
                        </Label>
                      </div>
                      
                      <Button
                        onClick={startEditorialSession}
                        disabled={isProcessing || selectedModels.length === 0}
                        className="w-full max-w-xs"
                        size="sm"
                      >
                        {isProcessing ? (
                          <>
                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                            <span className="text-xs">Processing...</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-3 h-3 mr-1" />
                            <span className="text-xs">Start Editorial Session</span>
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-[600px] overflow-y-auto">
                    {/* Editorial Passes */}
                    {editorialPasses.map((pass, index) => {
                      const prevPass = index > 0 ? editorialPasses[index - 1] : null;
                      const diffStats = getDiffStats(pass.content, prevPass?.content);
                      
                      return (
                        <div key={pass.id} className="border rounded-lg p-3 bg-gray-50 dark:bg-gray-800">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              <Badge variant={pass.isOriginal ? "default" : "secondary"} className="text-xs">
                                {pass.isOriginal ? 'Original' : `Pass ${pass.passNumber}`}
                              </Badge>
                              <span className="text-xs font-medium">{pass.modelName}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              {!pass.isOriginal && (
                                <div className="flex items-center space-x-1 text-xs">
                                  {diffStats.added > 0 && (
                                    <span className="text-green-600 dark:text-green-400">+{diffStats.added}</span>
                                  )}
                                  {diffStats.removed > 0 && (
                                    <span className="text-red-600 dark:text-red-400">-{diffStats.removed}</span>
                                  )}
                                </div>
                              )}
                              {showTiming && (
                                <Badge variant="outline" className="text-xs px-1 py-0">
                                  <Clock className="w-2 h-2 mr-1" />
                                  {Math.round(pass.responseTime / 1000)}s
                                </Badge>
                              )}
                            </div>
                          </div>
                          <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                            {pass.editorialNotes}
                          </p>
                          <div className="text-sm line-clamp-3">
                            {pass.content.substring(0, 150)}...
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

        </div>

        {/* Latest Version Display */}
        {latestPass && (
          <div className="mt-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span>Current Best Version</span>
                  </div>
                  <Badge className="bg-green-600 text-xs px-2 py-1">
                    Pass {latestPass.passNumber} by {latestPass.modelName}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <div className="text-sm leading-relaxed whitespace-pre-wrap text-gray-800 dark:text-gray-200">
                    {latestPass.content}
                  </div>
                </div>
                
                {latestPass.reasoning && (
                  <details className="mt-3 p-2 bg-amber-50 dark:bg-amber-900/20 rounded border border-amber-200 dark:border-amber-800">
                    <summary className="text-xs font-medium text-amber-700 dark:text-amber-300 cursor-pointer">
                      Editorial Notes
                    </summary>
                    <div className="mt-2 text-xs text-amber-900 dark:text-amber-100">
                      {latestPass.reasoning}
                    </div>
                  </details>
                )}
                
                {/* Manual Model Selection for Next Edit - CORE FEATURE */}
                {awaitingNextEdit && !isProcessing && (
                  <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center space-x-2 mb-3">
                      <Edit3 className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Choose Next Editor</span>
                    </div>
                    <p className="text-xs text-blue-600 dark:text-blue-400 mb-3">
                      Select a model to enhance this creative work further:
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {selectedModels.map((modelId) => {
                        const model = models.find((m: AIModel) => m.id === modelId);
                        if (!model) return null;
                        return (
                          <Button
                            key={modelId}
                            variant="outline"
                            size="sm"
                            className="text-xs justify-start h-auto p-2"
                            onClick={() => continueWithNextModel(modelId)}
                            disabled={isProcessing}
                          >
                            <div className="flex flex-col items-start">
                              <span className="font-medium">{model.name}</span>
                              <span className="text-xs text-gray-500">{model.provider}</span>
                            </div>
                          </Button>
                        );
                      })}
                    </div>
                    <div className="flex justify-between items-center mt-3 pt-2 border-t border-blue-200 dark:border-blue-700">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs text-gray-600 dark:text-gray-400"
                        onClick={() => setAwaitingNextEdit(false)}
                      >
                        Finish Session
                      </Button>
                      <span className="text-xs text-gray-500">or select a model to continue</span>
                    </div>
                  </div>
                )}
                
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center space-x-4 text-xs text-gray-600 dark:text-gray-400">
                    {showTiming && (
                      <div className="flex items-center space-x-1">
                        <Timer className="w-3 h-3" />
                        <span>{(latestPass.responseTime / 1000).toFixed(1)}s</span>
                      </div>
                    )}
                    <div>{formatCost(latestPass.cost)}</div>
                    {originalPass && latestPass !== originalPass && (
                      <div className="flex items-center space-x-1">
                        <GitCompare className="w-3 h-3" />
                        <span>{latestPass.passNumber - 1} revisions</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="px-2 py-1"
                      onClick={handleExportMarkdown}
                      disabled={editorialPasses.length === 0}
                    >
                      <Download className="w-3 h-3 mr-1" />
                      <span className="text-xs">Export</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="px-2 py-1"
                      onClick={handleCopyToClipboard}
                      disabled={editorialPasses.length === 0}
                    >
                      <Copy className="w-3 h-3 mr-1" />
                      <span className="text-xs">Copy All</span>
                    </Button>
                    {editorialPasses.length > 1 && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="px-2 py-1"
                        onClick={resetSession}
                      >
                        <span className="text-xs">New Session</span>
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
