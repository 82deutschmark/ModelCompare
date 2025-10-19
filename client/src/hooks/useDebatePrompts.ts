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
import { applyTemplateReplacements } from '@/lib/debatePromptUtils';

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
      : (debateData?.topics.find(t => t.id === selectedTopic)?.proposition || "");

    const baseTemplate = applyTemplateReplacements(debateData?.baseTemplate || "", {
      topic: topicText,
      intensity: String(adversarialLevel),
    });

    const intensityText = debateData?.intensities?.[adversarialLevel] || "";

    const roleBlock = (role: "AFFIRMATIVE" | "NEGATIVE", position: "FOR" | "AGAINST") => {
      const resolved = applyTemplateReplacements(baseTemplate, { role, position });
      return intensityText ? `${resolved}\n\n${intensityText}` : resolved;
    };

    const fallbackRebuttal = `You are responding to your opponent as the {role} debater arguing {position} the proposition: "{topic}".

Debate intensity: {intensity}

Structure your rebuttal by:
1. Identifying the key weaknesses in your opponent's argument
2. Presenting three strong counter-arguments with evidence
3. Reinforcing your original position with additional supporting evidence
4. Challenging their main claims with factual rebuttals`;

    const rebuttalBase = applyTemplateReplacements(debateData?.templates.rebuttal || fallbackRebuttal, {
      topic: topicText,
      intensity: String(adversarialLevel),
    });

    const rebuttalTemplate = intensityText ? `${rebuttalBase}\n\n${intensityText}` : rebuttalBase;

    return {
      affirmativePrompt: roleBlock("AFFIRMATIVE", "FOR"),
      negativePrompt: roleBlock("NEGATIVE", "AGAINST"),
      rebuttalTemplate,
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
