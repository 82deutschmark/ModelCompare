/**
 * Vixra Mode Page - Satirical AI-Generated Research Papers
 * 
 * This page provides a specialized interface for generating satirical academic papers
 * using AI models with proper variable substitution and validation. It follows the
 * project's modular architecture and uses the unified /api/generate endpoint.
 * 
 * Author: Claude (updated to use unified variable system)
 * Date: January 2025
 */

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Brain, Zap, BookOpen, Eye, Settings } from "lucide-react";
import { ModelButton } from "@/components/ModelButton";
import { MessageCard, type MessageCardData } from "@/components/MessageCard";
import { AppNavigation } from "@/components/AppNavigation";
import { ExportButton } from "@/components/ExportButton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { parsePromptsFromMarkdownFile, type PromptCategory } from "@/lib/promptParser";
import { VARIABLE_REGISTRIES, getDefaultVariables } from "../../../shared/variable-registry";
import type { GenerateRequest, GenerateResponse, ModelSeat, UnifiedMessage } from "../../../shared/api-types";
import type { AIModel } from "@/types/ai-models";
import {
  parseVixraTemplates,
  autoGenerateVariables,
  buildVariablesForSection,
  getNextEligibleSections,
  isWorkflowComplete,
  getWorkflowProgress,
  createWorkflowState,
  type SectionTemplate,
  type SectionOutput,
  type WorkflowState,
  type WorkflowSession
} from "@/lib/vixraWorkflow";

const SCIENCE_CATEGORIES = VARIABLE_REGISTRIES.vixra.find(v => v.name === 'ScienceCategory')?.enum || [];

interface VixraSession {
  id: string;
  variables: Record<string, string>;
  template: string;
  responses: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export default function VixraPage() {
  const { toast } = useToast();
  
  // Session persistence state
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(false);
  
  // Workflow state
  const [workflowState, setWorkflowState] = useState<WorkflowState | null>(null);
  const [templates, setTemplates] = useState<Map<string, SectionTemplate>>(new Map());
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [isWorkflowRunning, setIsWorkflowRunning] = useState(false);
  
  // State for variables (these get auto-generated if missing)
  const [variables, setVariables] = useState<Record<string, string>>(() => ({
    ...getDefaultVariables('vixra'),
    ResearcherName: '',
    ScienceCategory: SCIENCE_CATEGORIES[0] || '',
    Title: '',
    Authors: '',
    PromptMode: 'template'
  }));
  
  // UI state
  const [showTiming, setShowTiming] = useState(true);
  const [showPromptPreview, setShowPromptPreview] = useState(false);
  const [showVariablesPanel, setShowVariablesPanel] = useState(true);
  const [showWorkflowPanel, setShowWorkflowPanel] = useState(true);

  // Fetch available models
  const { data: models = [], isLoading: modelsLoading } = useQuery({
    queryKey: ['/api/models'],
    queryFn: async () => {
      const response = await fetch('/api/models');
      if (!response.ok) throw new Error('Failed to fetch models');
      return response.json() as Promise<AIModel[]>;
    },
  });

  // Load Vixra workflow templates from markdown
  useEffect(() => {
    const loadVixraWorkflow = async () => {
      try {
        const response = await fetch('/docs/vixra-prompts.md');
        const markdownContent = await response.text();
        
        const parsedTemplates = parseVixraTemplates(markdownContent);
        setTemplates(parsedTemplates);
        
        // Initialize workflow state with required sections
        const initialState = createWorkflowState(parsedTemplates);
        setWorkflowState(initialState);
        
        toast({
          title: 'Workflow Templates Loaded',
          description: `Loaded ${parsedTemplates.size} section templates`,
        });
      } catch (error) {
        console.error('Failed to load Vixra workflow templates:', error);
        toast({
          title: 'Failed to load workflow',
          description: 'Could not initialize the assembly line.',
          variant: 'destructive',
        });
      }
    };

    loadVixraWorkflow();
  }, [toast]);

  // Load session from URL parameter on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('session');
    
    if (sessionId && sessionId !== currentSessionId) {
      loadSession(sessionId);
    }
  }, []);

  // Update URL when session changes
  useEffect(() => {
    if (currentSessionId) {
      const url = new URL(window.location.href);
      url.searchParams.set('session', currentSessionId);
      window.history.replaceState({}, '', url.toString());
    } else {
      const url = new URL(window.location.href);
      url.searchParams.delete('session');
      window.history.replaceState({}, '', url.toString());
    }
  }, [currentSessionId]);

  // Session management functions
  const createOrUpdateSession = async () => {
    if (!workflowState) return;
    
    try {
      const sessionData = {
        variables,
        template: 'Vixra Assembly Line Workflow',
        responses: workflowState.sectionOutputs.size > 0 ? Object.fromEntries(
          Array.from(workflowState.sectionOutputs).map(([sectionId, output]) => [
            sectionId,
            {
              content: output.content,
              reasoning: undefined,
              status: 'success' as const,
              responseTime: 0,
              tokenUsage: output.tokenUsage,
              cost: output.cost,
              modelName: models.find(m => m.id === output.modelId)?.name || 'Unknown',
            }
          ])
        ) : {} // Empty responses if no sections generated yet
      };

      if (currentSessionId) {
        // Update existing session
        const response = await apiRequest('PUT', `/api/vixra/sessions/${currentSessionId}`, sessionData);
        return response.json();
      } else {
        // Create new session
        const response = await apiRequest('POST', '/api/vixra/sessions', sessionData);
        const session = await response.json();
        setCurrentSessionId(session.id);
        return session;
      }
    } catch (error) {
      console.error('Failed to save session:', error);
      toast({
        title: 'Session Save Failed',
        description: 'Could not save your work to the server',
        variant: 'destructive'
      });
    }
  };

  const loadSession = async (sessionId: string) => {
    try {
      setIsLoadingSession(true);
      const response = await apiRequest('GET', `/api/vixra/sessions/${sessionId}`);
      const session: VixraSession = await response.json();
      
      setVariables(session.variables);
      
        // Convert session responses back to workflow state
      const newState = createWorkflowState(templates);
      Object.entries(session.responses).forEach(([sectionId, resp]: [string, any]) => {
        const output: SectionOutput = {
          sectionId,
          content: resp.content,
          modelId: 'session-restored',
          timestamp: Date.now(),
          tokenUsage: resp.tokenUsage,
          cost: resp.cost
        };
        newState.sectionOutputs.set(sectionId, output);
      });
      
      setWorkflowState(newState);
      setCurrentSessionId(sessionId);
      
      toast({
        title: 'Session Loaded',
        description: `Restored session from ${new Date(session.updatedAt).toLocaleString()}`
      });
    } catch (error) {
      console.error('Failed to load session:', error);
      toast({
        title: 'Load Failed',
        description: 'Could not load the session',
        variant: 'destructive'
      });
    } finally {
      setIsLoadingSession(false);
    }
  };

  // Auto-save session when workflow state or variables change
  useEffect(() => {
    if (workflowState && models.length > 0 && (workflowState.sectionOutputs.size > 0 || currentSessionId)) {
      const timer = setTimeout(() => {
        createOrUpdateSession();
      }, 1000); // Debounce auto-save
      
      return () => clearTimeout(timer);
    }
  }, [workflowState?.sectionOutputs, variables, models, currentSessionId]);

  // Save variables even before any sections are generated
  useEffect(() => {
    if (workflowState && models.length > 0 && Object.keys(variables).length > 0) {
      // Only auto-save if we have some meaningful content or existing session
      const hasContent = Object.values(variables).some(v => v && v.trim() !== '') || currentSessionId;
      if (hasContent) {
        const timer = setTimeout(() => {
          createOrUpdateSession();
        }, 2000); // Longer debounce for variable-only changes
        
        return () => clearTimeout(timer);
      }
    }
  }, [variables, workflowState, models, currentSessionId]);

  // Section generation mutation for assembly line workflow
  const generateSectionMutation = useMutation({
    mutationFn: async (data: { sectionId: string; template: string; variables: Record<string, string>; modelId: string }) => {
      const model = models.find(m => m.id === data.modelId);
      if (!model) throw new Error('Model not found');
      
      const seat: ModelSeat = {
        id: data.sectionId,
        model: {
          id: model.id,
          name: model.name,
          provider: model.provider
        }
      };
      
      const request: GenerateRequest = {
        mode: 'vixra',
        template: data.template,
        variables: data.variables,
        messages: [],
        seats: [seat],
        options: { stream: false }
      };
      
      const response = await apiRequest('POST', '/api/generate', request);
      const result = await response.json() as GenerateResponse;
      
      return {
        sectionId: data.sectionId,
        modelId: data.modelId,
        result
      };
    },
    onSuccess: (data) => {
      if (!workflowState) return;
      
      // Add section output to workflow state
      const sectionOutput: SectionOutput = {
        sectionId: data.sectionId,
        content: data.result.message.content,
        modelId: data.modelId,
        timestamp: Date.now(),
        tokenUsage: data.result.message.tokenUsage,
        cost: data.result.message.cost
      };
      
      setWorkflowState(prev => {
        if (!prev) return prev;
        const newState = { ...prev };
        newState.sectionOutputs.set(data.sectionId, sectionOutput);
        newState.processingSection = null;
        newState.currentStep += 1;
        return newState;
      });
      
      toast({
        title: 'Section Complete',
        description: `${templates.get(data.sectionId)?.name || data.sectionId} section generated`,
      });
      
      // Continue workflow if not complete
      setTimeout(() => {
        continueWorkflow();
      }, 500);
    },
    onError: (error, variables) => {
      setWorkflowState(prev => {
        if (!prev) return prev;
        return { ...prev, processingSection: null };
      });
      
      setIsWorkflowRunning(false);
      
      toast({
        title: 'Section Generation Failed',
        description: `Failed to generate ${variables.sectionId}: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Continue workflow by processing next eligible sections
  const continueWorkflow = () => {
    if (!workflowState || !isWorkflowRunning) return;
    
    // Check if workflow is complete
    if (isWorkflowComplete(workflowState)) {
      setIsWorkflowRunning(false);
      toast({
        title: "Assembly Line Complete!",
        description: "All sections have been generated successfully.",
      });
      return;
    }
    
    // Get next eligible sections
    const nextSections = getNextEligibleSections(workflowState);
    if (nextSections.length === 0) return;
    
    // Process the first eligible section
    const nextSectionId = nextSections[0];
    const template = templates.get(nextSectionId);
    if (!template) return;
    
    // Auto-generate missing variables
    const autoGeneratedVars = autoGenerateVariables(variables, variables.ScienceCategory || '');
    
    // Build variables for this section
    const sectionVariables = buildVariablesForSection(nextSectionId, workflowState, autoGeneratedVars);
    
    // Select model (round-robin)
    const modelIndex = workflowState.currentStep % selectedModels.length;
    const modelId = selectedModels[modelIndex];
    
    // Update state to show this section is processing
    setWorkflowState(prev => {
      if (!prev) return prev;
      return { ...prev, processingSection: nextSectionId };
    });
    
    // Generate section
    generateSectionMutation.mutate({
      sectionId: nextSectionId,
      template: template.content,
      variables: sectionVariables,
      modelId
    });
  };

  const startWorkflow = () => {
    if (!workflowState || selectedModels.length === 0) {
      toast({
        title: "Cannot start workflow",
        description: "Please select at least one model.",
        variant: "destructive",
      });
      return;
    }

    // Auto-generate any missing variables
    const autoGeneratedVars = autoGenerateVariables(variables, variables.ScienceCategory || '');
    setVariables(autoGeneratedVars);
    
    // Reset workflow state
    setWorkflowState(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        sectionOutputs: new Map(),
        processingSection: null,
        currentStep: 0
      };
    });
    
    setIsWorkflowRunning(true);
    
    toast({
      title: "Assembly Line Started",
      description: `Generating satirical paper with ${selectedModels.length} models...`,
    });
    
    // Start processing
    setTimeout(() => {
      continueWorkflow();
    }, 100);
  };

  const selectedModelData = models.filter(model => selectedModels.includes(model.id));

  const updateVariable = (name: string, value: string) => {
    setVariables(prev => ({ ...prev, [name]: value }));
  };

  // Get workflow progress for UI
  const workflowProgress = workflowState ? getWorkflowProgress(workflowState) : null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <AppNavigation 
        title="Vixra Mode" 
        subtitle="Generate satirical academic papers with variable substitution"
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
                              isAnalyzing={workflowState?.processingSection === model.id}
                              responseCount={workflowState?.sectionOutputs.size || 0}
                              onToggle={(modelId) => {
                                setSelectedModels(prev => 
                                  prev.includes(modelId) 
                                    ? prev.filter(id => id !== modelId)
                                    : [...prev, modelId]
                                );
                              }}
                              disabled={isWorkflowRunning}
                              showTiming={showTiming}
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
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="timing"
                      checked={showTiming}
                      onCheckedChange={(checked) => setShowTiming(checked === true)}
                    />
                    <Label htmlFor="timing" className="text-sm">
                      Show response timing
                    </Label>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Area */}
          <div className="xl:col-span-2 space-y-4">
            {/* Assembly Line Progress */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-sm">
                    <FileText className="w-4 h-4" />
                    <span>Assembly Line Progress</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowWorkflowPanel(!showWorkflowPanel)}
                  >
                    {showWorkflowPanel ? 'Hide' : 'Show'}
                  </Button>
                </CardTitle>
              </CardHeader>
              {showWorkflowPanel && (
                <CardContent className="space-y-4 pt-0">
                  {workflowProgress && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Progress</span>
                        <span className="text-sm text-gray-600">
                          {workflowProgress.completed} / {workflowProgress.total} sections
                        </span>
                      </div>
                      
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                          style={{ width: `${workflowProgress.percentage}%` }}
                        />
                      </div>
                      
                      <div className="grid grid-cols-1 gap-2">
                        {Array.from(workflowState?.enabledSections || []).map(sectionId => {
                          const template = templates.get(sectionId);
                          const isComplete = workflowState?.sectionOutputs.has(sectionId);
                          const isProcessing = workflowState?.processingSection === sectionId;
                          const isNext = workflowProgress.nextSections.includes(sectionId);
                          
                          return (
                            <div 
                              key={sectionId}
                              className={`flex items-center justify-between p-2 rounded border ${
                                isComplete ? 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800' :
                                isProcessing ? 'bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800' :
                                isNext ? 'bg-yellow-50 border-yellow-200 dark:bg-yellow-950 dark:border-yellow-800' :
                                'bg-gray-50 border-gray-200 dark:bg-gray-800 dark:border-gray-700'
                              }`}
                            >
                              <span className="text-sm font-medium">{template?.name || sectionId}</span>
                              <div className="flex items-center space-x-2">
                                {isComplete && <div className="w-2 h-2 bg-green-500 rounded-full" />}
                                {isProcessing && <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />}
                                {isNext && <div className="w-2 h-2 bg-yellow-500 rounded-full" />}
                                {!isComplete && !isProcessing && !isNext && <div className="w-2 h-2 bg-gray-400 rounded-full" />}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  
                  {!workflowState && (
                    <div className="text-center py-4">
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Loading assembly line templates...
                      </p>
                    </div>
                  )}
                </CardContent>
              )}
            </Card>

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
                    {showVariablesPanel ? 'Hide' : 'Show'}
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
                          placeholder="Dr. Pseudo Science"
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
                          placeholder="Revolutionary Breakthrough in..."
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label htmlFor="authors" className="text-xs">Authors *</Label>
                        <Input
                          id="authors"
                          value={variables.Authors || ''}
                          onChange={(e) => updateVariable('Authors', e.target.value)}
                          placeholder="Dr. Pseudo Science, Independent Researcher."
                          className="mt-1"
                        />
                      </div>
                    </div>

                    {/* Optional Variables */}
                    <div className="space-y-3">
                      <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Optional Fields</Label>
                      
                      <div>
                        <Label htmlFor="collaborators" className="text-xs">Collaborators</Label>
                        <Input
                          id="collaborators"
                          value={variables.Collaborators || ''}
                          onChange={(e) => updateVariable('Collaborators', e.target.value)}
                          placeholder="Aliens, Advanced AI, Time Travelers, Extradimensional Beings,"
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label htmlFor="email" className="text-xs">Email</Label>
                        <Input
                          id="email"
                          value={variables.Email || ''}
                          onChange={(e) => updateVariable('Email', e.target.value)}
                          placeholder="researcher@example.com"
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label htmlFor="numPages" className="text-xs">Number of Pages</Label>
                        <Input
                          id="numPages"
                          type="number"
                          value={variables.NumPages || ''}
                          onChange={(e) => updateVariable('NumPages', e.target.value)}
                          placeholder="10"
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label htmlFor="targetSections" className="text-xs">Target Sections</Label>
                        <Input
                          id="targetSections"
                          type="number"
                          value={variables.TargetSections || '6'}
                          onChange={(e) => updateVariable('TargetSections', e.target.value)}
                          className="mt-1"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="abstract" className="text-xs">Abstract (optional)</Label>
                    <Textarea
                      id="abstract"
                      value={variables.Abstract || ''}
                      onChange={(e) => updateVariable('Abstract', e.target.value)}
                      placeholder="Leave blank for auto-generation"
                      rows={3}
                      className="mt-1"
                    />
                  </div>
                </CardContent>
              )}
            </Card>

            {/* Session Status */}
            {currentSessionId && (
              <Card className="border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm text-green-700 dark:text-green-300">
                        Session active - work is automatically saved
                      </span>
                    </div>
                    <Button
                      onClick={() => {
                        setCurrentSessionId(null);
                        if (workflowState) {
                          setWorkflowState({
                            ...workflowState,
                            sectionOutputs: new Map(),
                            processingSection: null,
                            currentStep: 0
                          });
                        }
                        setVariables({
                          ...getDefaultVariables('vixra'),
                          ResearcherName: '',
                          ScienceCategory: SCIENCE_CATEGORIES[0] || '',
                          Title: '',
                          Authors: '',
                          PromptMode: 'template'
                        });
                        toast({
                          title: 'New Session Started',
                          description: 'Previous work is saved. You can start fresh.',
                        });
                      }}
                      variant="outline"
                      size="sm"
                      className="text-xs"
                    >
                      Start New Session
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Assembly Line Controls */}
            <Card>
              <CardContent className="pt-4">
                <div className="flex justify-between items-center">
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    {selectedModels.length === 0 ? (
                      "Select models to start the assembly line"
                    ) : isWorkflowRunning ? (
                      workflowState?.processingSection ? 
                        `Processing ${templates.get(workflowState.processingSection)?.name || workflowState.processingSection}...` :
                        "Assembly line running..."
                    ) : workflowProgress && workflowProgress.completed > 0 ? (
                      `${workflowProgress.completed}/${workflowProgress.total} sections complete`
                    ) : (
                      `Ready to start assembly line with ${selectedModels.length} model${selectedModels.length !== 1 ? 's' : ''}`
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {workflowProgress && workflowProgress.completed > 0 && (
                      <ExportButton
                        prompt="Vixra Assembly Line Output"
                        models={selectedModelData}
                        responses={Object.fromEntries(
                          Array.from(workflowState?.sectionOutputs || []).map(([sectionId, output]) => [
                            sectionId,
                            {
                              content: output.content,
                              status: 'success' as const,
                              responseTime: 0,
                              tokenUsage: output.tokenUsage,
                              cost: output.cost
                            }
                          ])
                        )}
                        disabled={isWorkflowRunning}
                      />
                    )}
                    <Button
                      onClick={startWorkflow}
                      disabled={isWorkflowRunning || selectedModels.length === 0 || !workflowState}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2"
                      size="sm"
                    >
                      {isWorkflowRunning ? (
                        <>
                          <div className="w-3 h-3 mr-1 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          <span className="text-sm">Assembly Line Running...</span>
                        </>
                      ) : workflowProgress && workflowProgress.completed > 0 ? (
                        <>
                          <Zap className="w-3 h-3 mr-1" />
                          <span className="text-sm">Restart Assembly Line</span>
                        </>
                      ) : (
                        <>
                          <Zap className="w-3 h-3 mr-1" />
                          <span className="text-sm">Start Assembly Line</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Section Results */}
            {selectedModelData.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <FileText className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                  <h3 className="text-base font-medium text-gray-900 dark:text-white mb-2">No Models Selected</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Select some models to start the assembly line.
                  </p>
                </CardContent>
              </Card>
            ) : workflowState && workflowState.sectionOutputs.size > 0 ? (
              <div className="grid grid-cols-1 gap-4">
                {Array.from(workflowState.enabledSections).map((sectionId) => {
                  const output = workflowState.sectionOutputs.get(sectionId);
                  const template = templates.get(sectionId);
                  const isProcessing = workflowState.processingSection === sectionId;
                  
                  if (!output && !isProcessing) {
                    return null; // No output and not processing
                  }
                  
                  if (isProcessing) {
                    // Show processing state
                    return (
                      <Card key={sectionId}>
                        <CardHeader>
                          <CardTitle className="flex items-center space-x-2 text-sm">
                            <div className="w-3 h-3 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                            <span>Generating {template?.name || sectionId}</span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-center py-4">
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              Processing section with {models.find(m => m.id === selectedModels[workflowState.currentStep % selectedModels.length])?.name}...
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  }
                  
                  if (output) {
                    const model = models.find(m => m.id === output.modelId);
                    return (
                      <Card key={sectionId}>
                        <CardHeader>
                          <CardTitle className="flex items-center justify-between">
                            <div className="flex items-center space-x-2 text-sm">
                              <div className="w-2 h-2 bg-green-500 rounded-full" />
                              <span>{template?.name || sectionId}</span>
                            </div>
                            <div className="text-xs text-gray-500">
                              {model?.name} • {new Date(output.timestamp).toLocaleTimeString()}
                            </div>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="prose prose-sm max-w-none dark:prose-invert">
                            <div className="whitespace-pre-wrap text-sm">
                              {output.content}
                            </div>
                          </div>
                          {(output.tokenUsage || output.cost) && (
                            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                              <div className="flex items-center justify-between text-xs text-gray-500">
                                {output.tokenUsage && (
                                  <span>
                                    {output.tokenUsage.input + output.tokenUsage.output} tokens
                                    {output.tokenUsage.reasoning && ` (${output.tokenUsage.reasoning} reasoning)`}
                                  </span>
                                )}
                                {output.cost && (
                                  <span>
                                    ${output.cost.total.toFixed(4)}
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  }
                  
                  return null;
                })}
              </div>
            ) : workflowState ? (
              <Card>
                <CardContent className="text-center py-8">
                  <Zap className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                  <h3 className="text-base font-medium text-gray-900 dark:text-white mb-2">Ready to Start</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Click "Start Assembly Line" to begin generating your satirical research paper.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="text-center py-8">
                  <div className="w-4 h-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent mx-auto mb-3" />
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Loading assembly line workflow...
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}