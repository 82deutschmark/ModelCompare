/**
 * Adversarial level selector component for debate mode
 *
 * Author: Cascade
 * Date: October 15, 2025
 * PURPOSE: Handles debate intensity selection with level descriptions and warnings
 * SRP/DRY check: Pass - Single responsibility for intensity selection, no duplication with other selection components
 */

import { Target } from 'lucide-react';
import type { DebateInstructions } from '@/lib/promptParser';

interface AdversarialLevel {
  id: number;
  name: string;
}

interface AdversarialLevelSelectorProps {
  debateData: DebateInstructions | null;
  adversarialLevel: number;
  setAdversarialLevel: (level: number) => void;
  onStartDebate?: () => void;
  disabled?: boolean;
}

export function AdversarialLevelSelector({
  debateData,
  adversarialLevel,
  setAdversarialLevel,
  onStartDebate,
  disabled = false,
}: AdversarialLevelSelectorProps) {
  const adversarialLevels: AdversarialLevel[] = [
    { id: 1, name: 'Respectful' },
    { id: 2, name: 'Assertive' },
    { id: 3, name: 'Aggressive' },
    { id: 4, name: 'Combative' }
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2 mb-2">
        <Target className="w-4 h-4" />
        <label className="text-sm font-medium">Debate Intensity</label>
      </div>

      <div className="space-y-3">
        {adversarialLevels.map((level) => {
          const descriptor = debateData?.intensities?.[level.id];
          const levelName = descriptor?.label || level.name;
          const levelGuidance = descriptor?.summary
            ? `${descriptor.summary}`
            : descriptor?.guidance || '';

          return (
            <div key={level.id} className="flex items-center space-x-2">
              <input
                type="radio"
                id={`level-${level.id}`}
                checked={adversarialLevel === level.id}
                onChange={() => setAdversarialLevel(level.id)}
                disabled={disabled}
              />
              <label htmlFor={`level-${level.id}`} className="flex-1">
                <div className="text-sm font-medium">{levelName}</div>
                <div className="text-xs text-gray-500 line-clamp-2">
                  {levelGuidance}
                </div>
              </label>
            </div>
          );
        })}
      </div>

      <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
        <div className="text-xs text-amber-700 dark:text-amber-300">
          Higher intensity levels lead to more forceful rhetoric. Choose appropriately.
        </div>
      </div>

      {onStartDebate && (
        <button
          onClick={onStartDebate}
          disabled={disabled}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white py-2 px-4 rounded-md font-medium"
        >
          Start Debate
        </button>
      )}
    </div>
  );
}
