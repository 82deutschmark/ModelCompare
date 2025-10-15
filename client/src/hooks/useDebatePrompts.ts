/**
 * Custom hook for managing debate prompts and data loading
 *
 * Author: Cascade
 * Date: October 15, 2025
 * PURPOSE: Handle debate data loading from markdown files and prompt generation logic
 * SRP/DRY check: Pass - Single responsibility for debate prompts management, no duplication with other data loading hooks
 */

import { useState, useEffect } from 'react';
import { parseDebatePromptsFromMarkdown, type DebateInstructions } from '@/lib/promptParser';

export interface DebatePromptsState {
  debateData: DebateInstructions | null;
  loading: boolean;
  error: string | null;
  generateDebatePrompts: (params: {
    selectedTopic: string;
    customTopic: string;
    useCustomTopic: boolean;
    adversarialLevel: number;
  }) => {
    affirmativePrompt: string;
    negativePrompt: string;
    rebuttalTemplate: string;
    topicText: string;
  };
}

export function useDebatePrompts(): DebatePromptsState {
  const [debateData, setDebateData] = useState<DebateInstructions | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load debate instructions/topics from docs
  useEffect(() => {
    const loadDebate = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await parseDebatePromptsFromMarkdown();
        if (!data) throw new Error('Failed to parse debate prompts');
        setDebateData(data);
      } catch (e: any) {
        console.error(e);
        setError(e.message || 'Failed to load debate prompts');
      } finally {
        setLoading(false);
      }
    };
    loadDebate();
  }, []);

  // Generate Robert's Rules debate prompts using parsed templates
  const generateDebatePrompts = (params: {
    selectedTopic: string;
    customTopic: string;
    useCustomTopic: boolean;
    adversarialLevel: number;
  }) => {
    const { selectedTopic, customTopic, useCustomTopic, adversarialLevel } = params;

    const topicText = useCustomTopic
      ? customTopic
      : (debateData?.topics.find(t => t.id === selectedTopic)?.proposition || '');

    const base = (debateData?.baseTemplate || '')
      .replace('{TOPIC}', topicText)
      .replace('{INTENSITY}', String(adversarialLevel));

    const intensityText = debateData?.intensities?.[adversarialLevel] || '';

    const roleBlock = (role: 'AFFIRMATIVE' | 'NEGATIVE', position: 'FOR' | 'AGAINST') =>
      base
        .replace('{ROLE}', role)
        .replace('{POSITION}', position)
      + (intensityText ? `\n\n${intensityText}` : '');

    const rebuttalBase = (debateData?.templates.rebuttal || `You are continuing your formal debate role. Your opponent just argued: "{RESPONSE}"

Respond as the {ROLE} debater following Robert's Rules of Order:
1. Address your opponent's specific points
2. Refute their arguments with evidence and logic
3. Strengthen your own position
4. Use the adversarial intensity level: {INTENSITY}`)
      .replace('{INTENSITY}', String(adversarialLevel))
      + (intensityText ? `\n\n${intensityText}` : '');

    return {
      affirmativePrompt: roleBlock('AFFIRMATIVE', 'FOR'),
      negativePrompt: roleBlock('NEGATIVE', 'AGAINST'),
      rebuttalTemplate: rebuttalBase,
      topicText,
    };
  };

  return {
    debateData,
    loading,
    error,
    generateDebatePrompts,
  };
}
