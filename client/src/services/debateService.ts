/**
 * Debate service class for managing debate business logic
 *
 * Author: Cascade
 * Date: October 15, 2025
 * PURPOSE: Centralized service layer for debate operations including prompt generation, rebuttal building, and cost calculation
 * SRP/DRY check: Pass - Single responsibility for debate business logic, no duplication with component logic
 */

import type { DebateInstructions } from '@/lib/promptParser';
import type { AIModel } from '@/types/ai-models';
import { applyTemplateReplacements, formatOpponentQuote } from '@/lib/debatePromptUtils';
import { getDebateIntensityDescriptor } from '@shared/debate-instructions.ts';

export interface DebateServiceConfig {
  debateData: DebateInstructions | null;
  models: AIModel[];
  selectedTopic: string;
  customTopic: string;
  useCustomTopic: boolean;
  adversarialLevel: number;
  model1Id: string;
  model2Id: string;
}

export class DebateService {
  private debateData: DebateInstructions | null;
  private models: AIModel[];
  private selectedTopic: string;
  private customTopic: string;
  private useCustomTopic: boolean;
  private adversarialLevel: number;
  private model1Id: string;
  private model2Id: string;

  constructor(config: DebateServiceConfig) {
    this.debateData = config.debateData;
    this.models = config.models;
    this.selectedTopic = config.selectedTopic;
    this.customTopic = config.customTopic;
    this.useCustomTopic = config.useCustomTopic;
    this.adversarialLevel = config.adversarialLevel;
    this.model1Id = config.model1Id;
    this.model2Id = config.model2Id;
  }

  // Update service configuration
  updateConfig(config: Partial<DebateServiceConfig>) {
    Object.assign(this, config);
  }

  // Generate Robert's Rules debate prompts using parsed templates
  generatePrompts() {
    const topicText = this.useCustomTopic
      ? this.customTopic
      : (this.debateData?.topics.find(t => t.id === this.selectedTopic)?.proposition || "");

    const intensityDescriptor = getDebateIntensityDescriptor(this.debateData, this.adversarialLevel);
    const intensityFullText = intensityDescriptor?.fullText || `Level ${this.adversarialLevel}`;
    const intensityLabel = intensityDescriptor?.label || `Level ${this.adversarialLevel}`;
    const intensitySummary = intensityDescriptor?.summary || "";

    const baseTemplate = applyTemplateReplacements(this.debateData?.baseTemplate || "", {
      topic: topicText,
      intensity: intensityFullText,
      intensity_level: String(this.adversarialLevel),
      intensity_label: intensityLabel,
      intensity_summary: intensitySummary,
    });

    const roleBlock = (role: "AFFIRMATIVE" | "NEGATIVE", position: "FOR" | "AGAINST") => {
      const resolved = applyTemplateReplacements(baseTemplate, { role, position });
      return resolved;
    };

    const fallbackRebuttal = `You are responding to your opponent as the {role} debater arguing {position} the proposition: "{topic}".

Debate intensity: {intensity}

Structure your rebuttal by:
1. Identifying the key weaknesses in your opponent's argument
2. Presenting three strong counter-arguments with evidence
3. Reinforcing your original position with additional supporting evidence
4. Challenging their main claims with factual rebuttals`;

    const rebuttalTemplate = applyTemplateReplacements(this.debateData?.templates.rebuttal || fallbackRebuttal, {
      topic: topicText,
      intensity: intensityFullText,
      intensity_level: String(this.adversarialLevel),
      intensity_label: intensityLabel,
      intensity_summary: intensitySummary,
    });

    return {
      affirmativePrompt: roleBlock("AFFIRMATIVE", "FOR"),
      negativePrompt: roleBlock("NEGATIVE", "AGAINST"),
      rebuttalTemplate,
      topicText,
    };
  }

  // Build rebuttal prompt for continuing debate
  buildRebuttalPrompt(lastMessage: string, role: 'AFFIRMATIVE' | 'NEGATIVE', position: 'FOR' | 'AGAINST') {
    const prompts = this.generatePrompts();
    const currentTopic = prompts.topicText;

    const opponentQuote = formatOpponentQuote(lastMessage);

    const intensityDescriptor = getDebateIntensityDescriptor(this.debateData, this.adversarialLevel);
    const intensityFullText = intensityDescriptor?.fullText || `Level ${this.adversarialLevel}`;
    const intensityLabel = intensityDescriptor?.label || `Level ${this.adversarialLevel}`;
    const intensitySummary = intensityDescriptor?.summary || '';

    const resolvedTemplate = applyTemplateReplacements(prompts.rebuttalTemplate, {
      role,
      position,
      topic: currentTopic,
      intensity: intensityFullText,
      intensity_level: String(this.adversarialLevel),
      intensity_label: intensityLabel,
      intensity_summary: intensitySummary,
      response: lastMessage,
    });

    return `${opponentQuote}${resolvedTemplate}`;
  }

  // Get next debater model ID
  getNextDebater(currentRound: number): string {
    // Model 1 (Affirmative/Pro) goes first, then Model 2 (Negative/Con), alternating
    return currentRound % 2 === 1 ? this.model2Id : this.model1Id;
  }

  // Calculate total cost of all messages
  calculateTotalCost(messages: any[]): number {
    return messages.reduce((sum, msg) => sum + (msg.cost?.total || 0), 0);
  }

  // Get model name by ID
  getModelName(modelId: string): string {
    return this.models.find(m => m.id === modelId)?.name || 'Unknown Model';
  }

  // Get model by ID
  getModel(modelId: string): AIModel | undefined {
    return this.models.find(m => m.id === modelId);
  }

  // Check if debate can start (both models selected)
  canStartDebate(): boolean {
    return !!(this.model1Id && this.model2Id);
  }

  // Get debate topic text
  getTopicText(): string {
    return this.useCustomTopic
      ? this.customTopic
      : (this.debateData?.topics.find(t => t.id === this.selectedTopic)?.proposition || '');
  }
}
