/**
 * Author: Claude Code using Sonnet 4
 * Date: 2025-09-28 14:30:00
 * PURPOSE: End-to-end health check test suite for all AI model providers and models
 * SRP and DRY check: Pass - Single responsibility for health checking, reuses existing provider infrastructure
 * shadcn/ui: Pass - No UI components needed in test suite
 */

import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { MODEL_CATALOG, type ModelDisplay } from '../shared/model-catalog.js';
import { callModelWithMessages, getAllModels, getModelById } from '../server/providers/index.js';
import type { ModelMessage, ModelResponse, CallOptions } from '../server/providers/base.js';
import {
  type HealthCheckResult,
  type HealthCheckSummary,
  validateResponse,
  determineStatus,
  createSummary,
  formatConsoleOutput,
  formatResponseTime,
  formatCost
} from './utils/health-check-utils.js';
import {
  getTestPromptForModel,
  getTimeoutForModel,
  BASIC_HEALTH_CHECK
} from './utils/test-prompts.js';

// Test configuration from environment
const HEALTH_CHECK_TIMEOUT = parseInt(process.env.HEALTH_CHECK_TIMEOUT || '300000'); // 5 minutes default
const HEALTH_CHECK_CONCURRENT = parseInt(process.env.HEALTH_CHECK_CONCURRENT || '3'); // Max 3 concurrent
const HEALTH_CHECK_RETRY_COUNT = parseInt(process.env.HEALTH_CHECK_RETRY_COUNT || '1'); // Retry once
const PROVIDER_FILTER = process.env.HEALTH_CHECK_PROVIDER?.toLowerCase(); // Optional provider filter
const FAST_ONLY = process.env.HEALTH_CHECK_FAST_ONLY === 'true';

let healthCheckResults: HealthCheckResult[] = [];

describe('AI Model Health Checks', () => {
  let availableModels: string[] = [];

  beforeAll(async () => {
    // Get all models from catalog that we want to test
    availableModels = Object.keys(MODEL_CATALOG);

    // Apply provider filter if specified
    if (PROVIDER_FILTER) {
      availableModels = availableModels.filter(modelId => {
        const display = MODEL_CATALOG[modelId];
        return display?.provider.toLowerCase() === PROVIDER_FILTER;
      });
    }

    // Apply fast-only filter if specified
    if (FAST_ONLY) {
      availableModels = availableModels.filter(modelId => {
        const display = MODEL_CATALOG[modelId];
        return display?.responseTime.speed === 'fast';
      });
    }

    console.log(`\nPreparing to test ${availableModels.length} models...`);

    // Check which API keys are available
    const availableProviders = checkAvailableProviders();
    console.log(`Available providers: ${availableProviders.join(', ')}`);

    // Filter models to only those with available API keys
    availableModels = availableModels.filter(modelId => {
      const display = MODEL_CATALOG[modelId];
      return display && availableProviders.includes(display.provider);
    });

    console.log(`Testing ${availableModels.length} models with available API keys\n`);
  });

  afterAll(() => {
    // Create summary and output results
    const summary = createSummary(healthCheckResults);
    const output = formatConsoleOutput(healthCheckResults, summary);
    console.log(output);

    // Write results to JSON file for programmatic consumption
    const resultsJson = {
      timestamp: new Date().toISOString(),
      summary,
      results: healthCheckResults
    };

    // Don't use fs.writeFileSync in tests - just log for now
    console.log('\n=== JSON Results ===');
    console.log(JSON.stringify(resultsJson, null, 2));
  });

  // Test each model individually
  test.each(MODEL_CATALOG ? Object.keys(MODEL_CATALOG) : [])(
    'Health check: %s',
    async (modelId: string) => {
      // Skip if not in our filtered list
      if (!availableModels.includes(modelId)) {
        return;
      }

      const modelDisplay = MODEL_CATALOG[modelId];
      const modelConfig = getModelById(modelId);

      if (!modelConfig) {
        const result: HealthCheckResult = {
          modelId,
          status: 'SKIP',
          responseTime: 0,
          error: 'Model not found in provider registry',
          testPrompt: BASIC_HEALTH_CHECK,
          timestamp: new Date()
        };
        healthCheckResults.push(result);
        return;
      }

      const testPrompt = getTestPromptForModel(
        modelId,
        modelDisplay?.supportsReasoning,
        modelDisplay?.supportsTemperature
      );

      const timeout = Math.min(
        getTimeoutForModel(modelDisplay?.responseTime),
        HEALTH_CHECK_TIMEOUT
      );

      let result: HealthCheckResult;
      let retryCount = 0;

      while (retryCount <= HEALTH_CHECK_RETRY_COUNT) {
        try {
          const startTime = Date.now();

          // Set up call options for models that support temperature
          const callOptions: CallOptions = {};
          if (modelDisplay?.supportsTemperature) {
            callOptions.temperature = 0.7;
          }

          // Call the model with timeout
          const response = await Promise.race([
            callModelWithMessages(testPrompt.messages, modelId, callOptions),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error('TIMEOUT')), timeout)
            )
          ]);

          const responseTime = Date.now() - startTime;

          // Validate response
          const validation = validateResponse(response, testPrompt);
          const status = determineStatus(responseTime, validation.isValid, modelDisplay);

          result = {
            modelId,
            status,
            responseTime,
            response,
            testPrompt,
            timestamp: new Date(),
            cost: response.cost,
            error: validation.isValid ? undefined : validation.issues.join('; ')
          };

          // If successful or we've exhausted retries, break
          if (status === 'PASS' || status === 'SLOW' || retryCount >= HEALTH_CHECK_RETRY_COUNT) {
            break;
          }

          retryCount++;
          console.log(`Retrying ${modelId} (attempt ${retryCount + 1}/${HEALTH_CHECK_RETRY_COUNT + 1})`);

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';

          result = {
            modelId,
            status: errorMessage.includes('TIMEOUT') ? 'TIMEOUT' : 'FAIL',
            responseTime: 0,
            error: errorMessage,
            testPrompt,
            timestamp: new Date()
          };

          // If it's not a timeout and we can retry, try again
          if (!errorMessage.includes('TIMEOUT') && retryCount < HEALTH_CHECK_RETRY_COUNT) {
            retryCount++;
            console.log(`Retrying ${modelId} after error: ${errorMessage}`);
            continue;
          }

          break;
        }
      }

      healthCheckResults.push(result!);

      // Log individual result
      const statusIcon = result!.status === 'PASS' ? '✅' :
                        result!.status === 'SLOW' ? '🐌' :
                        result!.status === 'TIMEOUT' ? '⏰' :
                        result!.status === 'SKIP' ? '⏭️' : '❌';

      console.log(`${statusIcon} ${modelId} - ${formatResponseTime(result!.responseTime)} - ${
        result!.cost ? formatCost(result!.cost.total) : 'N/A'
      }`);

      if (result!.error) {
        console.log(`    Error: ${result!.error}`);
      }

      // Test assertions
      expect(result!).toBeDefined();
      expect(result!.modelId).toBe(modelId);
      expect(result!.status).toMatch(/^(PASS|SLOW|FAIL|SKIP|TIMEOUT)$/);

      // Only fail the test for critical failures, not slow responses
      if (result!.status === 'FAIL' || result!.status === 'TIMEOUT') {
        throw new Error(`Health check failed for ${modelId}: ${result!.error || 'Unknown error'}`);
      }
    },
    HEALTH_CHECK_TIMEOUT + 10000 // Add 10s buffer to vitest timeout
  );
});

/**
 * Check which providers have API keys available
 */
function checkAvailableProviders(): string[] {
  const providers: string[] = [];

  if (process.env.OPENAI_API_KEY) providers.push('OpenAI');
  if (process.env.ANTHROPIC_API_KEY) providers.push('Anthropic');
  if (process.env.GEMINI_API_KEY) providers.push('Gemini');
  if (process.env.DEEPSEEK_API_KEY) providers.push('DeepSeek');
  if (process.env.OPENROUTER_API_KEY) providers.push('OpenRouter');

  return providers;
}