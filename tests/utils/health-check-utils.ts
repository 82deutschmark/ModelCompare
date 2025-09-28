/**
 * Author: Claude Code using Sonnet 4
 * Date: 2025-09-28 14:30:00
 * PURPOSE: Utilities for health checking AI models including validation, formatting, and result aggregation
 * SRP and DRY check: Pass - Single responsibility for health check utilities, reusable validation logic
 * shadcn/ui: Pass - No UI components needed in test utilities
 */

import type { ModelResponse, ModelConfig } from '../../server/providers/base.js';
import type { ModelDisplay } from '../../shared/model-catalog.js';
import { TestPrompt } from './test-prompts.js';

export type HealthCheckStatus = 'PASS' | 'SLOW' | 'FAIL' | 'SKIP' | 'TIMEOUT';

export interface HealthCheckResult {
  modelId: string;
  status: HealthCheckStatus;
  responseTime: number;
  error?: string;
  response?: ModelResponse;
  testPrompt: TestPrompt;
  timestamp: Date;
  cost?: {
    input: number;
    output: number;
    reasoning?: number;
    total: number;
  };
}

export interface HealthCheckSummary {
  totalModels: number;
  passed: number;
  failed: number;
  skipped: number;
  slow: number;
  timeout: number;
  totalTime: number;
  totalCost: number;
  providerResults: Record<string, {
    passed: number;
    failed: number;
    skipped: number;
    models: string[];
  }>;
}

/**
 * Validate if a model response meets health check criteria
 */
export function validateResponse(response: ModelResponse, testPrompt: TestPrompt): {
  isValid: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  // Check if response has content
  if (!response.content || response.content.trim().length === 0) {
    issues.push('Response content is empty');
  }

  // Check if response contains expected patterns (case-insensitive)
  const content = response.content.toLowerCase();
  const matchedPatterns = testPrompt.expectedPatterns.filter(pattern =>
    content.includes(pattern.toLowerCase())
  );

  if (matchedPatterns.length === 0) {
    issues.push(`Response does not contain any expected patterns: ${testPrompt.expectedPatterns.join(', ')}`);
  }

  // Check if response time is reasonable (not negative or extremely high)
  if (response.responseTime < 0) {
    issues.push('Invalid negative response time');
  }

  if (response.responseTime > 1200000) { // 20 minutes
    issues.push('Response time exceeds maximum threshold (20 minutes)');
  }

  return {
    isValid: issues.length === 0,
    issues
  };
}

/**
 * Determine health check status based on response time and model speed category
 */
export function determineStatus(
  responseTime: number,
  isValid: boolean,
  modelDisplay?: ModelDisplay,
  error?: string
): HealthCheckStatus {
  if (error) {
    if (error.includes('timeout') || error.includes('TIMEOUT')) {
      return 'TIMEOUT';
    }
    return 'FAIL';
  }

  if (!isValid) {
    return 'FAIL';
  }

  // Check if response is slower than expected based on model category
  if (modelDisplay?.responseTime) {
    const expectedMaxTime = getExpectedMaxTime(modelDisplay.responseTime.speed);
    if (responseTime > expectedMaxTime) {
      return 'SLOW';
    }
  }

  return 'PASS';
}

/**
 * Get expected maximum response time based on speed category
 */
function getExpectedMaxTime(speed: 'fast' | 'moderate' | 'slow'): number {
  switch (speed) {
    case 'fast':
      return 60000; // 1 minute
    case 'moderate':
      return 180000; // 3 minutes
    case 'slow':
      return 300000; // 5 minutes
    default:
      return 180000;
  }
}

/**
 * Format response time for human-readable display
 */
export function formatResponseTime(timeMs: number): string {
  if (timeMs < 1000) {
    return `${timeMs}ms`;
  } else if (timeMs < 60000) {
    return `${(timeMs / 1000).toFixed(1)}s`;
  } else {
    const minutes = Math.floor(timeMs / 60000);
    const seconds = Math.floor((timeMs % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  }
}

/**
 * Format cost for display
 */
export function formatCost(cost: number): string {
  if (cost < 0.001) {
    return `$${(cost * 1000).toFixed(3)}m`; // Show in thousandths
  } else if (cost < 0.01) {
    return `$${(cost * 100).toFixed(2)}c`; // Show in cents
  } else {
    return `$${cost.toFixed(4)}`;
  }
}

/**
 * Create summary statistics from health check results
 */
export function createSummary(results: HealthCheckResult[]): HealthCheckSummary {
  const summary: HealthCheckSummary = {
    totalModels: results.length,
    passed: 0,
    failed: 0,
    skipped: 0,
    slow: 0,
    timeout: 0,
    totalTime: 0,
    totalCost: 0,
    providerResults: {}
  };

  results.forEach(result => {
    // Count by status
    switch (result.status) {
      case 'PASS':
        summary.passed++;
        break;
      case 'FAIL':
        summary.failed++;
        break;
      case 'SKIP':
        summary.skipped++;
        break;
      case 'SLOW':
        summary.slow++;
        break;
      case 'TIMEOUT':
        summary.timeout++;
        break;
    }

    // Add to totals
    summary.totalTime += result.responseTime;
    if (result.cost) {
      summary.totalCost += result.cost.total;
    }

    // Group by provider
    const provider = getProviderFromModelId(result.modelId);
    if (!summary.providerResults[provider]) {
      summary.providerResults[provider] = {
        passed: 0,
        failed: 0,
        skipped: 0,
        models: []
      };
    }

    summary.providerResults[provider].models.push(result.modelId);

    if (result.status === 'PASS') {
      summary.providerResults[provider].passed++;
    } else if (result.status === 'SKIP') {
      summary.providerResults[provider].skipped++;
    } else {
      summary.providerResults[provider].failed++;
    }
  });

  return summary;
}

/**
 * Get provider name from model ID
 */
function getProviderFromModelId(modelId: string): string {
  if (modelId.startsWith('gpt-') || modelId.startsWith('o3-') || modelId.startsWith('o4-')) {
    return 'OpenAI';
  } else if (modelId.startsWith('claude-')) {
    return 'Anthropic';
  } else if (modelId.startsWith('gemini-')) {
    return 'Google';
  } else if (modelId.startsWith('deepseek-')) {
    return 'DeepSeek';
  } else if (modelId.startsWith('openrouter/')) {
    return 'OpenRouter';
  }
  return 'Unknown';
}

/**
 * Generate console output with colors
 */
export function formatConsoleOutput(results: HealthCheckResult[], summary: HealthCheckSummary): string {
  const lines: string[] = [];

  lines.push('\n=== Model Health Check Results ===\n');

  // Results by provider
  Object.entries(summary.providerResults).forEach(([provider, stats]) => {
    lines.push(`${provider}:`);
    lines.push(`  ✅ Passed: ${stats.passed}`);
    lines.push(`  ❌ Failed: ${stats.failed}`);
    lines.push(`  ⏭️  Skipped: ${stats.skipped}`);
    lines.push('');
  });

  // Individual results
  results.forEach(result => {
    const statusIcon = getStatusIcon(result.status);
    const timeStr = formatResponseTime(result.responseTime);
    const costStr = result.cost ? formatCost(result.cost.total) : 'N/A';

    lines.push(`${statusIcon} ${result.modelId} - ${timeStr} - ${costStr}`);

    if (result.error) {
      lines.push(`    Error: ${result.error}`);
    }
  });

  // Summary
  lines.push('\n=== Summary ===');
  lines.push(`Total Models: ${summary.totalModels}`);
  lines.push(`✅ Passed: ${summary.passed}`);
  lines.push(`🐌 Slow: ${summary.slow}`);
  lines.push(`❌ Failed: ${summary.failed}`);
  lines.push(`⏰ Timeout: ${summary.timeout}`);
  lines.push(`⏭️  Skipped: ${summary.skipped}`);
  lines.push(`Total Time: ${formatResponseTime(summary.totalTime)}`);
  lines.push(`Total Cost: ${formatCost(summary.totalCost)}`);

  const passRate = summary.totalModels > 0 ?
    ((summary.passed / (summary.totalModels - summary.skipped)) * 100).toFixed(1) : '0';
  lines.push(`Pass Rate: ${passRate}%`);

  return lines.join('\n');
}

function getStatusIcon(status: HealthCheckStatus): string {
  switch (status) {
    case 'PASS': return '✅';
    case 'SLOW': return '🐌';
    case 'FAIL': return '❌';
    case 'TIMEOUT': return '⏰';
    case 'SKIP': return '⏭️';
    default: return '❓';
  }
}