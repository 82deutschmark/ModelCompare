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
      size="sm"
      className="gap-1.5 border-dashed border-2 hover:border-primary/50 h-7"
      disabled={disabled}
    >
      <Plus className="w-3 h-3" />
      Add Models
      {selectedModels.length > 0 && (
        <Badge variant="secondary" className="ml-0.5 h-4 px-1.5 text-xs">
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
        className="w-80 p-0"
        side="bottom"
        align="start"
        sideOffset={4}
      >
        <Card className="border-0 shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-1.5">
                <Brain className="w-3 h-3 text-primary" />
                Select Models
              </div>
              <Badge variant="outline" className="text-xs h-4 px-1.5">
                {selectedModels.length}
              </Badge>
            </CardTitle>

            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-muted-foreground" />
              <Input
                placeholder="Search models..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-7 h-7 text-xs"
              />
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {/* Provider Filter */}
              <select
                value={selectedProvider}
                onChange={(e) => setSelectedProvider(e.target.value)}
                className="text-xs border rounded px-1.5 py-0.5 bg-background h-6"
              >
                <option value="">All</option>
                {providers.map(provider => (
                  <option key={provider} value={provider}>{provider}</option>
                ))}
              </select>

              {/* Feature Filters */}
              <div className="flex items-center gap-0.5">
                <Checkbox
                  id="premium"
                  checked={showOnlyPremium}
                  onCheckedChange={(checked) => setShowOnlyPremium(checked === true)}
                  className="h-3 w-3"
                />
                <label htmlFor="premium" className="text-xs cursor-pointer">Premium</label>
              </div>

              <div className="flex items-center gap-0.5">
                <Checkbox
                  id="reasoning"
                  checked={showOnlyReasoning}
                  onCheckedChange={(checked) => setShowOnlyReasoning(checked === true)}
                  className="h-3 w-3"
                />
                <label htmlFor="reasoning" className="text-xs cursor-pointer">Reasoning</label>
              </div>

              {(searchQuery || selectedProvider || showOnlyPremium || showOnlyReasoning) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="h-5 px-1.5 text-xs"
                >
                  <X className="w-2.5 h-2.5 mr-0.5" />
                  Clear
                </Button>
              )}
            </div>
          </CardHeader>

          <Separator />

          <CardContent className="p-0">
            <ScrollArea className="h-72">
              <div className="p-2 space-y-3">
                {Object.entries(groupedModels).map(([provider, providerModels]) => (
                  <div key={provider} className="space-y-1.5">
                    {/* Provider Header */}
                    <div className="flex items-center justify-between py-0.5">
                      <div className="flex items-center gap-1.5">
                        <Avatar className="h-4 w-4">
                          <AvatarFallback className={cn(
                            "text-xs font-bold text-white",
                            providerModels[0]?.color
                          )}>
                            {getProviderIcon(provider)}
                          </AvatarFallback>
                        </Avatar>
                        <h4 className="text-xs font-medium">{provider}</h4>
                        <Badge variant="outline" className="text-xs h-4 px-1">
                          {providerModels.length}
                        </Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleProviderToggle(provider, providerModels)}
                        className="h-5 px-1.5 text-xs"
                      >
                        {providerModels.every(model => selectedModels.includes(model.id))
                          ? 'Deselect' : 'All'}
                      </Button>
                    </div>

                    {/* Models List */}
                    <div className="space-y-0.5 pl-5">
                      {providerModels.map((model) => (
                        <div
                          key={model.id}
                          className={cn(
                            "flex items-center gap-2 p-1.5 rounded cursor-pointer transition-colors",
                            "hover:bg-accent/50",
                            selectedModels.includes(model.id) && "bg-primary/5 border border-primary/20"
                          )}
                          onClick={() => onToggleModel(model.id)}
                        >
                          <Checkbox
                            checked={selectedModels.includes(model.id)}
                            onCheckedChange={() => onToggleModel(model.id)}
                            className="pointer-events-none h-3 w-3"
                          />

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1">
                              <span className="text-xs font-medium truncate">
                                {model.name}
                              </span>
                              {model.premium && <Crown className="w-2.5 h-2.5 text-yellow-500" />}
                              {model.isReasoning && <Brain className="w-2.5 h-2.5 text-blue-500" />}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              ${model.cost?.input}/M • ${model.cost?.output}/M
                            </div>
                          </div>

                          {selectedModels.includes(model.id) && (
                            <Check className="w-3 h-3 text-primary" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                {filteredModels.length === 0 && (
                  <div className="text-center py-6 text-muted-foreground">
                    <Filter className="w-6 h-6 mx-auto mb-1 opacity-50" />
                    <p className="text-xs">No models match filters</p>
                    <Button
                      variant="link"
                      size="sm"
                      onClick={clearFilters}
                      className="text-xs mt-0.5 h-5"
                    >
                      Clear filters
                    </Button>
                  </div>
                )}
              </div>
            </ScrollArea>

            <Separator />

            {/* Quick Actions */}
            <div className="p-2 space-y-1.5">
              <div className="grid grid-cols-2 gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onSelectAllModels(models.map(m => m.id))}
                  disabled={selectedModels.length === models.length}
                  className="text-xs h-6"
                >
                  Select All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onClearAllModels}
                  disabled={selectedModels.length === 0}
                  className="text-xs h-6"
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
                  className="text-xs h-5 px-1.5"
                >
                  + OpenAI
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const claudeModels = models.filter(m => m.provider === 'Anthropic').map(m => m.id);
                    onSelectAllModels([...new Set([...selectedModels, ...claudeModels])]);
                  }}
                  className="text-xs h-5 px-1.5"
                >
                  + Claude
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const reasoningModels = models.filter(m => m.isReasoning).map(m => m.id);
                    onSelectAllModels([...new Set([...selectedModels, ...reasoningModels])]);
                  }}
                  className="text-xs h-5 px-1.5"
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