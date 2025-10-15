/**
 * Debate controls component for managing debate flow
 *
 * Author: Cascade
 * Date: October 15, 2025
 * PURPOSE: Handles debate progress display, action buttons, and session management
 * SRP/DRY check: Pass - Single responsibility for debate controls, no duplication with other control components
 */

import { ChevronUp, ChevronDown, Download, Copy, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatCost } from '@/lib/formatUtils';

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
}: DebateControlsProps) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center space-x-4">
        <div className="text-sm font-medium">
          {currentRound} exchanges • Manual control
        </div>
        {totalCost > 0 && (
          <div className="text-sm font-medium text-green-600">
            Total Cost: {formatCost(totalCost)}
          </div>
        )}
      </div>

      <div className="flex items-center space-x-2">
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
  );
}
