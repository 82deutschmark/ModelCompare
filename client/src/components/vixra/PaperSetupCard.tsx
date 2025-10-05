/**
 * Author: Cascade using Claude Sonnet 4
 * Date: 2025-10-04
 * PURPOSE: Hero card for minimal paper setup with inline model selection.
 *          Provides Author (required with default), Science Category dropdown with random option,
 *          optional Title field, single model selection as pill, and mode toggle (manual/auto).
 *          Primary CTA button initiates paper generation.
 * SRP/DRY check: Pass - Single responsibility (paper configuration input)
 * shadcn/ui: Pass - Uses Select, Input, Button, Switch, Badge, Card, Label
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Plus, Zap, Settings, FileText, Sparkles, Dices } from "lucide-react";
import type { AIModel } from "@/types/ai-models";

interface PaperSetupCardProps {
  // Paper config
  author: string;
  onAuthorChange: (value: string) => void;
  scienceCategory: string;
  onCategoryChange: (value: string) => void;
  onRandomCategory: () => void;
  title: string;
  onTitleChange: (value: string) => void;
  categories: string[];
  
  // Model selection
  selectedModel: string;
  models: AIModel[];
  onModelSelect: (modelId: string) => void;
  onOpenModelPicker: () => void;
  
  // Mode & generation
  isAutoMode: boolean;
  onModeToggle: (enabled: boolean) => void;
  onGenerate: () => void;
  isGenerating: boolean;
  disabled?: boolean;
}

export function PaperSetupCard({
  author,
  onAuthorChange,
  scienceCategory,
  onCategoryChange,
  onRandomCategory,
  title,
  onTitleChange,
  categories,
  selectedModel,
  models,
  onModelSelect,
  onOpenModelPicker,
  isAutoMode,
  onModeToggle,
  onGenerate,
  isGenerating,
  disabled = false
}: PaperSetupCardProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const selectedModelData = models.find(m => m.id === selectedModel);
  const canGenerate = !disabled && !isGenerating && author.trim() !== '' && scienceCategory !== '';

  return (
    <Card className="border-2 border-primary/20 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2 text-2xl">
          <FileText className="w-6 h-6 text-primary" />
          <span>Generate Satirical Research Paper</span>
          <Sparkles className="w-5 h-5 text-yellow-500 ml-auto" />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Author Name - Required */}
        <div>
          <Label htmlFor="author" className="text-base font-semibold">
            Author Name *
          </Label>
          <Input
            id="author"
            value={author}
            onChange={(e) => onAuthorChange(e.target.value)}
            placeholder="Dr. Max Power"
            className="mt-2 text-base"
            disabled={isGenerating}
          />
          <p className="text-xs text-muted-foreground mt-1">
            The satirical author of this groundbreaking research
          </p>
        </div>

        {/* Science Category - Required with Random Button */}
        <div>
          <Label htmlFor="category" className="text-base font-semibold">
            What field should this paper explore? *
          </Label>
          <div className="flex gap-2 mt-2">
            <Select 
              value={scienceCategory} 
              onValueChange={onCategoryChange}
              disabled={isGenerating}
            >
              <SelectTrigger id="category" className="flex-1 text-base">
                <SelectValue placeholder="Select a science category..." />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={onRandomCategory}
                    disabled={isGenerating}
                    className="shrink-0"
                  >
                    <Dices className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Pick random category</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Choose a field or randomize for unexpected results
          </p>
        </div>

        {/* Advanced Settings Toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowAdvanced(!showAdvanced)}
          disabled={isGenerating}
          className="w-full justify-start"
        >
          <Settings className="w-4 h-4 mr-2" />
          {showAdvanced ? 'Hide' : 'Show'} Advanced Settings
        </Button>

        {showAdvanced && (
          <div className="space-y-4 pl-4 border-l-2 border-muted">
            <div>
              <Label htmlFor="title" className="text-sm font-medium">
                Paper Title (Optional)
              </Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => onTitleChange(e.target.value)}
                placeholder="Leave blank for AI-generated title"
                className="mt-2"
                disabled={isGenerating}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Custom title or let the AI create something absurdly academic
              </p>
            </div>
          </div>
        )}

        {/* Model Selection Pills */}
        <div>
          <Label className="text-sm font-medium">AI Model</Label>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {selectedModelData ? (
              <Badge 
                variant="secondary" 
                className="px-3 py-1.5 text-sm font-medium cursor-pointer hover:bg-secondary/80"
                onClick={onOpenModelPicker}
              >
                {selectedModelData.name}
              </Badge>
            ) : (
              <Badge variant="outline" className="px-3 py-1.5 text-sm">
                No model selected
              </Badge>
            )}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={onOpenModelPicker}
                    disabled={isGenerating}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Change Model
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Select a different AI model</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {isAutoMode 
              ? 'This model will generate all sections automatically' 
              : 'Selected model for section generation'}
          </p>
        </div>

        {/* Mode Toggle */}
        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
          <div className="space-y-1">
            <Label htmlFor="auto-mode" className="font-medium cursor-pointer">
              Generation Mode
            </Label>
            <p className="text-xs text-muted-foreground">
              {isAutoMode 
                ? 'Automatically generate all sections sequentially' 
                : 'Generate sections one at a time with your control'}
            </p>
          </div>
          <div className="flex items-center gap-3 ml-4">
            <span className="text-sm text-muted-foreground">Manual</span>
            <Switch 
              id="auto-mode" 
              checked={isAutoMode} 
              onCheckedChange={onModeToggle}
              disabled={isGenerating}
            />
            <span className="text-sm font-semibold">Auto</span>
            <Zap className={`w-4 h-4 ${isAutoMode ? 'text-yellow-500' : 'text-muted-foreground'}`} />
          </div>
        </div>

        {/* Primary CTA */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <Button
                  onClick={onGenerate}
                  disabled={!canGenerate}
                  className="w-full h-12 text-lg font-semibold"
                  size="lg"
                >
                  {isGenerating ? (
                    <>
                      <span className="animate-pulse">Generating...</span>
                    </>
                  ) : (
                    <>🚀 Generate Paper</>
                  )}
                </Button>
              </div>
            </TooltipTrigger>
            {!canGenerate && !isGenerating && (
              <TooltipContent>
                <p>
                  {!author.trim() && 'Please enter an author name. '}
                  {!scienceCategory && 'Please select a science category.'}
                </p>
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>

        {isGenerating && (
          <div className="text-center text-sm text-muted-foreground animate-pulse">
            ✨ Crafting your satirical masterpiece...
          </div>
        )}
      </CardContent>
    </Card>
  );
}
