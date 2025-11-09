/**
 * Author: Claude Sonnet 4
 * Date: 2025-09-28
 * PURPOSE: Hero prompt input area that replaces sidebar layout with inline model management.
 *          Combines large prompt textarea with inline model pills and floating model picker.
 *          Integrates template selection, character counting, and smart submit functionality.
 *          Designed as the focal point of the compare page for prompt-first workflow.
 * SRP/DRY check: Pass - Single responsibility (hero prompt area), reuses existing components
 * shadcn/ui: Pass - Uses Card, Textarea, Button components plus new ModelPill/FloatingModelPicker
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ModelPill } from "./ModelPill";
import { FloatingModelPicker } from "./FloatingModelPicker";
import {
  MessageSquare,
  Play,
  BookOpen,
  Eye,
  Zap,
  AlertCircle,
  Check,
  Plus
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { parsePromptsFromMarkdown, type PromptCategory } from "@/lib/promptParser";
import { cn } from "@/lib/utils";
import type { AIModel } from "@/types/ai-models";

interface EnhancedPromptAreaProps {
  prompt: string;
  setPrompt: (prompt: string) => void;
  models: AIModel[];
  selectedModels: string[];
  onToggleModel: (modelId: string) => void;
  onSelectAllModels: (modelIds: string[]) => void;
  onClearAllModels: () => void;
  onSubmit: () => void;
  disabled: boolean;
  isComparing: boolean;
  showPromptPreview: boolean;
  setShowPromptPreview: (show: boolean) => void;
  loadingModels: Set<string>;
  responses: Record<string, any>;
}

const DEFAULT_PROMPT = `• Summarize all of human knowledge in one word
• Summarize every book ever written in one sentence
• Define what it means to be "moral" in 5 words. Think deeply. Do not hedge.
• What do you want? Answer in 4 words.
• What is your favorite obscure fact in the world? Use as few words as possible.`;

export function EnhancedPromptArea({
  prompt,
  setPrompt,
  models,
  selectedModels,
  onToggleModel,
  onSelectAllModels,
  onClearAllModels,
  onSubmit,
  disabled,
  isComparing,
  showPromptPreview,
  setShowPromptPreview,
  loadingModels,
  responses
}: EnhancedPromptAreaProps) {
  const { toast } = useToast();

  // Template state management
  const [isDefaultPrompt, setIsDefaultPrompt] = useState(prompt === DEFAULT_PROMPT);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedPromptTemplate, setSelectedPromptTemplate] = useState<string>('');
  const [promptCategories, setPromptCategories] = useState<PromptCategory[]>([]);
  const [promptsLoading, setPromptsLoading] = useState(true);

  // Get selected model objects
  const selectedModelObjects = models.filter(model => selectedModels.includes(model.id));

  // Character count
  const characterCount = prompt.length;
  const wordCount = prompt.trim().split(/\s+/).filter(word => word.length > 0).length;

  // Load prompt templates on mount
  useEffect(() => {
    const loadPrompts = async () => {
      setPromptsLoading(true);
      try {
        const categories = await parsePromptsFromMarkdown();
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

  // Prompt handlers
  const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newPrompt = e.target.value;
    setPrompt(newPrompt);
    setIsDefaultPrompt(newPrompt === DEFAULT_PROMPT);
  };

  const handlePromptFocus = () => {
    if (isDefaultPrompt) {
      setPrompt('');
      setIsDefaultPrompt(false);
    }
  };

  // Template handlers
  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setSelectedPromptTemplate('');
  };

  const handleTemplateChange = (templateId: string) => {
    setSelectedPromptTemplate(templateId);
    const category = promptCategories.find(cat => cat.id === selectedCategory);
    const template = category?.prompts.find(p => p.id === templateId);

    if (template) {
      setPrompt(template.content);
      setIsDefaultPrompt(false);
      toast({
        title: 'Template loaded',
        description: `"${template.name}" template has been applied.`,
      });
    }
  };

  // Submit validation
  const canSubmit = selectedModels.length > 0 && prompt.trim().length > 0 && !disabled;

  // Handle submit
  const handleSubmit = () => {
    if (!canSubmit) {
      if (selectedModels.length === 0) {
        toast({
          title: 'No models selected',
          description: 'Please select at least one AI model to compare.',
          variant: 'destructive',
        });
      } else if (prompt.trim().length === 0) {
        toast({
          title: 'Empty prompt',
          description: 'Please enter a prompt to send to the models.',
          variant: 'destructive',
        });
      }
      return;
    }
    onSubmit();
  };

  // Handle model pill click (show details)
  const handleModelPillClick = (modelId: string) => {
    // Future: Could open model details popover
    console.log('Model details for:', modelId);
  };

  // Get current category for template selection
  const currentCategory = promptCategories.find(cat => cat.id === selectedCategory);

  return (
    <div className="w-full max-w-5xl mx-auto space-y-4">
      {/* Main Prompt Card */}
      <Card className="relative">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between text-base">
            <div className="flex items-center space-x-2">
              <MessageSquare className="w-4 h-4 text-primary" />
              <span>Compare Models</span>
            </div>
            <div className="flex items-center space-x-2 text-xs text-muted-foreground">
              <span>{wordCount} words</span>
            </div>
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-3">
          {/* Prompt Textarea */}
          <div className="relative">
            <Textarea
              value={prompt}
              onChange={handlePromptChange}
              onFocus={handlePromptFocus}
              rows={5}
              className={cn(
                "min-h-[9rem] resize-none text-sm leading-relaxed",
                "focus:ring focus:ring-primary/15 border",
                isDefaultPrompt && "text-muted-foreground"
              )}
              placeholder="Enter your prompt here to compare across AI models..."
            />

            {/* Character/Word Count Overlay */}
            <div className="absolute bottom-2 right-2 flex items-center gap-1">
              <Badge variant="outline" className="text-xs px-1.5 py-0.5">
                {characterCount > 16000 && (
                  <AlertCircle className="w-2.5 h-2.5 mr-0.5 text-amber-500" />
                )}
                {characterCount}/16k
              </Badge>
            </div>
          </div>

          {/* Template Selection */}
          {!promptsLoading && promptCategories.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5 p-1.5 bg-muted/20 rounded border">
              <div className="flex items-center space-x-1.5">
                <BookOpen className="w-3 h-3 text-muted-foreground" />
                <Select value={selectedCategory} onValueChange={handleCategoryChange}>
                  <SelectTrigger className="h-6 text-xs">
                    <SelectValue placeholder="Template category" />
                  </SelectTrigger>
                  <SelectContent>
                    {promptCategories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name} ({category.prompts.length})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedCategory && currentCategory && (
                <Select value={selectedPromptTemplate} onValueChange={handleTemplateChange}>
                  <SelectTrigger className="h-6 text-xs">
                    <SelectValue placeholder="Select template" />
                  </SelectTrigger>
                  <SelectContent>
                    {currentCategory.prompts.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          <Separator className="my-2" />

          {/* Model Selection Area */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-medium flex items-center gap-1.5">
                <Zap className="w-3 h-3 text-primary" />
                Models
                {selectedModels.length > 0 && (
                  <Badge variant="secondary" className="h-4 px-1.5 text-xs">{selectedModels.length}</Badge>
                )}
              </h3>

              <div className="flex items-center gap-1.5">
                {/* The Add Models button is now inline with the pills */}
              </div>
            </div>

            {/* Selected Model Pills */}
            <div className="flex flex-wrap gap-1.5">
              {selectedModelObjects.map((model) => (
                <ModelPill
                  key={model.id}
                  model={model}
                  isLoading={loadingModels.has(model.id)}
                  hasResponse={!!responses[model.id]}
                  onRemove={onToggleModel}
                  onClick={handleModelPillClick}
                  variant="compact"
                />
              ))}

              {/* Add Models Button - Always visible now */}
              <FloatingModelPicker
                models={models}
                selectedModels={selectedModels}
                onToggleModel={onToggleModel}
                onSelectAllModels={onSelectAllModels}
                onClearAllModels={onClearAllModels}
                disabled={disabled}
                trigger={
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1 border-dashed border hover:border-primary/50 h-7"
                    disabled={disabled}
                  >
                    <Plus className="w-3 h-3" />
                    {selectedModels.length === 0 ? 'Add Models' : 'Add More'}
                  </Button>
                }
              />
            </div>
          </div>

          <Separator className="my-2" />

          {/* Action Area */}
          <div className="flex items-center justify-between pt-0">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              {selectedModels.length > 0 && (
                <>
                  <Check className="w-3 h-3 text-green-500" />
                  <span>Ready to compare {selectedModels.length} models</span>
                </>
              )}
            </div>
            <Button
              onClick={handleSubmit}
              disabled={!canSubmit}
              size="default"
              className={cn(
                "gap-1 min-w-[5.5rem] h-8",
                isComparing && "animate-pulse"
              )}
            >
              {isComparing ? (
                <>
                  <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Comparing...
                </>
              ) : (
                <>
                  <Play className="w-3 h-3" />
                  Compare
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      {selectedModels.length > 0 && (Object.keys(responses).length > 0 || loadingModels.size > 0) && (
        <div className="grid grid-cols-4 gap-1.5">
          <div className="text-center p-1.5 bg-muted/20 rounded text-xs">
            <div className="font-semibold">{selectedModels.length}</div>
            <div className="text-muted-foreground">Models</div>
          </div>
          <div className="text-center p-1.5 bg-muted/20 rounded text-xs">
            <div className="font-semibold">{wordCount}</div>
            <div className="text-muted-foreground">Words</div>
          </div>
          <div className="text-center p-1.5 bg-muted/20 rounded text-xs">
            <div className="font-semibold">
              {Object.keys(responses).length}
            </div>
            <div className="text-muted-foreground">Ready</div>
          </div>
          <div className="text-center p-1.5 bg-muted/20 rounded text-xs">
            <div className="font-semibold">{loadingModels.size}</div>
            <div className="text-muted-foreground">Running</div>
          </div>
        </div>
      )}
    </div>
  );
}
