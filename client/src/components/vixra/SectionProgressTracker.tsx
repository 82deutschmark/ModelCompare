/**
 * Author: Cascade using Claude Sonnet 4
 * Date: 2025-10-04
 * PURPOSE: Visual progress tracker for paper section generation.
 *          Displays horizontal grid of section status badges with dependency-aware states.
 *          Shows overall progress bar and estimated time remaining.
 *          Sections are clickable to scroll to completed/generating sections.
 * SRP/DRY check: Pass - Single responsibility (progress visualization)
 * shadcn/ui: Pass - Uses Badge, Progress, Card, Tooltip
 */

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CheckCircle2, Loader2, Lock, Circle } from "lucide-react";

export type SectionStatus = 'locked' | 'pending' | 'generating' | 'completed' | 'failed';

export interface Section {
  id: string;
  name: string;
  status: SectionStatus;
  dependencies: string[];
  content?: string;
  metadata?: {
    responseTime?: number;
    tokenUsage?: {
      prompt: number;
      completion: number;
      total: number;
    };
    wordCount?: number;
  };
}

interface SectionProgressTrackerProps {
  sections: Section[];
  currentSectionId: string | null;
  onSectionClick: (sectionId: string) => void;
  showProgress?: boolean;
}

export function SectionProgressTracker({
  sections,
  currentSectionId,
  onSectionClick,
  showProgress = true
}: SectionProgressTrackerProps) {
  const completedCount = sections.filter(s => s.status === 'completed').length;
  const totalCount = sections.length;
  const progressPercentage = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  // Calculate estimated time remaining based on average section time
  const completedSections = sections.filter(s => s.status === 'completed' && s.metadata?.responseTime);
  const avgTime = completedSections.length > 0
    ? completedSections.reduce((sum, s) => sum + (s.metadata?.responseTime || 0), 0) / completedSections.length
    : 30; // Default 30 seconds per section
  const remainingSections = totalCount - completedCount;
  const estimatedMinutes = Math.ceil((remainingSections * avgTime) / 60);

  const getSectionIcon = (section: Section) => {
    switch (section.status) {
      case 'completed':
        return <CheckCircle2 className="w-4 h-4" />;
      case 'generating':
        return <Loader2 className="w-4 h-4 animate-spin" />;
      case 'locked':
        return <Lock className="w-3 h-3" />;
      case 'failed':
        return <span className="text-destructive">✗</span>;
      default:
        return <Circle className="w-3 h-3" />;
    }
  };

  const getSectionVariant = (section: Section): "default" | "secondary" | "destructive" | "outline" => {
    switch (section.status) {
      case 'completed':
        return 'default'; // Green
      case 'generating':
        return 'secondary'; // Blue
      case 'failed':
        return 'destructive'; // Red
      default:
        return 'outline'; // Gray
    }
  };

  const getSectionClassName = (section: Section) => {
    const base = "transition-all duration-300 cursor-pointer hover:scale-105";
    switch (section.status) {
      case 'completed':
        return `${base} bg-green-600 text-white hover:bg-green-700`;
      case 'generating':
        return `${base} bg-blue-600 text-white animate-pulse`;
      case 'locked':
        return `${base} bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed hover:scale-100`;
      case 'failed':
        return `${base} bg-red-600 text-white hover:bg-red-700`;
      default:
        return `${base} bg-white dark:bg-gray-800 border-2 border-primary/30 hover:border-primary`;
    }
  };

  const handleSectionClick = (section: Section) => {
    if (section.status === 'locked') return;
    if (section.status === 'completed' || section.status === 'generating') {
      onSectionClick(section.id);
    }
  };

  const getDependencyText = (section: Section) => {
    if (section.dependencies.length === 0) return 'No dependencies';
    const depNames = section.dependencies.map(depId => {
      const dep = sections.find(s => s.id === depId);
      return dep?.name || depId;
    });
    return `Requires: ${depNames.join(', ')}`;
  };

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        {/* Section Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2">
          <TooltipProvider>
            {sections.map((section) => (
              <Tooltip key={section.id}>
                <TooltipTrigger asChild>
                  <Badge
                    variant={getSectionVariant(section)}
                    className={getSectionClassName(section)}
                    onClick={() => handleSectionClick(section)}
                  >
                    <div className="flex flex-col items-center justify-center py-2 px-1 gap-1 min-h-[60px]">
                      {getSectionIcon(section)}
                      <span className="text-[10px] font-medium text-center leading-tight break-words max-w-full">
                        {section.name.split(' ').map((word, i) => (
                          <span key={i} className="block">{word}</span>
                        ))}
                      </span>
                    </div>
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="space-y-1">
                    <p className="font-semibold">{section.name}</p>
                    <p className="text-xs">
                      Status: <span className="capitalize">{section.status}</span>
                    </p>
                    {section.status === 'locked' && (
                      <p className="text-xs text-muted-foreground">
                        {getDependencyText(section)}
                      </p>
                    )}
                    {section.status === 'completed' && section.metadata && (
                      <>
                        {section.metadata.responseTime && (
                          <p className="text-xs">
                            Generated in {(section.metadata.responseTime / 1000).toFixed(1)}s
                          </p>
                        )}
                        {section.metadata.wordCount && (
                          <p className="text-xs">
                            ~{section.metadata.wordCount} words
                          </p>
                        )}
                      </>
                    )}
                    {(section.status === 'completed' || section.status === 'generating') && (
                      <p className="text-xs text-blue-400 mt-1">Click to view</p>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
            ))}
          </TooltipProvider>
        </div>

        {/* Overall Progress Bar */}
        {showProgress && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">
                Progress: {completedCount} of {totalCount} sections
              </span>
              <span className="text-muted-foreground">
                {Math.round(progressPercentage)}%
              </span>
            </div>
            <Progress value={progressPercentage} className="w-full h-2" />
            {remainingSections > 0 && currentSectionId && (
              <div className="text-xs text-muted-foreground text-center">
                {remainingSections === totalCount 
                  ? 'Starting generation...'
                  : `Est. ${estimatedMinutes} minute${estimatedMinutes !== 1 ? 's' : ''} remaining`}
              </div>
            )}
          </div>
        )}

        {/* Current Section Indicator */}
        {currentSectionId && (
          <div className="text-center text-sm font-medium text-primary bg-primary/5 rounded-lg py-2 px-4">
            Currently generating:{" "}
            <span className="font-bold">
              {sections.find(s => s.id === currentSectionId)?.name || currentSectionId}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
