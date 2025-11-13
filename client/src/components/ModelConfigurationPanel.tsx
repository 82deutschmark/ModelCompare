import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Brain, Settings, Zap, Thermometer, Hash, Eye } from 'lucide-react';

export interface ModelConfiguration {
  // Reasoning settings
  reasoningEffort: 'minimal' | 'low' | 'medium' | 'high';
  reasoningSummary: 'auto' | 'detailed' | 'concise';
  textVerbosity: 'low' | 'medium' | 'high';

  // Generation settings
  temperature: number;
  maxTokens: number;

  // Advanced settings
  enableReasoning: boolean;
  enableStructuredOutput: boolean;
}

interface ModelConfigPanelProps {
  configuration: ModelConfiguration;
  onConfigurationChange: (config: ModelConfiguration) => void;
  modelName?: string;
  modelProvider?: string;
  modelSupportsTemperature?: boolean;
  modelIsReasoning?: boolean;
  modelSupportsStructuredOutput?: boolean;
  isStreaming?: boolean;
}

export const ModelConfigurationPanel: React.FC<ModelConfigPanelProps> = ({
  configuration,
  onConfigurationChange,
  modelName,
  modelProvider,
  modelSupportsTemperature = true,
  modelIsReasoning = false,
  modelSupportsStructuredOutput = false,
  isStreaming = false
}) => {
  const updateConfig = (updates: Partial<ModelConfiguration>) => {
    onConfigurationChange({ ...configuration, ...updates });
  };

  return (
    <div className="w-full space-y-3">
      {/* Header */}
      {modelName && (
        <div className="flex items-center space-x-2 pb-2 border-b">
          <Settings className="w-3 h-3" />
          <span className="text-xs font-medium">{modelName}</span>
          {modelProvider && (
            <Badge variant="outline" className="text-xs">
              {modelProvider}
            </Badge>
          )}
        </div>
      )}

      <div className="space-y-3">
        {/* Reasoning Configuration - Always enabled for reasoning models */}
        {modelIsReasoning && (
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Brain className="w-3 h-3" />
              <Label className="text-xs font-medium">Reasoning (Always On)</Label>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Effort</Label>
                <Select
                  value={configuration.reasoningEffort}
                  onValueChange={(value: any) => updateConfig({ reasoningEffort: value, enableReasoning: true })}
                  disabled={isStreaming}
                >
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="minimal">Min</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Med</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Summary</Label>
                <Select
                  value={configuration.reasoningSummary}
                  onValueChange={(value: any) => updateConfig({ reasoningSummary: value, enableReasoning: true })}
                  disabled={isStreaming}
                >
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Auto</SelectItem>
                    <SelectItem value="detailed">Detailed</SelectItem>
                    <SelectItem value="concise">Concise</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Verbosity</Label>
                <Select
                  value={configuration.textVerbosity}
                  onValueChange={(value: any) => updateConfig({ textVerbosity: value, enableReasoning: true })}
                  disabled={isStreaming}
                >
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Med</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}

        {/* Generation Settings */}
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Zap className="w-3 h-3" />
            <Label className="text-xs font-medium">Generation</Label>
          </div>

          <div className="grid grid-cols-2 gap-3 pl-4">
            {/* Temperature - Only for models that support it */}
            {modelSupportsTemperature && (
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Thermometer className="w-3 h-3" />
                  <Label className="text-xs">Temp</Label>
                  <Badge variant="outline" className="text-xs">
                    {configuration.temperature.toFixed(1)}
                  </Badge>
                </div>
                <Slider
                  value={[configuration.temperature]}
                  onValueChange={([value]) => updateConfig({ temperature: value })}
                  min={0}
                  max={2}
                  step={0.1}
                  className="w-full"
                  disabled={isStreaming}
                />
              </div>
            )}

            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Hash className="w-3 h-3" />
                <Label className="text-xs">Max Tokens</Label>
                <Badge variant="outline" className="text-xs">
                  {configuration.maxTokens.toLocaleString()}
                </Badge>
              </div>
              <Slider
                value={[configuration.maxTokens]}
                onValueChange={([value]) => updateConfig({ maxTokens: value })}
                min={1000}
                max={128000}
                step={1000}
                className="w-full"
                disabled={isStreaming}
              />
            </div>
          </div>
        </div>

        {/* Advanced Settings - Only show if model supports structured output */}
        {modelSupportsStructuredOutput && (
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Eye className="w-3 h-3" />
              <Label className="text-xs font-medium">Advanced</Label>
            </div>

            <div className="pl-4 space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Structured Output</Label>
                <Switch
                  checked={configuration.enableStructuredOutput}
                  onCheckedChange={(enabled) => updateConfig({ enableStructuredOutput: enabled })}
                  disabled={isStreaming}
                />
              </div>
            </div>
          </div>
        )}

        {/* Compact Configuration Summary */}
        <div className="bg-muted/20 p-2 rounded text-xs">
          <div className="grid grid-cols-3 gap-1">
            {modelIsReasoning && (
              <div>
                <span className="text-muted-foreground">R:</span>
                <div className="font-medium">{configuration.enableReasoning ? 'On' : 'Off'}</div>
              </div>
            )}
            {modelSupportsTemperature && (
              <div>
                <span className="text-muted-foreground">T:</span>
                <div className="font-medium">{configuration.temperature.toFixed(1)}</div>
              </div>
            )}
            <div>
              <span className="text-muted-foreground">Max:</span>
              <div className="font-medium">{(configuration.maxTokens/1000).toFixed(0)}K</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
