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
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center space-x-2 text-sm">
            <MessageSquare className="w-4 h-4" />
            <span>Enter Your Prompt</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          {/* Prompt Templates Section */}
          {!promptsLoading && promptCategories.length > 0 && (
            <div className="space-y-2 p-2 bg-gray-50 dark:bg-gray-800 rounded border">
              <div className="flex items-center space-x-2">
                <BookOpen className="w-3 h-3 text-blue-600" />
                <Label className="text-xs font-medium text-gray-700 dark:text-gray-300">Prompt Templates</Label>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                {/* Category Selection */}
                <Select 
                  key={`category-${selectedCategory}`}
                  value={selectedCategory} 
                  onValueChange={handleCategoryChange}
                >
                  <SelectTrigger className="w-full">
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
                
                {/* Prompt Selection */}
                <Select 
                  key={`prompt-${selectedCategory}-${selectedPromptTemplate}`}
                  value={selectedPromptTemplate} 
                  onValueChange={handlePromptTemplateChange}
                  disabled={!selectedCategory}
                >
                  <SelectTrigger className="w-full">
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
          
          {/* Prompt Textarea */}
          <div className="relative">
            <Textarea
              value={prompt}
              onChange={handlePromptChange}
              onFocus={handlePromptFocus}
              rows={12}
              className={`min-h-48 pr-16 resize-none ${isDefaultPrompt ? 'text-gray-300 dark:text-gray-600' : ''}`}
              placeholder="Ask a question or provide a prompt to compare across selected AI models..."
              maxLength={32000}
            />
            <div className="absolute bottom-3 right-3 text-xs text-gray-400">
              {prompt.length}/32000
            </div>
          </div>
          
          {/* Action Bar */}
          <div className="flex justify-between items-center">
            <div className="text-xs text-gray-600 dark:text-gray-400">
              {selectedModels.length === 0 ? (
                "Select models to start comparing"
              ) : (
                `Ready to compare with ${selectedModels.length} model${selectedModels.length !== 1 ? 's' : ''}`
              )}
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                onClick={() => setShowPromptPreview(!showPromptPreview)}
                variant="outline"
                size="sm"
                className="text-xs"
              >
                <Eye className="w-3 h-3 mr-1" />
                {showPromptPreview ? 'Hide' : 'Show'} Raw Prompt
              </Button>
              <Button
                onClick={onSubmit}
                disabled={disabled || !prompt.trim() || selectedModels.length === 0}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2"
                size="sm"
              >
                {disabled ? (
                  <>
                    <div className="w-3 h-3 mr-1 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span className="text-sm">Comparing...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-3 h-3 mr-1" />
                    <span className="text-sm">Compare Models</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Raw Prompt Preview */}
      {showPromptPreview && (
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center space-x-2 text-sm">
              <BookOpen className="w-4 h-4" />
              <span>Raw Prompt Preview</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="bg-gray-50 dark:bg-gray-800 rounded-md p-3 border">
              <pre className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-mono">
                {prompt || 'No prompt entered'}
              </pre>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              This is the exact prompt that will be sent to all selected AI models.
            </p>
          </CardContent>
        </Card>
      )}
    </>
  );
}
