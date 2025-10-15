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
  isStreaming?: boolean;
}

export const ModelConfigurationPanel: React.FC<ModelConfigPanelProps> = ({
  configuration,
  onConfigurationChange,
  modelName,
  modelProvider,
  isStreaming = false
}) => {
  const updateConfig = (updates: Partial<ModelConfiguration>) => {
    onConfigurationChange({ ...configuration, ...updates });
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center space-x-2 text-lg">
          <Settings className="w-5 h-5" />
          <span>Model Configuration</span>
          {modelName && (
            <>
              <Separator orientation="vertical" className="h-6" />
              <div className="flex items-center space-x-2">
                <span className="font-normal text-muted-foreground">{modelName}</span>
                {modelProvider && (
                  <Badge variant="outline" className="text-xs">
                    {modelProvider}
                  </Badge>
                )}
              </div>
            </>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Reasoning Configuration */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Brain className="w-4 h-4" />
            <Label className="text-sm font-medium">Reasoning Configuration</Label>
            <Switch
              checked={configuration.enableReasoning}
              onCheckedChange={(enabled) => updateConfig({ enableReasoning: enabled })}
              disabled={isStreaming}
            />
          </div>

          {configuration.enableReasoning && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pl-6">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Reasoning Effort</Label>
                <Select
                  value={configuration.reasoningEffort}
                  onValueChange={(value: any) => updateConfig({ reasoningEffort: value })}
                  disabled={isStreaming}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="minimal">Minimal</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Reasoning Summary</Label>
                <Select
                  value={configuration.reasoningSummary}
                  onValueChange={(value: any) => updateConfig({ reasoningSummary: value })}
                  disabled={isStreaming}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Auto</SelectItem>
                    <SelectItem value="detailed">Detailed</SelectItem>
                    <SelectItem value="concise">Concise</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Text Verbosity</Label>
                <Select
                  value={configuration.textVerbosity}
                  onValueChange={(value: any) => updateConfig({ textVerbosity: value })}
                  disabled={isStreaming}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>

        <Separator />

        {/* Generation Settings */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Zap className="w-4 h-4" />
            <Label className="text-sm font-medium">Generation Settings</Label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pl-6">
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Thermometer className="w-4 h-4" />
                <Label className="text-sm">Temperature</Label>
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
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Conservative (0.0)</span>
                <span>Creative (2.0)</span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Hash className="w-4 h-4" />
                <Label className="text-sm">Max Tokens</Label>
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
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>1K</span>
                <span>128K</span>
              </div>
            </div>
          </div>
        </div>

        <Separator />

        {/* Advanced Settings */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Eye className="w-4 h-4" />
            <Label className="text-sm font-medium">Advanced Settings</Label>
          </div>

          <div className="space-y-3 pl-6">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Structured Output</Label>
              <Switch
                checked={configuration.enableStructuredOutput}
                onCheckedChange={(enabled) => updateConfig({ enableStructuredOutput: enabled })}
                disabled={isStreaming}
              />
            </div>

            <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
              <p className="mb-2"><strong>Reasoning Effort:</strong> Controls the depth of AI reasoning process</p>
              <p className="mb-2"><strong>Text Verbosity:</strong> Controls how much reasoning detail is included in responses</p>
              <p><strong>Temperature:</strong> Controls response randomness (0.0 = deterministic, 2.0 = creative)</p>
            </div>
          </div>
        </div>

        {/* Current Configuration Summary */}
        <div className="bg-muted/30 p-4 rounded-lg">
          <Label className="text-sm font-medium mb-2 block">Current Configuration Summary</Label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
            <div>
              <span className="text-muted-foreground">Reasoning:</span>
              <div className="font-medium">{configuration.enableReasoning ? 'Enabled' : 'Disabled'}</div>
            </div>
            <div>
              <span className="text-muted-foreground">Effort:</span>
              <div className="font-medium capitalize">{configuration.reasoningEffort}</div>
            </div>
            <div>
              <span className="text-muted-foreground">Temp:</span>
              <div className="font-medium">{configuration.temperature.toFixed(1)}</div>
            </div>
            <div>
              <span className="text-muted-foreground">Max Tokens:</span>
              <div className="font-medium">{configuration.maxTokens.toLocaleString()}</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
