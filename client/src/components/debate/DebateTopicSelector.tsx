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

  const { debateData, loading: debateLoading, error: debateError } = useDebatePrompts();
  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2 mb-2">
        <Gavel className="w-4 h-4" />
        <label className="text-sm font-semibold">Debate Topic</label>
      </div>

      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <input
            type="radio"
            id="preset-topic"
            checked={!useCustomTopic}
            onChange={() => setUseCustomTopic(false)}
          />
          <label htmlFor="preset-topic" className="text-sm">Select from presets</label>
        </div>

        {!useCustomTopic && (
          <Select value={selectedTopic} onValueChange={setSelectedTopic}>
            <SelectTrigger>
              <SelectValue placeholder="Choose debate topic" />
            </SelectTrigger>
            <SelectContent>
              {debateData?.topics.map((topic) => (
                <SelectItem key={topic.id} value={topic.id}>
                  <div className="flex flex-col">
                    <span className="font-medium">{topic.title}</span>
                    <span className="text-xs text-gray-500 truncate max-w-48">
                      {topic.proposition}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <div className="flex items-center space-x-2">
          <input
            type="radio"
            id="custom-topic"
            checked={useCustomTopic}
            onChange={() => setUseCustomTopic(true)}
          />
          <label htmlFor="custom-topic" className="text-sm">Custom topic</label>
        </div>

        {useCustomTopic && (
          <Textarea
            value={customTopic}
            onChange={(e) => setCustomTopic(e.target.value)}
            placeholder="Enter your debate proposition..."
            className="min-h-[80px]"
          />
        )}
      </div>

      {/* Current Topic Display */}
      <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <div className="text-xs text-gray-500 mb-1">Current Topic:</div>
        <div className="text-sm font-medium break-words whitespace-normal max-h-24 overflow-y-auto">
          {useCustomTopic
            ? (customTopic || 'Enter custom topic above')
            : (debateData?.topics.find(t => t.id === selectedTopic)?.proposition || 'Select a topic')}
        </div>
      </div>
    </div>
  );
}
