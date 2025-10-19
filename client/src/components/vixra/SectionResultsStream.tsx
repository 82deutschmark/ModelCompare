/**
 * Author: Cascade using Claude Sonnet 4
 * Date: 2025-10-04
 * PURPOSE: Sequential display stream for generated paper sections.
 *          Shows empty state grid with placeholders, skeleton loaders during generation,
 *          and full ResponseCard content when sections complete.
 *          Handles smooth scrolling and per-section export controls.
 * SRP/DRY check: Pass - Single responsibility (section display orchestration)
 * shadcn/ui: Pass - Uses Card, Skeleton, Button, Badge
 */

import { useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ResponseCard } from "@/components/ResponseCard";
import { Copy, RotateCw, XCircle, FileText, Lock, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Section } from "./SectionProgressTracker";
import type { AIModel } from "@/types/ai-models";

interface SectionResultsStreamProps {
  sections: Section[];
  models: AIModel[];
  onRegenerateSection: (sectionId: string) => void;
  isGenerating: boolean;
}

export function SectionResultsStream({
  sections,
  models,
  onRegenerateSection,
  isGenerating
}: SectionResultsStreamProps) {
  const { toast } = useToast();
  const lastCompletedRef = useRef<string | null>(null);

  const completedSections = sections.filter(s => s.status === 'completed');
  const hasCompletedSections = completedSections.length > 0;

  // Auto-scroll to newly completed section
  // Add defensive guard to prevent browser extension MutationObserver errors
  useEffect(() => {
    const latestCompleted = completedSections[completedSections.length - 1];
    if (latestCompleted && latestCompleted.id !== lastCompletedRef.current) {
      lastCompletedRef.current = latestCompleted.id;

      // Small delay to ensure DOM is updated
      setTimeout(() => {
        const element = document.getElementById(`section-${latestCompleted.id}`);
        if (element) {
          try {
            element.scrollIntoView({
              behavior: 'smooth',
              block: 'start',
              inline: 'nearest'
            });
          } catch (error) {
            // Silently ignore scroll errors (browser extensions can interfere)
            console.debug('Section scroll error:', error);
          }
        }
      }, 300);
    }
  }, [completedSections]);

  const handleCopySection = async (section: Section) => {
    if (!section.content) return;
    
    try {
      await navigator.clipboard.writeText(section.content);
      toast({
        title: "Copied!",
        description: `${section.name} copied to clipboard`,
      });
    } catch (error) {
      toast({
        title: "Failed to copy",
        description: "Could not copy section to clipboard",
        variant: "destructive",
      });
    }
  };

  const getSectionIcon = (sectionId: string) => {
    const icons: Record<string, string> = {
      abstract: '📝',
      introduction: '🔬',
      methodology: '⚗️',
      results: '📊',
      discussion: '💬',
      conclusion: '🎯',
      citations: '📚',
      acknowledgments: '🙏'
    };
    return icons[sectionId] || '📄';
  };

  // Empty state: Show grid of section placeholders
  if (!hasCompletedSections && !isGenerating) {
    return (
      <div className="space-y-4">
        <div className="text-center py-8">
          <FileText className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">Ready to Generate</h3>
          <p className="text-muted-foreground">
            Click "Generate Paper" above to start creating your satirical research paper
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sections.map((section) => (
            <Card 
              key={section.id}
              className={`transition-all hover:shadow-md ${
                section.status === 'locked' 
                  ? 'opacity-50 cursor-not-allowed' 
                  : 'hover:border-primary/50 cursor-pointer'
              }`}
            >
              <CardContent className="p-6">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-xl">
                    {section.status === 'locked' ? <Lock className="w-5 h-5" /> : getSectionIcon(section.id)}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-base">{section.name}</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {section.status === 'locked' 
                        ? `Requires: ${section.dependencies.join(', ')}`
                        : 'Ready to generate'}
                    </p>
                  </div>
                  <Badge variant="outline" className="shrink-0">
                    {section.status === 'locked' ? '🔒' : '○'}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Active state: Show generated sections + skeleton loaders
  return (
    <div className="space-y-6">
      {sections.map((section) => {
        // Completed section - show full content
        if (section.status === 'completed' && section.content) {
          return (
            <div 
              key={section.id} 
              id={`section-${section.id}`}
              className="scroll-mt-6"
            >
              <Card className="border-2 border-green-500/20">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-2xl">{getSectionIcon(section.id)}</span>
                      <span className="text-lg">{section.name}</span>
                      <Badge variant="default" className="bg-green-600">
                        ✓ Complete
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      {section.metadata?.responseTime && (
                        <Badge variant="outline" className="text-xs">
                          <Clock className="w-3 h-3 mr-1" />
                          {(section.metadata.responseTime / 1000).toFixed(1)}s
                        </Badge>
                      )}
                      {section.metadata?.wordCount && (
                        <Badge variant="outline" className="text-xs">
                          ~{section.metadata.wordCount} words
                        </Badge>
                      )}
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent
                  data-gramm="false"
                  data-gramm_editor="false"
                  data-enable-grammarly="false"
                  data-lpignore="true"
                  data-form-type="other"
                >
                  <div className="prose dark:prose-invert max-w-none mb-4">
                    <div className="whitespace-pre-wrap text-sm leading-relaxed">
                      {section.content}
                    </div>
                  </div>
                  
                  {/* Per-section controls */}
                  <div className="flex items-center gap-2 pt-4 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopySection(section)}
                    >
                      <Copy className="w-3 h-3 mr-2" />
                      Copy Section
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onRegenerateSection(section.id)}
                      disabled={isGenerating}
                    >
                      <RotateCw className="w-3 h-3 mr-2" />
                      Regenerate
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          );
        }

        // Generating section - show skeleton loader
        if (section.status === 'generating') {
          return (
            <div 
              key={section.id} 
              id={`section-${section.id}`}
              className="scroll-mt-6"
            >
              <Card className="border-2 border-blue-500/30 animate-pulse">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center space-x-2">
                    <span className="text-2xl">{getSectionIcon(section.id)}</span>
                    <span className="text-lg">{section.name}</span>
                    <Badge variant="secondary" className="bg-blue-600">
                      <span className="animate-pulse">⏳ Generating...</span>
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-11/12" />
                  <Skeleton className="h-4 w-10/12" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-9/12" />
                  <div className="pt-2">
                    <Skeleton className="h-3 w-48" />
                  </div>
                </CardContent>
              </Card>
            </div>
          );
        }

        // Failed section - show error card
        if (section.status === 'failed') {
          return (
            <div 
              key={section.id} 
              id={`section-${section.id}`}
              className="scroll-mt-6"
            >
              <Card className="border-2 border-destructive">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-destructive">
                    <XCircle className="w-5 h-5" />
                    <span>Failed to generate {section.name}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="text-sm text-muted-foreground space-y-2">
                      <p>
                        An error occurred while generating this section. This won't prevent other sections from generating.
                      </p>
                      <p className="text-xs bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded p-2">
                        💡 <strong>Tip:</strong> If the model is consistently failing, try changing to a different model using the "Change Model" button above. Some models may be experiencing issues or rate limits.
                      </p>
                    </div>
                    <Button
                      onClick={() => onRegenerateSection(section.id)}
                      variant="outline"
                      size="sm"
                      disabled={isGenerating}
                    >
                      <RotateCw className="w-4 h-4 mr-2" />
                      Try Again with Current Model
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          );
        }

        // Pending/locked sections - don't show until they're generating
        return null;
      })}
    </div>
  );
}
