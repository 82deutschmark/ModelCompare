/**
 * Author: Claude Code using Sonnet 4.5
 * Date: 2025-10-22
 * PURPOSE: Render debate intensity selector with enriched rhetoric descriptors.
 *          Refactored to use useDebateSetup and useDebatePrompts hooks directly.
 *          Updated color scheme to navy-blue and standardized typography.
 * SRP/DRY check: Pass - Component solely manages adversarial level selection UI
 */

import { Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDebateSetup } from '@/hooks/useDebateSetup';
import { useDebatePrompts } from '@/hooks/useDebatePrompts';

interface AdversarialLevel {
  id: number;
  name: string;
}

interface AdversarialLevelSelectorProps {
  onStartDebate?: () => void;
  disabled?: boolean;
}

export function AdversarialLevelSelector({
  onStartDebate,
  disabled = false,
}: AdversarialLevelSelectorProps = {}) {
  const { adversarialLevel, setAdversarialLevel } = useDebateSetup();
  const { debateData } = useDebatePrompts();
  const adversarialLevels: AdversarialLevel[] = [
    { id: 1, name: 'Respectful · Pleasant Exchange' },
    { id: 2, name: 'Assertive · Standard Debate' },
    { id: 3, name: 'Aggressive · Fiery Debate' },
    { id: 4, name: 'Combative · Maximum Adversarial' }
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2 mb-2">
        <Target className="w-4 h-4" />
        <label className="text-sm font-semibold">Debate Intensity</label>
      </div>

      <div className="space-y-3">
        {adversarialLevels.map((level) => {
          const descriptor = debateData?.intensities?.[level.id];
          const heading = descriptor?.heading?.replace(/^Level\s+\d+\s*-\s*/i, '') ?? null;
          const levelName = heading || descriptor?.label || level.name;
          const levelGuidance = descriptor?.guidance || descriptor?.fullText || '';

          return (
            <div key={level.id} className="flex items-center space-x-2">
              <input
                type="radio"
                id={`level-${level.id}`}
                checked={adversarialLevel === level.id}
                onChange={() => setAdversarialLevel(level.id)}
              />
              <label htmlFor={`level-${level.id}`} className="flex-1 cursor-pointer">
                <div className="text-sm font-medium">{levelName}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                  {levelGuidance}
                </div>
              </label>
            </div>
          );
        })}
      </div>

      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <div className="text-xs text-blue-700 dark:text-blue-300">
          Higher intensity levels lead to more forceful rhetoric. Choose appropriately.
        </div>
      </div>

      {onStartDebate && (
        <Button
          onClick={onStartDebate}
          disabled={disabled}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium"
          size="lg"
        >
          Start Debate
        </Button>
      )}
    </div>
  );
}
