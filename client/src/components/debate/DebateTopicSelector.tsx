/**
 * Debate topic selector component (COMPACT VERSION)
 *
 * Author: Claude Code using Sonnet 4.5
 * Date: 2025-10-22 (REVISED)
 * PURPOSE: Compact topic selection showing full topic text prominently.
 *          Displays selected topic with description, allows quick changes.
 * SRP/DRY check: Pass - Single responsibility, no duplication
 */

import { Edit2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useDebateSetup } from '@/hooks/useDebateSetup';
import { useDebatePrompts } from '@/hooks/useDebatePrompts';

export function DebateTopicSelector() {
  const {
    selectedTopic,
    setSelectedTopic,
    customTopic,
    setCustomTopic,
    useCustomTopic,
    setUseCustomTopic,
  } = useDebateSetup();

  const { debateData } = useDebatePrompts();

  const handleTopicChange = (value: string) => {
    if (value === '__custom__') {
      setUseCustomTopic(true);
    } else {
      setUseCustomTopic(false);
      setSelectedTopic(value);
    }
  };

  // Get the selected topic object for display
  const selectedTopicObj = debateData?.topics.find(t => t.id === selectedTopic);
  const displayTopic = useCustomTopic ? customTopic : selectedTopicObj?.proposition || '';

  return (
    <div className="space-y-2">
      {/* Current Topic Display - ALWAYS VISIBLE */}
      {displayTopic && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
          <div className="text-xs font-semibold text-blue-900 dark:text-blue-100 mb-1 uppercase tracking-wide">
            Current Topic
          </div>
          <p className="text-sm font-medium text-gray-900 dark:text-white leading-snug">
            {displayTopic}
          </p>
        </div>
      )}

      {/* Topic Selector / Editor */}
      <div className="flex items-start gap-2">
        <div className="flex-1">
          {!useCustomTopic ? (
            <Select
              value={selectedTopic}
              onValueChange={handleTopicChange}
            >
              <SelectTrigger className="w-full text-sm">
                <SelectValue placeholder="Choose debate topic..." />
              </SelectTrigger>
              <SelectContent>
                {debateData?.topics.map((topic) => (
                  <SelectItem key={topic.id} value={topic.id}>
                    {topic.title}
                  </SelectItem>
                ))}
                <SelectItem value="__custom__">
                  <span className="italic flex items-center gap-1"><Edit2 className="w-3 h-3" /> Custom topic...</span>
                </SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <Textarea
              value={customTopic}
              onChange={(e) => setCustomTopic(e.target.value)}
              placeholder="Enter custom debate proposition..."
              className="text-sm min-h-[50px] resize-none"
            />
          )}
        </div>

        {useCustomTopic && (
          <Button
            onClick={() => setUseCustomTopic(false)}
            variant="ghost"
            size="sm"
            className="text-xs mt-1"
          >
            Presets
          </Button>
        )}
      </div>
    </div>
  );
}
