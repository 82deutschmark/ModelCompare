/**
 * Debate service class for managing debate business logic
 *
 * Author: Cascade
 * Date: October 15, 2025
 * PURPOSE: Centralized service layer for debate operations including prompt generation, rebuttal building, and cost calculation
 * SRP/DRY check: Pass - Single responsibility for debate business logic, no duplication with component logic
 */

import type { DebateInstructions } from '@/lib/promptParser';
import { replaceTemplatePlaceholders } from '@/lib/templateTokens';
import type { AIModel } from '@/types/ai-models';

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
      : (this.debateData?.topics.find(t => t.id === this.selectedTopic)?.proposition || '');

    const baseTemplate = this.debateData?.baseTemplate || '';
    const baseWithContext = replaceTemplatePlaceholders(baseTemplate, {
      topic: topicText,
      intensity: String(this.adversarialLevel),
    });

    const intensityText = this.debateData?.intensities?.[this.adversarialLevel] || '';

    const roleBlock = (role: 'AFFIRMATIVE' | 'NEGATIVE', position: 'FOR' | 'AGAINST') => {
      const withRole = replaceTemplatePlaceholders(baseWithContext, {
        role,
        position,
      });
      return intensityText ? `${withRole}\n\n${intensityText}` : withRole;
    };

    const rebuttalTemplate = this.debateData?.templates.rebuttal || `You are continuing your formal debate role. Your opponent just argued: "{RESPONSE}"

Respond as the {ROLE} debater following Robert's Rules of Order:
1. Address your opponent's specific points
2. Refute their arguments with evidence and logic
3. Strengthen your own position
4. Use the adversarial intensity level: {INTENSITY}`;
    const rebuttalBase = replaceTemplatePlaceholders(rebuttalTemplate, {
      intensity: String(this.adversarialLevel),
    });
    const finalRebuttal = intensityText ? `${rebuttalBase}\n\n${intensityText}` : rebuttalBase;

    return {
      affirmativePrompt: roleBlock('AFFIRMATIVE', 'FOR'),
      negativePrompt: roleBlock('NEGATIVE', 'AGAINST'),
      rebuttalTemplate: finalRebuttal,
      topicText,
    };
  }

  // Build rebuttal prompt for continuing debate
  buildRebuttalPrompt(lastMessage: string, role: 'AFFIRMATIVE' | 'NEGATIVE', position: 'FOR' | 'AGAINST') {
    const prompts = this.generatePrompts();
    const currentTopic = prompts.topicText;

    return replaceTemplatePlaceholders(prompts.rebuttalTemplate, {
      response: lastMessage,
      role,
      position,
      original_prompt: currentTopic,
      topic: currentTopic,
    });
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
