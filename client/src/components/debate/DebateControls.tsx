// * Author: gpt-5-codex
// * Date: 2025-10-17 19:26 UTC
// * PURPOSE: Expand debate controls with phase toggles, floor status, and optional jury review cues for upcoming turns.
// * SRP/DRY check: Pass - Still orchestrates debate-level controls without absorbing other responsibilities.
/**
 * Debate controls component for managing debate flow
 */

import { ChevronUp, ChevronDown, Download, Copy, RotateCcw, Gavel, Clock, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatCost } from '@/lib/formatUtils';
import { Badge } from '@/components/ui/badge';
import type { DebatePhase } from '@/hooks/useDebateSession';

interface DebateControlsProps {
  currentRound: number;
  totalCost: number;
  messagesCount: number;
  showSetup: boolean;
  setShowSetup: (show: boolean) => void;
  onExportMarkdown: () => void;
  onCopyToClipboard: () => void;
  onResetDebate: () => void;
  isPending?: boolean;
  nextModelName?: string;
  currentPhase: DebatePhase;
  onAdvancePhase: () => void;
  isFloorOpen: boolean;
  onToggleFloor: () => void;
  hasJuryPending: boolean;
}

export function DebateControls({
  currentRound,
  totalCost,
  messagesCount,
  showSetup,
  setShowSetup,
  onExportMarkdown,
  onCopyToClipboard,
  onResetDebate,
  isPending = false,
  nextModelName,
  currentPhase,
  onAdvancePhase,
  isFloorOpen,
  onToggleFloor,
  hasJuryPending,
}: DebateControlsProps) {
  const phaseLabel: Record<DebatePhase, string> = {
    OPENING_STATEMENTS: 'Opening Statements',
    REBUTTALS: 'Rebuttals',
    CLOSING_ARGUMENTS: 'Closing Arguments',
  };
  const isFinalPhase = currentPhase === 'CLOSING_ARGUMENTS';
  const advanceDisabledReason = isPending
    ? 'Wait for the current response to finish streaming.'
    : isFinalPhase
      ? 'Closing arguments reached; no further phases to advance to.'
      : undefined;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="text-sm font-medium flex items-center gap-2">
            <Gavel className="w-4 h-4" />
            {phaseLabel[currentPhase]}
            <Badge
              variant={isFloorOpen ? 'outline' : 'secondary'}
              className={
                isFloorOpen
                  ? 'border-green-600 text-green-700 dark:text-green-400 dark:border-green-500'
                  : 'bg-amber-500/20 text-amber-600 dark:text-amber-300'
              }
            >
              {isFloorOpen ? 'Floor Open' : 'Floor Closed'}
            </Badge>
          </div>
          <div className="text-xs text-muted-foreground flex items-center gap-2">
            <Clock className="w-3 h-3" />
            {currentRound} exchanges • Manual control
            {nextModelName && (
              <span className="font-medium text-foreground">
                Next: {nextModelName}
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={onAdvancePhase}
            size="sm"
            variant="secondary"
            disabled={isPending || isFinalPhase}
            title={advanceDisabledReason}
          >
            <Gavel className="w-4 h-4 mr-2" />
            Advance Phase
          </Button>
          <Button
            onClick={onToggleFloor}
            size="sm"
            variant={isFloorOpen ? 'outline' : 'default'}
          >
            {isFloorOpen ? 'Close Floor' : 'Reopen Floor'}
          </Button>
          <Button
            onClick={onExportMarkdown}
            variant="outline"
            size="sm"
            disabled={messagesCount === 0}
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>

          <Button
            onClick={onCopyToClipboard}
            variant="outline"
            size="sm"
            disabled={messagesCount === 0}
          >
            <Copy className="w-4 h-4 mr-2" />
            Copy
          </Button>

          <Button
            onClick={onResetDebate}
            variant="outline"
            size="sm"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            New Debate
          </Button>

          <Button
            onClick={() => setShowSetup(!showSetup)}
            variant="ghost"
            size="sm"
          >
            {showSetup ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        {totalCost > 0 ? (
          <div className="text-sm font-medium text-green-600">
            Total Cost: {formatCost(totalCost)}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">Total Cost: Pending</div>
        )}
        {hasJuryPending && (
          <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-300">
            <AlertTriangle className="w-4 h-4" />
            Jury review pending. Capture annotations when convenient.
          </div>
        )}
        {!hasJuryPending && isFinalPhase && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <AlertTriangle className="w-4 h-4" />
            Closing arguments in progress. Capture verdicts before ending the session.
          </div>
        )}
      </div>
    </div>
  );
}
