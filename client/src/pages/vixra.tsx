/**
 * Vixra Mode Page - Satirical AI-Generated Research Papers
 * 
 * Simplified implementation that uses the same working patterns as home page:
 * - Uses /api/models/respond endpoint (same as home page) 
 * - Auto-generates missing variables before sending prompts
 * - Sequential section generation with simple UI controls
 * - Reuses existing components (ModelButton, MessageCard, ExportButton)
 * 
 * Author: Claude Code
 * Date: August 18, 2025
 */

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Brain, Zap, Settings, ChevronDown, ChevronUp, Download, Copy, Printer } from "lucide-react";
import { ModelButton } from "@/components/ModelButton";
import { ResponseCard } from "@/components/ResponseCard";
import { AppNavigation } from "@/components/AppNavigation";
import { ExportButton } from "@/components/ExportButton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { autoGenerateVariables, substituteVariables, parseVixraTemplates, downloadVixraPaper, copyVixraPaper, printVixraPaper } from "@/lib/vixraUtils";
import type { AIModel, ModelResponse } from "@/types/ai-models";

const SCIENCE_CATEGORIES = [
  'Physics - Quantum Physics',
  'Mathematics - General Mathematics', 
  'Biology - Mind Science',
  'Computational Science - Artificial Intelligence',
  'Chemistry',
  'General Science and Philosophy'
];

// Define the sections in dependency order
const SECTION_ORDER = [
  { id: 'abstract', name: 'Abstract Generation', dependencies: [] },
  { id: 'introduction', name: 'Introduction Section', dependencies: ['abstract'] },
  { id: 'methodology', name: 'Methodology Section', dependencies: ['introduction'] },
  { id: 'results', name: 'Results Section', dependencies: ['abstract', 'methodology'] },
  { id: 'discussion', name: 'Discussion Section', dependencies: ['results'] },
  { id: 'conclusion', name: 'Conclusion Section', dependencies: ['discussion'] },
  { id: 'citations', name: 'Citations Generator', dependencies: ['abstract', 'results'] },
  { id: 'acknowledgments', name: 'Acknowledgments Section', dependencies: ['conclusion'] },
];

export default function VixraPage() {
  const { toast } = useToast();
  
  // State for variables (user input) - simplified to core fields
  const [variables, setVariables] = useState<Record<string, string>>({
    ResearcherName: '',
    ScienceCategory: SCIENCE_CATEGORIES[0] || '',
    Title: '',
    Authors: ''
  });
  
  // State for section generation
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [currentSection, setCurrentSection] = useState('abstract');
  const [sectionResponses, setSectionResponses] = useState<Record<string, ModelResponse>>({});
  const [loadingModels, setLoadingModels] = useState<string[]>([]);
  const [promptTemplates, setPromptTemplates] = useState<Map<string, string>>(new Map());
  const [showVariablesPanel, setShowVariablesPanel] = useState(true);

  // Fetch available models
  const { data: models = [], isLoading: modelsLoading } = useQuery({
    queryKey: ['/api/models'],
    queryFn: async () => {
      const response = await fetch('/api/models');
      if (!response.ok) throw new Error('Failed to fetch models');
      return response.json() as Promise<AIModel[]>;
    },
  });

  // Load Vixra prompt templates
  useEffect(() => {
    const loadVixraTemplates = async () => {
      try {
        const response = await fetch('/docs/vixra-prompts.md');
        const markdownContent = await response.text();
        
        // Parse section templates using utility function
        const templates = parseVixraTemplates(markdownContent);
        setPromptTemplates(templates);
        
        if (templates.size === 0) {
          toast({
            title: 'No templates found',
            description: 'Could not parse section templates from vixra-prompts.md',
            variant: 'destructive',
          });
        }
      } catch (error) {
        console.error('Failed to load Vixra templates:', error);
        toast({
          title: 'Failed to load templates',
          description: 'Could not load Vixra section templates.',
          variant: 'destructive',
        });
      }
    };

    loadVixraTemplates();
  }, [toast]);

  // Individual model response mutation (same pattern as home page)
  const modelResponseMutation = useMutation({
    mutationFn: async (data: { prompt: string; modelId: string; sectionId: string }) => {
      const response = await apiRequest('POST', '/api/models/respond', {
        modelId: data.modelId,
        prompt: data.prompt
      });
      const responseData = await response.json() as ModelResponse;
      return { ...responseData, sectionId: data.sectionId, modelId: data.modelId };
    },
    onMutate: (variables) => {
      setLoadingModels(prev => [...prev, variables.modelId]);
    },
    onSuccess: (data) => {
      setLoadingModels(prev => prev.filter(id => id !== data.modelId));
      
      setSectionResponses(prev => ({
        ...prev,
        [data.sectionId]: {
          content: data.content,
          reasoning: data.reasoning,
          responseTime: data.responseTime,
          tokenUsage: data.tokenUsage,
          cost: data.cost,
          modelConfig: data.modelConfig,
          status: 'success' as const
        }
      }));

      toast({
        title: 'Section Generated',
        description: `${SECTION_ORDER.find(s => s.id === data.sectionId)?.name || data.sectionId} completed`,
      });
    },
    onError: (error, variables) => {
      setLoadingModels(prev => prev.filter(id => id !== variables.modelId));
      
      toast({
        title: 'Generation Failed',
        description: `Failed to generate section: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const updateVariable = (name: string, value: string) => {
    setVariables(prev => ({ ...prev, [name]: value }));
  };

  const buildSectionPrompt = (sectionId: string): string => {
    const template = promptTemplates.get(sectionId);
    if (!template) {
      throw new Error(`No template found for section: ${sectionId}`);
    }

    // Auto-generate any missing variables
    const autoGeneratedVars = autoGenerateVariables(variables, variables.ScienceCategory || '');
    
    // Add previous section content as variables for dependencies
    const sectionInfo = SECTION_ORDER.find(s => s.id === sectionId);
    const allVariables = { ...autoGeneratedVars };
    
    if (sectionInfo?.dependencies) {
      sectionInfo.dependencies.forEach(depId => {
        const depResponse = sectionResponses[depId];
        if (depResponse) {
          allVariables[depId] = depResponse.content;
          // For single dependency, also add as {response}
          if (sectionInfo.dependencies.length === 1) {
            allVariables.response = depResponse.content;
          }
        }
      });
    }

    // Use utility function for variable substitution
    return substituteVariables(template, allVariables);
  };

  const generateSection = async () => {
    if (selectedModels.length === 0) {
      toast({
        title: "No models selected",
        description: "Please select at least one model to generate the section.",
        variant: "destructive",
      });
      return;
    }

    // Simple validation - just check if we have the core required fields
    if (!variables.ScienceCategory) {
      toast({
        title: "Missing required field",
        description: "Please select a Science Category",
        variant: "destructive",
      });
      return;
    }

    // Check dependencies
    const sectionInfo = SECTION_ORDER.find(s => s.id === currentSection);
    if (sectionInfo?.dependencies) {
      const missingDeps = sectionInfo.dependencies.filter(dep => !sectionResponses[dep]);
      if (missingDeps.length > 0) {
        toast({
          title: "Missing dependencies",
          description: `Please generate these sections first: ${missingDeps.join(', ')}`,
          variant: "destructive",
        });
        return;
      }
    }

    try {
      const prompt = buildSectionPrompt(currentSection);
      
      // Generate with each selected model
      selectedModels.forEach(modelId => {
        modelResponseMutation.mutate({
          prompt,
          modelId,
          sectionId: currentSection
        });
      });
    } catch (error) {
      toast({
        title: "Prompt generation failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const selectedModelData = models.filter(model => selectedModels.includes(model.id));
  const currentSectionName = SECTION_ORDER.find(s => s.id === currentSection)?.name || currentSection;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <AppNavigation 
        title="Vixra Mode" 
        subtitle="Generate satirical academic papers with AI models"
        icon={FileText}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          
          {/* Model Selection Panel */}
          <div className="xl:col-span-1">
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Brain className="w-5 h-5 text-blue-600" />
                    <span>AI Models</span>
                  </div>
                  <div className="text-sm text-gray-500">
                    {selectedModels.length} selected
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-0">
                {modelsLoading ? (
                  <div className="grid grid-cols-1 gap-3">
                    {[...Array(6)].map((_, i) => (
                      <div key={i} className="h-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {Object.entries(
                      models.reduce((acc, model) => {
                        if (!acc[model.provider]) acc[model.provider] = [];
                        acc[model.provider].push(model);
                        return acc;
                      }, {} as Record<string, typeof models>)
                    ).map(([provider, providerModels]) => (
                      <div key={provider} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                            {provider}
                          </h3>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const providerModelIds = providerModels.map(m => m.id);
                              const allSelected = providerModelIds.every(id => selectedModels.includes(id));
                              if (allSelected) {
                                setSelectedModels(prev => prev.filter(id => !providerModelIds.includes(id)));
                              } else {
                                setSelectedModels(prev => Array.from(new Set([...prev, ...providerModelIds])));
                              }
                            }}
                            className="text-xs h-6 px-2"
                          >
                            {providerModels.every(model => selectedModels.includes(model.id)) ? 'None' : 'All'}
                          </Button>
                        </div>
                        <div className="grid grid-cols-1 gap-2">
                          {providerModels.map((model) => (
                            <ModelButton
                              key={model.id}
                              model={model}
                              isSelected={selectedModels.includes(model.id)}
                              isAnalyzing={loadingModels.includes(model.id)}
                              responseCount={Object.values(sectionResponses).length}
                              onToggle={(modelId) => {
                                setSelectedModels(prev => 
                                  prev.includes(modelId) 
                                    ? prev.filter(id => id !== modelId)
                                    : [...prev, modelId]
                                );
                              }}
                              disabled={loadingModels.includes(model.id)}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                <div className="pt-4 border-t border-gray-200 dark:border-gray-700 space-y-3">
                  <div className="flex items-center justify-between">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedModels(models.map(m => m.id))}
                      disabled={selectedModels.length === models.length}
                      className="text-xs"
                    >
                      Select All
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedModels([])}
                      disabled={selectedModels.length === 0}
                      className="text-xs"
                    >
                      Clear All
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Area */}
          <div className="xl:col-span-2 space-y-4">
            
            {/* Variables Panel */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-sm">
                    <Settings className="w-4 h-4" />
                    <span>Paper Variables</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowVariablesPanel(!showVariablesPanel)}
                  >
                    {showVariablesPanel ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </Button>
                </CardTitle>
              </CardHeader>
              {showVariablesPanel && (
                <CardContent className="space-y-4 pt-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Required Variables */}
                    <div className="space-y-3">
                      <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Required Fields</Label>
                      
                      <div>
                        <Label htmlFor="researcherName" className="text-xs">Researcher Name *</Label>
                        <Input
                          id="researcherName"
                          value={variables.ResearcherName || ''}
                          onChange={(e) => updateVariable('ResearcherName', e.target.value)}
                          placeholder="Dr. Pseudo Science (auto-generated if blank)"
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label htmlFor="scienceCategory" className="text-xs">Science Category *</Label>
                        <Select 
                          value={variables.ScienceCategory || ''} 
                          onValueChange={(value) => updateVariable('ScienceCategory', value)}
                        >
                          <SelectTrigger className="w-full mt-1">
                            <SelectValue placeholder="Select category..." />
                          </SelectTrigger>
                          <SelectContent>
                            {SCIENCE_CATEGORIES.map((category) => (
                              <SelectItem key={category} value={category}>
                                {category}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="title" className="text-xs">Paper Title *</Label>
                        <Input
                          id="title"
                          value={variables.Title || ''}
                          onChange={(e) => updateVariable('Title', e.target.value)}
                          placeholder="Revolutionary Breakthrough in... (auto-generated if blank)"
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label htmlFor="authors" className="text-xs">Authors *</Label>
                        <Input
                          id="authors"
                          value={variables.Authors || ''}
                          onChange={(e) => updateVariable('Authors', e.target.value)}
                          placeholder="Dr. Pseudo Science, Independent Researcher (auto-generated if blank)"
                          className="mt-1"
                        />
                      </div>
                    </div>

                    {/* Optional Variables */}
                    <div className="space-y-3">
                      <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Info</Label>
                      <div className="text-xs text-gray-600 dark:text-gray-400 space-y-2">
                        <p>• Leave fields blank for auto-generation of satirical content</p>
                        <p>• Each section builds on previous ones</p>
                        <p>• Generate sections in sequence for best results</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>

            {/* Section Generation Controls */}
            <Card>
              <CardContent className="pt-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div>
                        <Label htmlFor="currentSection" className="text-xs">Current Section</Label>
                        <Select 
                          value={currentSection} 
                          onValueChange={setCurrentSection}
                        >
                          <SelectTrigger className="w-64 mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {SECTION_ORDER.map((section) => {
                              const isAvailable = section.dependencies.every(dep => sectionResponses[dep]);
                              const isGenerated = sectionResponses[section.id];
                              
                              return (
                                <SelectItem 
                                  key={section.id} 
                                  value={section.id}
                                  disabled={!isAvailable && !isGenerated}
                                >
                                  {section.name} {isGenerated ? '✓' : isAvailable ? '○' : '⚬'}
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        {selectedModels.length === 0 ? (
                          "Select models to generate sections"
                        ) : loadingModels.length > 0 ? (
                          `Generating ${currentSectionName}...`
                        ) : (
                          `Ready to generate ${currentSectionName}`
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {Object.keys(sectionResponses).length > 0 && (
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              try {
                                await copyVixraPaper(variables, sectionResponses, selectedModelData);
                                toast({
                                  title: "Copied to clipboard",
                                  description: "Paper has been copied as markdown",
                                });
                              } catch (error) {
                                toast({
                                  title: "Copy failed",
                                  description: "Could not copy to clipboard",
                                  variant: "destructive",
                                });
                              }
                            }}
                            disabled={loadingModels.length > 0}
                          >
                            <Copy className="w-3 h-3 mr-1" />
                            Copy
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              downloadVixraPaper(variables, sectionResponses, selectedModelData);
                              toast({
                                title: "Download started",
                                description: "Paper is downloading as markdown",
                              });
                            }}
                            disabled={loadingModels.length > 0}
                          >
                            <Download className="w-3 h-3 mr-1" />
                            Download MD
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              try {
                                printVixraPaper(variables, sectionResponses, selectedModelData);
                                toast({
                                  title: "Print dialog opened",
                                  description: "Save as PDF in the print dialog",
                                });
                              } catch (error) {
                                toast({
                                  title: "Print failed",
                                  description: "Could not open print dialog",
                                  variant: "destructive",
                                });
                              }
                            }}
                            disabled={loadingModels.length > 0}
                          >
                            <Printer className="w-3 h-3 mr-1" />
                            Print/PDF
                          </Button>
                        </div>
                      )}
                      <Button
                        onClick={generateSection}
                        disabled={loadingModels.length > 0 || selectedModels.length === 0}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                        size="sm"
                      >
                        {loadingModels.length > 0 ? (
                          <>
                            <div className="w-3 h-3 mr-1 animate-spin rounded-full border-2 border-white border-t-transparent" />
                            <span className="text-sm">Generating...</span>
                          </>
                        ) : (
                          <>
                            <Zap className="w-3 h-3 mr-1" />
                            <span className="text-sm">Generate Section</span>
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Section Results */}
            {Object.keys(sectionResponses).length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <FileText className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                  <h3 className="text-base font-medium text-gray-900 dark:text-white mb-2">No Sections Generated</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Select models and generate your first section to get started.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {SECTION_ORDER.filter(section => sectionResponses[section.id]).map((section) => {
                  const response = sectionResponses[section.id];
                  const model = models.find(m => m.id === selectedModels[0]); // Show first model for now
                  
                  return (
                    <div key={section.id} className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full" />
                        <h3 className="text-sm font-semibold">{section.name}</h3>
                      </div>
                      {model && (
                        <ResponseCard
                          model={model}
                          response={response}
                          showTiming={true}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}