/**
 * Author: Claude Sonnet 4
 * Date: 2025-09-28
 * PURPOSE: Floating overlay component for model selection. Replaces sidebar approach
 *          with compact popover that provides quick model selection with filtering.
 *          Uses existing ModelSelector logic but in a space-efficient overlay format.
 *          Supports provider grouping, quick select all, and smart search/filtering.
 * SRP/DRY check: Pass - Single responsibility (floating model selection), reuses ModelSelector patterns
 * shadcn/ui: Pass - Uses Popover, Button, Card, Input, Checkbox components
 */

import React, { useState, useMemo } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Plus,
  Search,
  Brain,
  Crown,
  Check,
  Zap,
  Filter,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AIModel } from '@/types/ai-models';

interface FloatingModelPickerProps {
  models: AIModel[];
  selectedModels: string[];
  onToggleModel: (modelId: string) => void;
  onSelectAllModels: (modelIds: string[]) => void;
  onClearAllModels: () => void;
  disabled?: boolean;
  trigger?: React.ReactNode;
}

export function FloatingModelPicker({
  models,
  selectedModels,
  onToggleModel,
  onSelectAllModels,
  onClearAllModels,
  disabled = false,
  trigger
}: FloatingModelPickerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const [showOnlyPremium, setShowOnlyPremium] = useState(false);
  const [showOnlyReasoning, setShowOnlyReasoning] = useState(false);

  // Get provider icon
  const getProviderIcon = (provider: string) => {
    const icons: Record<string, string> = {
      'OpenAI': 'OAI',
      'Anthropic': 'ANT',
      'Gemini': 'GEM',
      'DeepSeek': 'DS',
      'xAI': 'XAI',
    };
    return icons[provider] || provider.substring(0, 2).toUpperCase();
  };

  // Filter models based on search and filters
  const filteredModels = useMemo(() => {
    return models.filter(model => {
      const matchesSearch = model.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           model.provider.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesProvider = !selectedProvider || model.provider === selectedProvider;
      const matchesPremium = !showOnlyPremium || model.premium;
      const matchesReasoning = !showOnlyReasoning || model.isReasoning;

      return matchesSearch && matchesProvider && matchesPremium && matchesReasoning;
    });
  }, [models, searchQuery, selectedProvider, showOnlyPremium, showOnlyReasoning]);

  // Group filtered models by provider
  const groupedModels = useMemo(() => {
    return filteredModels.reduce((acc, model) => {
      if (!acc[model.provider]) acc[model.provider] = [];
      acc[model.provider].push(model);
      return acc;
    }, {} as Record<string, AIModel[]>);
  }, [filteredModels]);

  // Get unique providers
  const providers = useMemo(() =>
    Array.from(new Set(models.map(m => m.provider))),
    [models]
  );

  // Provider selection handlers
  const handleProviderToggle = (provider: string, providerModels: AIModel[]) => {
    const providerModelIds = providerModels.map(m => m.id);
    const allSelected = providerModelIds.every(id => selectedModels.includes(id));

    if (allSelected) {
      // Deselect all models from this provider
      const newSelection = selectedModels.filter(id => !providerModelIds.includes(id));
      onSelectAllModels(newSelection);
    } else {
      // Select all models from this provider
      const newSelection = Array.from(new Set([...selectedModels, ...providerModelIds]));
      onSelectAllModels(newSelection);
    }
  };

  // Clear filters
  const clearFilters = () => {
    setSearchQuery('');
    setSelectedProvider('');
    setShowOnlyPremium(false);
    setShowOnlyReasoning(false);
  };

  const DefaultTrigger = (
    <Button
      variant="outline"
      className="gap-2 border-dashed border-2 hover:border-primary/50"
      disabled={disabled}
    >
      <Plus className="w-4 h-4" />
      Add Models
      {selectedModels.length > 0 && (
        <Badge variant="secondary" className="ml-1">
          {selectedModels.length}
        </Badge>
      )}
    </Button>
  );

  return (
    <Popover>
      <PopoverTrigger asChild>
        {trigger || DefaultTrigger}
      </PopoverTrigger>

      <PopoverContent
        className="w-96 p-0"
        side="bottom"
        align="start"
        sideOffset={8}
      >
        <Card className="border-0 shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-base">
              <div className="flex items-center gap-2">
                <Brain className="w-4 h-4 text-primary" />
                Select AI Models
              </div>
              <Badge variant="outline" className="text-xs">
                {selectedModels.length} selected
              </Badge>
            </CardTitle>

            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search models..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9"
              />
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-2 pt-2">
              {/* Provider Filter */}
              <select
                value={selectedProvider}
                onChange={(e) => setSelectedProvider(e.target.value)}
                className="text-xs border rounded px-2 py-1 bg-background"
              >
                <option value="">All Providers</option>
                {providers.map(provider => (
                  <option key={provider} value={provider}>{provider}</option>
                ))}
              </select>

              {/* Feature Filters */}
              <div className="flex items-center gap-1">
                <Checkbox
                  id="premium"
                  checked={showOnlyPremium}
                  onCheckedChange={(checked) => setShowOnlyPremium(checked === true)}
                />
                <label htmlFor="premium" className="text-xs cursor-pointer">Premium</label>
              </div>

              <div className="flex items-center gap-1">
                <Checkbox
                  id="reasoning"
                  checked={showOnlyReasoning}
                  onCheckedChange={(checked) => setShowOnlyReasoning(checked === true)}
                />
                <label htmlFor="reasoning" className="text-xs cursor-pointer">Reasoning</label>
              </div>

              {(searchQuery || selectedProvider || showOnlyPremium || showOnlyReasoning) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="h-6 px-2 text-xs"
                >
                  <X className="w-3 h-3 mr-1" />
                  Clear
                </Button>
              )}
            </div>
          </CardHeader>

          <Separator />

          <CardContent className="p-0">
            <ScrollArea className="h-96">
              <div className="p-3 space-y-4">
                {Object.entries(groupedModels).map(([provider, providerModels]) => (
                  <div key={provider} className="space-y-2">
                    {/* Provider Header */}
                    <div className="flex items-center justify-between py-1">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-5 w-5">
                          <AvatarFallback className={cn(
                            "text-xs font-bold text-white",
                            providerModels[0]?.color
                          )}>
                            {getProviderIcon(provider)}
                          </AvatarFallback>
                        </Avatar>
                        <h4 className="text-sm font-medium">{provider}</h4>
                        <Badge variant="outline" className="text-xs h-5">
                          {providerModels.length}
                        </Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleProviderToggle(provider, providerModels)}
                        className="h-6 px-2 text-xs"
                      >
                        {providerModels.every(model => selectedModels.includes(model.id))
                          ? 'Deselect' : 'Select All'}
                      </Button>
                    </div>

                    {/* Models List */}
                    <div className="space-y-1 pl-7">
                      {providerModels.map((model) => (
                        <div
                          key={model.id}
                          className={cn(
                            "flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors",
                            "hover:bg-accent/50",
                            selectedModels.includes(model.id) && "bg-primary/5 border border-primary/20"
                          )}
                          onClick={() => onToggleModel(model.id)}
                        >
                          <Checkbox
                            checked={selectedModels.includes(model.id)}
                            onCheckedChange={() => onToggleModel(model.id)}
                            className="pointer-events-none"
                          />

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1">
                              <span className="text-sm font-medium truncate">
                                {model.name}
                              </span>
                              {model.premium && <Crown className="w-3 h-3 text-yellow-500" />}
                              {model.isReasoning && <Brain className="w-3 h-3 text-blue-500" />}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              ${model.cost?.input}/M • ${model.cost?.output}/M
                            </div>
                          </div>

                          {selectedModels.includes(model.id) && (
                            <Check className="w-4 h-4 text-primary" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                {filteredModels.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Filter className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No models match your filters</p>
                    <Button
                      variant="link"
                      size="sm"
                      onClick={clearFilters}
                      className="text-xs mt-1"
                    >
                      Clear filters
                    </Button>
                  </div>
                )}
              </div>
            </ScrollArea>

            <Separator />

            {/* Quick Actions */}
            <div className="p-3 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onSelectAllModels(models.map(m => m.id))}
                  disabled={selectedModels.length === models.length}
                  className="text-xs h-8"
                >
                  Select All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onClearAllModels}
                  disabled={selectedModels.length === 0}
                  className="text-xs h-8"
                >
                  Clear All
                </Button>
              </div>

              {/* Quick Select Presets */}
              <div className="flex flex-wrap gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const gptModels = models.filter(m => m.provider === 'OpenAI').map(m => m.id);
                    onSelectAllModels([...new Set([...selectedModels, ...gptModels])]);
                  }}
                  className="text-xs h-6 px-2"
                >
                  + All OpenAI
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const claudeModels = models.filter(m => m.provider === 'Anthropic').map(m => m.id);
                    onSelectAllModels([...new Set([...selectedModels, ...claudeModels])]);
                  }}
                  className="text-xs h-6 px-2"
                >
                  + All Claude
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const reasoningModels = models.filter(m => m.isReasoning).map(m => m.id);
                    onSelectAllModels([...new Set([...selectedModels, ...reasoningModels])]);
                  }}
                  className="text-xs h-6 px-2"
                >
                  + Reasoning
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </PopoverContent>
    </Popover>
  );
}