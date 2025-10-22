/**
 * Debate topic selector component
 *
 * Author: Claude Code using Sonnet 4.5
 * Date: 2025-10-22
 * PURPOSE: Handles topic selection UI including preset topics and custom topic input.
 *          Refactored to use useDebateSetup hook directly, eliminating prop drilling.
 * SRP/DRY check: Pass - Single responsibility for topic selection, uses existing hooks
 */

import { Gavel } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
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

  return (
    <div className="space-y-2">
      {!useCustomTopic ? (
        <Select
          value={selectedTopic}
          onValueChange={handleTopicChange}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Choose debate topic..." />
          </SelectTrigger>
          <SelectContent>
            {debateData?.topics.map((topic) => (
              <SelectItem key={topic.id} value={topic.id}>
                {topic.title}
              </SelectItem>
            ))}
            <SelectItem value="__custom__">
              <span className="italic">Custom topic...</span>
            </SelectItem>
          </SelectContent>
        </Select>
      ) : (
        <div className="space-y-1">
          <Textarea
            value={customTopic}
            onChange={(e) => setCustomTopic(e.target.value)}
            placeholder="Enter custom debate proposition..."
            className="min-h-[60px] text-sm"
          />
          <button
            onClick={() => setUseCustomTopic(false)}
            className="text-xs text-blue-600 hover:underline"
          >
            ← Back to presets
          </button>
        </div>
      )}
    </div>
  );
}
