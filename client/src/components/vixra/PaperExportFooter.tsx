/**
 * Author: Cascade using Claude Sonnet 4
 * Date: 2025-10-04
 * PURPOSE: Export controls footer for completed Vixra papers.
 *          Appears after Abstract (draft mode) and after full completion.
 *          Provides PDF download, markdown copy, and print functionality.
 *          Shows paper statistics and celebration animation on completion.
 * SRP/DRY check: Pass - Single responsibility (export orchestration)
 * shadcn/ui: Pass - Uses Card, Button, Badge
 */

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Copy, Printer, FileText, Sparkles, Clock, BookOpen } from "lucide-react";
import type { Section } from "./SectionProgressTracker";

interface PaperExportFooterProps {
  sections: Section[];
  paperTitle: string;
  paperAuthor: string;
  onExportPDF: () => void;
  onExportMarkdown: () => void;
  onPrint: () => void;
  visible: boolean;
  isComplete: boolean; // true = all sections, false = partial (after abstract)
}

export function PaperExportFooter({
  sections,
  paperTitle,
  paperAuthor,
  onExportPDF,
  onExportMarkdown,
  onPrint,
  visible,
  isComplete
}: PaperExportFooterProps) {
  const [showCelebration, setShowCelebration] = useState(false);

  // Calculate paper statistics
  const completedSections = sections.filter(s => s.status === 'completed');
  const totalWords = completedSections.reduce((sum, section) => {
    return sum + (section.metadata?.wordCount || 0);
  }, 0);
  
  const totalGenerationTime = completedSections.reduce((sum, section) => {
    return sum + (section.metadata?.responseTime || 0);
  }, 0);
  
  // Estimate reading time (average 200 words per minute)
  const readingMinutes = Math.ceil(totalWords / 200);

  // Show celebration animation when paper completes
  useEffect(() => {
    if (isComplete && visible) {
      setShowCelebration(true);
      const timer = setTimeout(() => setShowCelebration(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isComplete, visible]);

  if (!visible) return null;

  return (
    <div className={`fixed bottom-0 left-0 right-0 z-50 ${showCelebration ? 'animate-in slide-in-from-bottom-5 duration-500' : ''}`}>
      <Card className={`mx-auto max-w-4xl mb-4 shadow-2xl border-2 ${
        isComplete 
          ? 'border-green-500/50 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-950/20 dark:to-blue-950/20' 
          : 'border-primary/30'
      }`}>
        <CardContent className="py-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Status & Stats */}
            <div className="flex items-center gap-3 flex-wrap justify-center sm:justify-start">
              <Badge 
                variant={isComplete ? "default" : "secondary"}
                className={`text-sm font-semibold px-3 py-1 ${
                  isComplete 
                    ? 'bg-green-600 hover:bg-green-700' 
                    : 'bg-blue-600 hover:bg-blue-700'
                } ${showCelebration ? 'animate-pulse' : ''}`}
              >
                {isComplete ? (
                  <>
                    <Sparkles className="w-4 h-4 mr-1" />
                    Paper Complete!
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4 mr-1" />
                    Draft Available
                  </>
                )}
              </Badge>

              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <FileText className="w-3 h-3" />
                  <span>{completedSections.length}/{sections.length} sections</span>
                </div>
                
                {totalWords > 0 && (
                  <div className="flex items-center gap-1">
                    <BookOpen className="w-3 h-3" />
                    <span>~{totalWords.toLocaleString()} words</span>
                  </div>
                )}
                
                {readingMinutes > 0 && (
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{readingMinutes} min read</span>
                  </div>
                )}
              </div>
            </div>

            {/* Export Buttons */}
            <div className="flex items-center gap-2 flex-wrap justify-center">
              <Button
                onClick={onExportPDF}
                size="sm"
                variant={isComplete ? "default" : "secondary"}
                className={isComplete ? "bg-green-600 hover:bg-green-700" : ""}
              >
                <Download className="w-4 h-4 mr-2" />
                {isComplete ? 'Download PDF' : 'Download Draft'}
              </Button>
              
              <Button
                onClick={onExportMarkdown}
                size="sm"
                variant="outline"
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy Markdown
              </Button>
              
              <Button
                onClick={onPrint}
                size="sm"
                variant="outline"
              >
                <Printer className="w-4 h-4 mr-2" />
                Print
              </Button>
            </div>
          </div>

          {/* Celebration Message */}
          {showCelebration && isComplete && (
            <div className="mt-3 text-center text-sm font-medium text-green-700 dark:text-green-400 animate-pulse">
              🎉 Congratulations! Your satirical masterpiece is ready to revolutionize science! 🎉
            </div>
          )}

          {/* Draft Mode Helper Text */}
          {!isComplete && (
            <div className="mt-2 text-center text-xs text-muted-foreground">
              Export available now • Full paper export after all sections complete
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
