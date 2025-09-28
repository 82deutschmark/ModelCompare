/*
 * Author: Cascade (GPT-5 medium reasoning)
 * Date: 2025-09-27T17:06:47-04:00
 * PURPOSE: Modular prompt input component extracted from home.tsx monolith.
 *          Handles prompt textarea, template selection, character counting, validation.
 *          Uses shadcn/ui components and maintains all template functionality from original.
 * SRP/DRY check: Pass - Single responsibility (prompt input), reuses shadcn/ui components
 * shadcn/ui: Pass - Uses Card, Textarea, Select, Button, Badge components
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { MessageSquare, BookOpen, Eye, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { parsePromptsFromMarkdown, type PromptCategory } from "@/lib/promptParser";

interface PromptInputProps {
  prompt: string;
  setPrompt: (prompt: string) => void;
  onSubmit: () => void;
  disabled: boolean;
  selectedModels: string[];
  showPromptPreview: boolean;
  setShowPromptPreview: (show: boolean) => void;
}

const DEFAULT_PROMPT = `• Summarize all of human knowledge in one word
• Summarize every book ever written in one sentence
• Define what it means to be "moral" in 5 words. Think deeply. Do not hedge.
• What do you want? Answer in 4 words.
• What is your favorite obscure fact in the world? Use as few words as possible.`;

export function PromptInput({
  prompt,
  setPrompt,
  onSubmit,
  disabled,
  selectedModels,
  showPromptPreview,
  setShowPromptPreview
}: PromptInputProps) {
  const { toast } = useToast();
  
  // Template state management
  const [isDefaultPrompt, setIsDefaultPrompt] = useState(prompt === DEFAULT_PROMPT);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedPromptTemplate, setSelectedPromptTemplate] = useState<string>('');
  const [promptCategories, setPromptCategories] = useState<PromptCategory[]>([]);
  const [promptsLoading, setPromptsLoading] = useState(true);

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

  // Prompt template handlers
  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setSelectedPromptTemplate(''); // Reset prompt selection when category changes
  };

  const handlePromptTemplateChange = (promptId: string) => {
    setSelectedPromptTemplate(promptId);
    const category = promptCategories.find(cat => cat.id === selectedCategory);
    const selectedPrompt = category?.prompts.find(p => p.id === promptId);
    if (selectedPrompt) {
      setPrompt(selectedPrompt.content);
      setIsDefaultPrompt(false);
      toast({
        title: 'Prompt Template Applied',
        description: `Applied "${selectedPrompt.name}" template`,
      });
    }
  };

  const clearPromptSelection = () => {
    setSelectedCategory('');
    setSelectedPromptTemplate('');
    setPrompt(DEFAULT_PROMPT);
    setIsDefaultPrompt(true);
  };

  const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    if (value.length <= 32000) {
      setPrompt(value);
      setIsDefaultPrompt(value === DEFAULT_PROMPT);
    }
  };

  const handlePromptFocus = () => {
    if (isDefaultPrompt) {
      setPrompt('');
      setIsDefaultPrompt(false);
    }
  };

  // Get available prompts for selected category
  const availablePrompts = selectedCategory 
    ? promptCategories.find(cat => cat.id === selectedCategory)?.prompts || []
    : [];

  return (
    <>
      {/* Main Prompt Input Card */}
      <Card className="shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <MessageSquare className="w-5 h-5 text-primary" />
              <span className="text-lg font-semibold">Enter Your Prompt</span>
            </div>
            <div className="text-sm text-muted-foreground">
              {prompt.length}/32,000 chars
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          {/* Enhanced Prompt Templates Section */}
          {!promptsLoading && promptCategories.length > 0 && (
            <div className="space-y-3 p-4 bg-muted/50 rounded-lg border">
              <div className="flex items-center space-x-2">
                <BookOpen className="w-4 h-4 text-primary" />
                <Label className="text-sm font-semibold">Prompt Templates</Label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Category Selection */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Category</Label>
                  <Select
                    key={`category-${selectedCategory}`}
                    value={selectedCategory}
                    onValueChange={handleCategoryChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose category..." />
                    </SelectTrigger>
                    <SelectContent>
                      {promptCategories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Prompt Selection */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Template</Label>
                  <Select
                    key={`prompt-${selectedCategory}-${selectedPromptTemplate}`}
                    value={selectedPromptTemplate}
                    onValueChange={handlePromptTemplateChange}
                    disabled={!selectedCategory}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select prompt..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availablePrompts.map((prompt) => (
                        <SelectItem key={prompt.id} value={prompt.id}>
                          {prompt.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Clear Selection Button */}
              {(selectedCategory || selectedPromptTemplate) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearPromptSelection}
                  className="w-full"
                >
                  Clear Selection & Use Custom Prompt
                </Button>
              )}
            </div>
          )}
          
          {/* Enhanced Prompt Textarea */}
          <div className="space-y-3">
            <div className="relative">
              <Textarea
                value={prompt}
                onChange={handlePromptChange}
                onFocus={handlePromptFocus}
                rows={10}
                className={cn(
                  "min-h-64 resize-none text-sm leading-relaxed",
                  isDefaultPrompt && "text-muted-foreground"
                )}
                placeholder="Ask a question or provide a prompt to compare across selected AI models..."
                maxLength={32000}
              />
            </div>

            {/* Status and Action Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center space-x-4">
                <div className="text-sm text-muted-foreground">
                  {selectedModels.length === 0 ? (
                    <span className="text-destructive">Select models to start comparing</span>
                  ) : (
                    <span className="text-foreground font-medium">
                      Ready to compare with {selectedModels.length} model{selectedModels.length !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <Button
                  onClick={() => setShowPromptPreview(!showPromptPreview)}
                  variant="outline"
                  size="sm"
                  className="text-xs"
                >
                  <Eye className="w-3 h-3 mr-2" />
                  {showPromptPreview ? 'Hide' : 'Show'} Raw Prompt
                </Button>
                <Button
                  onClick={onSubmit}
                  disabled={disabled || !prompt.trim() || selectedModels.length === 0}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-2 font-medium"
                  size="sm"
                >
                  {disabled ? (
                    <>
                      <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      <span>Comparing...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 mr-2" />
                      <span>Compare Models</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Raw Prompt Preview */}
      {showPromptPreview && (
        <Card className="shadow-sm border-muted">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center space-x-2">
              <BookOpen className="w-4 h-4 text-primary" />
              <span className="text-base">Raw Prompt Preview</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            <div className="bg-muted/50 rounded-lg p-4 border">
              <pre className="text-sm text-foreground whitespace-pre-wrap font-mono leading-relaxed">
                {prompt || 'No prompt entered'}
              </pre>
            </div>
            <div className="flex items-start space-x-2 text-xs text-muted-foreground">
              <div className="w-1 h-1 rounded-full bg-primary mt-2 flex-shrink-0"></div>
              <p>
                This is the exact prompt that will be sent to all selected AI models.
                Character count: <span className="font-medium">{prompt.length}</span>
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}
