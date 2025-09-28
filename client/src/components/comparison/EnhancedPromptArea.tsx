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
  Check
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
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Main Prompt Card */}
      <Card className="relative">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <MessageSquare className="w-5 h-5 text-primary" />
              <span>AI Model Comparison</span>
            </div>
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <span>{wordCount} words</span>
              <span>•</span>
              <span>{characterCount} characters</span>
            </div>
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Prompt Textarea */}
          <div className="relative">
            <Textarea
              value={prompt}
              onChange={handlePromptChange}
              onFocus={handlePromptFocus}
              rows={8}
              className={cn(
                "min-h-48 resize-none text-base leading-relaxed",
                "focus:ring-2 focus:ring-primary/20 border-2",
                isDefaultPrompt && "text-muted-foreground",
                "text-lg" // Larger text for hero element
              )}
              placeholder="Enter your prompt here to compare across AI models..."
            />

            {/* Character/Word Count Overlay */}
            <div className="absolute bottom-3 right-3 flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {characterCount > 4000 && (
                  <AlertCircle className="w-3 h-3 mr-1 text-amber-500" />
                )}
                {characterCount}/8000
              </Badge>
            </div>
          </div>

          {/* Template Selection */}
          {!promptsLoading && promptCategories.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 bg-muted/30 rounded-lg border">
              <div className="flex items-center space-x-2">
                <BookOpen className="w-4 h-4 text-muted-foreground" />
                <Select value={selectedCategory} onValueChange={handleCategoryChange}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Choose template category" />
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
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select prompt template" />
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

          <Separator />

          {/* Model Selection Area */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <Zap className="w-4 h-4 text-primary" />
                Selected Models
                {selectedModels.length > 0 && (
                  <Badge variant="secondary">{selectedModels.length}</Badge>
                )}
              </h3>

              <div className="flex items-center gap-2">
                <FloatingModelPicker
                  models={models}
                  selectedModels={selectedModels}
                  onToggleModel={onToggleModel}
                  onSelectAllModels={onSelectAllModels}
                  onClearAllModels={onClearAllModels}
                  disabled={disabled}
                />

                {showPromptPreview && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowPromptPreview(false)}
                    className="gap-1"
                  >
                    <Eye className="w-4 h-4" />
                    Hide Preview
                  </Button>
                )}
              </div>
            </div>

            {/* Selected Model Pills */}
            {selectedModels.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {selectedModelObjects.map((model) => (
                  <ModelPill
                    key={model.id}
                    model={model}
                    isLoading={loadingModels.has(model.id)}
                    hasResponse={!!responses[model.id]}
                    onRemove={onToggleModel}
                    onClick={handleModelPillClick}
                    variant="default"
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                <Zap className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No models selected</p>
                <p className="text-xs">Click "Add Models" to get started</p>
              </div>
            )}
          </div>

          <Separator />

          {/* Action Area */}
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {selectedModels.length > 0 && (
                <>
                  <Check className="w-4 h-4 text-green-500" />
                  <span>Ready to compare across {selectedModels.length} models</span>
                </>
              )}
            </div>

            <Button
              onClick={handleSubmit}
              disabled={!canSubmit}
              size="lg"
              className={cn(
                "gap-2 min-w-32",
                isComparing && "animate-pulse"
              )}
            >
              {isComparing ? (
                <>
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Comparing...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Compare Models
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      {selectedModels.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-muted/30 rounded-lg">
            <div className="text-lg font-semibold">{selectedModels.length}</div>
            <div className="text-xs text-muted-foreground">Models Selected</div>
          </div>
          <div className="text-center p-3 bg-muted/30 rounded-lg">
            <div className="text-lg font-semibold">{wordCount}</div>
            <div className="text-xs text-muted-foreground">Words in Prompt</div>
          </div>
          <div className="text-center p-3 bg-muted/30 rounded-lg">
            <div className="text-lg font-semibold">
              {Object.keys(responses).length}
            </div>
            <div className="text-xs text-muted-foreground">Responses Ready</div>
          </div>
          <div className="text-center p-3 bg-muted/30 rounded-lg">
            <div className="text-lg font-semibold">{loadingModels.size}</div>
            <div className="text-xs text-muted-foreground">Currently Processing</div>
          </div>
        </div>
      )}
    </div>
  );
}