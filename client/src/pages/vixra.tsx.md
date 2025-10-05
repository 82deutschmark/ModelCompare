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

import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { FileText, Brain, Zap, Settings, ChevronDown, ChevronUp, Download, Copy, Printer, Play, Pause, Square } from "lucide-react";
import { ModelButton } from "@/components/ModelButton";
import { ResponseCard } from "@/components/ResponseCard";
import { AppNavigation } from "@/components/AppNavigation";
import { ExportButton } from "@/components/ExportButton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { generateMissingVariables, substituteVariables, parseVixraTemplates, downloadVixraPaper, copyVixraPaper, printVixraPaper } from "@/lib/vixraUtils";
import type { AIModel, ModelResponse } from "@/types/ai-models";

const SCIENCE_CATEGORIES = [
  'Physics - High Energy Particle Physics',
  'Physics - Quantum Gravity and String Theory', 
  'Physics - Relativity and Cosmology',
  'Physics - Astrophysics',
  'Physics - Quantum Physics',
  'Physics - Nuclear and Atomic Physics',
  'Physics - Condensed Matter',
  'Physics - Thermodynamics and Energy',
  'Physics - Classical Physics',
  'Physics - Geophysics',
  'Physics - Climate Research',
  'Physics - Mathematical Physics',
  'Physics - History and Philosophy of Physics',
  'Mathematics - Set Theory and Logic',
  'Mathematics - Number Theory',
  'Mathematics - Combinatorics and Graph Theory',
  'Mathematics - Algebra',
  'Mathematics - Geometry',
  'Mathematics - Topology',
  'Mathematics - Functions and Analysis',
  'Mathematics - Statistics',
  'Mathematics - General Mathematics',
  'Computational Science - DSP',
  'Computational Science - Data Structures and Algorithms',
  'Computational Science - Artificial Intelligence',
  'Biology - Biochemistry',
  'Biology - Physics of Biology',
  'Biology - Mind Science',
  'Biology - Quantitative Biology',
  'Chemistry',
  'Humanities - Archaeology',
  'Humanities - Linguistics',
  'Humanities - Economics and Finance',
  'Humanities - Social Science',
  'Humanities - Religion and Spiritualism',
  'General Science and Philosophy',
  'Education and Didactics'
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
    Author: '',
    ScienceCategory: SCIENCE_CATEGORIES[0] || '',
    Title: ''
  });
  
  // State for section generation
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [currentSection, setCurrentSection] = useState('abstract');
  const [sectionResponses, setSectionResponses] = useState<Record<string, Record<string, ModelResponse>>>({});
  const [loadingModels, setLoadingModels] = useState<string[]>([]);
  const [promptTemplates, setPromptTemplates] = useState<Map<string, string>>(new Map());
  const [showVariablesPanel, setShowVariablesPanel] = useState(true);
  
  // Auto mode state
  const [autoMode, setAutoMode] = useState(false);
  const [isAutoGenerating, setIsAutoGenerating] = useState(false);
  const [autoModeProgress, setAutoModeProgress] = useState({ current: 0, total: 0 });

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
          ...prev[data.sectionId],
          [data.modelId]: {
            content: data.content,
            reasoning: data.reasoning,
            responseTime: data.responseTime,
            tokenUsage: data.tokenUsage,
            cost: data.cost,
            modelConfig: data.modelConfig,
            status: 'success' as const
          }
        }
      }));

      toast({
        title: 'Section Generated',
        description: `${SECTION_ORDER.find(s => s.id === data.sectionId)?.name || data.sectionId} completed`,
      });

      // Auto mode: Continue to next section only after all models complete
      if (isAutoGenerating) {
        // Check if all selected models have finished for this section
        const stillLoading = selectedModels.some(modelId => loadingModels.includes(modelId));
        if (!stillLoading) {
          generateNextSection();
        }
      }
    },
    onError: (error, variables) => {
      setLoadingModels(prev => prev.filter(id => id !== variables.modelId));
      
      toast({
        title: 'Generation Failed',
        description: `Failed to generate section: ${error.message}`,
        variant: "destructive",
      });

      // Auto mode: Continue to next section if all models are done (including failed ones)
      if (isAutoGenerating) {
        // Check if all selected models have finished for this section
        const stillLoading = selectedModels.some(modelId => loadingModels.includes(modelId));
        if (!stillLoading) {
          generateNextSection();
        }
      }
    },
  });

  const updateVariable = (name: string, value: string) => {
    setVariables(prev => ({ ...prev, [name]: value }));
  };

  // Auto mode helper functions
  const getNextEligibleSection = useCallback((): string | null => {
    const completedSections = new Set(Object.keys(sectionResponses).filter(sectionId => 
      sectionResponses[sectionId] && Object.keys(sectionResponses[sectionId]).length > 0
    ));
    
    for (const section of SECTION_ORDER) {
      // Skip if already completed
      if (completedSections.has(section.id)) continue;
      
      // Check if all dependencies are met
      const allDependenciesMet = section.dependencies.every(dep => completedSections.has(dep));
      
      if (allDependenciesMet) {
        return section.id;
      }
    }
    return null;
  }, [sectionResponses]);

  const generateNextSection = useCallback(async () => {
    const nextSection = getNextEligibleSection();
    if (!nextSection) {
      // Auto generation complete
      setIsAutoGenerating(false);
      toast({
        title: "Auto generation complete",
        description: "All paper sections have been generated successfully.",
      });
      return;
    }

    // Update current section and generate
    setCurrentSection(nextSection);
    
    // Small delay for better UX
    setTimeout(() => {
      generateSection();
    }, 1500);
  }, [getNextEligibleSection, toast]);

  const startAutoGeneration = () => {
    if (selectedModels.length === 0) {
      toast({
        title: "No models selected",
        description: "Please select at least one model to start auto generation.",
        variant: "destructive",
      });
      return;
    }

    if (!variables.ScienceCategory) {
      toast({
        title: "Missing required field",
        description: "Please select a Science Category before starting auto generation.",
        variant: "destructive",
      });
      return;
    }

    setIsAutoGenerating(true);
    setAutoModeProgress({ current: 0, total: SECTION_ORDER.length });
    
    // Start with first eligible section
    const firstSection = getNextEligibleSection() || 'abstract';
    setCurrentSection(firstSection);
    
    setTimeout(() => {
      generateSection();
    }, 500);
  };

  const stopAutoGeneration = () => {
    setIsAutoGenerating(false);
    toast({
      title: "Auto generation stopped",
      description: "You can continue manually or restart auto generation.",
    });
  };

  // Update progress when sections complete
  useEffect(() => {
    if (isAutoGenerating) {
      const completed = Object.keys(sectionResponses).filter(sectionId => 
        sectionResponses[sectionId] && Object.keys(sectionResponses[sectionId]).length > 0
      ).length;
      setAutoModeProgress({ current: completed, total: SECTION_ORDER.length });
    }
  }, [sectionResponses, isAutoGenerating]);

  const buildSectionPrompt = async (sectionId: string): Promise<string> => {
    const template = promptTemplates.get(sectionId);
    if (!template) {
      throw new Error(`No template found for section: ${sectionId}`);
    }

    // Generate missing variables ONLY (respects user input)
    const completeVariables = await generateMissingVariables(variables, promptTemplates);
    
    // Update UI with any newly generated variables
    if (completeVariables.Title !== variables.Title || completeVariables.Author !== variables.Author) {
      setVariables(completeVariables);
    }
    
    // Add previous section content as variables for dependencies
    const sectionInfo = SECTION_ORDER.find(s => s.id === sectionId);
    const allVariables = { ...completeVariables };
    
    if (sectionInfo?.dependencies) {
      sectionInfo.dependencies.forEach(depId => {
        const depSectionResponses = sectionResponses[depId];
        if (depSectionResponses) {
          // Use the first available response from any model for this dependency
          const firstModelId = Object.keys(depSectionResponses)[0];
          if (firstModelId && depSectionResponses[firstModelId]) {
            const depResponse = depSectionResponses[firstModelId];
            allVariables[depId] = depResponse.content;
            // For single dependency, also add as {response}
            if (sectionInfo.dependencies.length === 1) {
              allVariables.response = depResponse.content;
            }
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
      const missingDeps = sectionInfo.dependencies.filter(dep => 
        !sectionResponses[dep] || Object.keys(sectionResponses[dep]).length === 0
      );
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
      const prompt = await buildSectionPrompt(currentSection);
      
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
                        <Label htmlFor="author" className="text-xs">Author *</Label>
                        <Input
                          id="author"
                          value={variables.Author || ''}
                          onChange={(e) => updateVariable('Author', e.target.value)}
                          placeholder=""
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
                          placeholder=""
                          className="mt-1"
                        />
                      </div>

                    </div>

                    {/* Optional Variables */}
                    <div className="space-y-3">
                      <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Auto-Generation Info</Label>
                      <div className="text-xs text-gray-600 dark:text-gray-400 space-y-2">
                        <p>• <strong>Leave all fields empty</strong> - they will be automatically filled with satirical academic content</p>
                        <p>• Each section builds on previous sections</p>
                        <p>• Generate sections in sequence for best results</p>
                        <p>• Only Science Category is required to start</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>

            {/* Auto Mode Controls */}
            <Card>
              <CardContent className="pt-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Label htmlFor="autoMode" className="text-sm font-medium">Auto Mode</Label>
                      <Switch
                        id="autoMode"
                        checked={autoMode}
                        onCheckedChange={setAutoMode}
                        disabled={isAutoGenerating}
                      />
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {autoMode ? 'Generate all sections automatically' : 'Manual section control'}
                      </span>
                    </div>
                  </div>
                  
                  {autoMode && (
                    <div className="space-y-3">
                      {isAutoGenerating && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span>Progress: {autoModeProgress.current} of {autoModeProgress.total} sections</span>
                            <span>{Math.round((autoModeProgress.current / autoModeProgress.total) * 100)}%</span>
                          </div>
                          <Progress value={(autoModeProgress.current / autoModeProgress.total) * 100} className="w-full" />
                          <div className="text-xs text-gray-600 dark:text-gray-400">
                            Currently generating: {SECTION_ORDER.find(s => s.id === currentSection)?.name || currentSection}
                          </div>
                        </div>
                      )}
                      
                      <div className="flex items-center space-x-2">
                        {!isAutoGenerating ? (
                          <Button
                            onClick={startAutoGeneration}
                            disabled={selectedModels.length === 0}
                            className="bg-green-600 hover:bg-green-700 text-white"
                            size="sm"
                          >
                            <Play className="w-3 h-3 mr-1" />
                            Start Auto Generation
                          </Button>
                        ) : (
                          <Button
                            onClick={stopAutoGeneration}
                            variant="destructive"
                            size="sm"
                          >
                            <Square className="w-3 h-3 mr-1" />
                            Stop Auto Generation
                          </Button>
                        )}
                        
                        {Object.keys(sectionResponses).some(sectionId => 
                          sectionResponses[sectionId] && Object.keys(sectionResponses[sectionId]).length > 0
                        ) && (
                          <div className="text-xs text-gray-600 dark:text-gray-400">
                            {Object.keys(sectionResponses).filter(sectionId => 
                              sectionResponses[sectionId] && Object.keys(sectionResponses[sectionId]).length > 0
                            ).length} sections completed
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Section Prompt Templates */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center space-x-2 text-sm">
                  <FileText className="w-4 h-4" />
                  <span>Section Templates</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                {promptTemplates.size > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {Array.from(promptTemplates.keys()).map((sectionId) => (
                      <Button
                        key={sectionId}
                        variant={currentSection === sectionId ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentSection(sectionId)}
                        className="text-xs"
                      >
                        {SECTION_ORDER.find(s => s.id === sectionId)?.name || sectionId}
                      </Button>
                    ))}
                  </div>
                )}
                {promptTemplates.size === 0 && (
                  <div className="text-center text-xs text-gray-500 dark:text-gray-400 py-2">
                    Loading section templates...
                  </div>
                )}
              </CardContent>
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
                              const isAvailable = section.dependencies.every(dep => 
                                sectionResponses[dep] && Object.keys(sectionResponses[dep]).length > 0
                              );
                              const isGenerated = sectionResponses[section.id] && Object.keys(sectionResponses[section.id]).length > 0;
                              
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
                        ) : isAutoGenerating ? (
                          `Auto-generating ${currentSectionName}...`
                        ) : loadingModels.length > 0 ? (
                          `Generating ${currentSectionName}...`
                        ) : (
                          `Ready to generate ${currentSectionName}`
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {Object.keys(sectionResponses).some(sectionId => 
                        sectionResponses[sectionId] && Object.keys(sectionResponses[sectionId]).length > 0
                      ) && (
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
                      {!autoMode ? (
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
                      ) : (
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          Auto mode enabled - use controls above
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Section Results */}
            {!Object.keys(sectionResponses).some(sectionId => 
              sectionResponses[sectionId] && Object.keys(sectionResponses[sectionId]).length > 0
            ) ? (
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
                {SECTION_ORDER.filter(section => 
                  sectionResponses[section.id] && Object.keys(sectionResponses[section.id]).length > 0
                ).map((section) => {
                  const sectionModelResponses = sectionResponses[section.id];
                  
                  return (
                    <div key={section.id} className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full" />
                        <h3 className="text-sm font-semibold">{section.name}</h3>
                        <span className="text-xs text-gray-500">
                          {Object.keys(sectionModelResponses).length} model{Object.keys(sectionModelResponses).length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      {Object.entries(sectionModelResponses).map(([modelId, response]) => {
                        const model = models.find(m => m.id === modelId);
                        return model ? (
                          <ResponseCard
                            key={`${section.id}-${modelId}`}
                            model={model}
                            response={response}
                            showTiming={true}
                          />
                        ) : null;
                      })}
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