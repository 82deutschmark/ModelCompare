#!/usr/bin/env node

/**
 * Author: Claude Code using Sonnet 4
 * Date: 2025-09-28 14:30:00
 * PURPOSE: Standalone health check script for CI/CD integration and automated monitoring
 * SRP and DRY check: Pass - Single responsibility for automated health check execution
 * shadcn/ui: Pass - No UI components needed in standalone script
 */

import { execSync } from 'child_process';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// Configuration from command line args and environment
const args = process.argv.slice(2);
const config = parseArgs(args);

/**
 * Parse command line arguments
 */
function parseArgs(args) {
  const config = {
    provider: null,
    fastOnly: false,
    premiumOnly: false,
    reasoningOnly: false,
    output: 'console',
    outputFile: null,
    timeout: parseInt(process.env.HEALTH_CHECK_TIMEOUT || '300000'),
    concurrent: parseInt(process.env.HEALTH_CHECK_CONCURRENT || '3'),
    retryCount: parseInt(process.env.HEALTH_CHECK_RETRY_COUNT || '1'),
    verbose: false,
    webhook: process.env.HEALTH_CHECK_WEBHOOK_URL,
    exitOnFailure: true
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--provider':
        config.provider = args[++i];
        break;
      case '--fast-only':
        config.fastOnly = true;
        break;
      case '--premium-only':
        config.premiumOnly = true;
        break;
      case '--reasoning-only':
        config.reasoningOnly = true;
        break;
      case '--output':
        config.output = args[++i]; // json, html, console
        break;
      case '--output-file':
        config.outputFile = args[++i];
        break;
      case '--timeout':
        config.timeout = parseInt(args[++i]);
        break;
      case '--concurrent':
        config.concurrent = parseInt(args[++i]);
        break;
      case '--retry':
        config.retryCount = parseInt(args[++i]);
        break;
      case '--verbose':
        config.verbose = true;
        break;
      case '--no-exit-on-failure':
        config.exitOnFailure = false;
        break;
      case '--help':
        printHelp();
        process.exit(0);
        break;
      default:
        if (arg.startsWith('--')) {
          console.error(`Unknown option: ${arg}`);
          process.exit(1);
        }
    }
  }

  return config;
}

/**
 * Print help information
 */
function printHelp() {
  console.log(`
Model Health Check Script

Usage: node scripts/health-check.js [options]

Options:
  --provider <name>        Test only specific provider (openai, anthropic, google, deepseek, openrouter)
  --fast-only             Test only fast response models
  --premium-only          Test only premium models
  --reasoning-only        Test only reasoning-capable models
  --output <format>       Output format: console, json, html (default: console)
  --output-file <path>    Write results to file
  --timeout <ms>          Override timeout per model (default: 300000ms)
  --concurrent <num>      Max concurrent tests (default: 3)
  --retry <num>           Retry count for failed tests (default: 1)
  --verbose               Enable verbose logging
  --no-exit-on-failure    Don't exit with error code on test failures
  --help                  Show this help

Environment Variables:
  OPENAI_API_KEY          OpenAI API key
  ANTHROPIC_API_KEY       Anthropic API key
  GEMINI_API_KEY          Google Gemini API key
  DEEPSEEK_API_KEY        DeepSeek API key
  OPENROUTER_API_KEY      OpenRouter API key
  HEALTH_CHECK_WEBHOOK_URL Webhook URL for notifications

Examples:
  node scripts/health-check.js --provider openai --fast-only
  node scripts/health-check.js --output json --output-file results.json
  node scripts/health-check.js --reasoning-only --verbose
`);
}

/**
 * Main execution function
 */
async function main() {
  try {
    console.log('🔍 Starting AI Model Health Check...\n');

    // Validate environment
    const availableProviders = checkApiKeys();
    if (availableProviders.length === 0) {
      console.error('❌ No API keys found! Please set at least one provider API key.');
      process.exit(1);
    }

    console.log(`Available providers: ${availableProviders.join(', ')}\n`);

    // Build environment variables for the test
    const testEnv = {
      ...process.env,
      HEALTH_CHECK_TIMEOUT: config.timeout.toString(),
      HEALTH_CHECK_CONCURRENT: config.concurrent.toString(),
      HEALTH_CHECK_RETRY_COUNT: config.retryCount.toString()
    };

    if (config.provider) {
      testEnv.HEALTH_CHECK_PROVIDER = config.provider;
    }
    if (config.fastOnly) {
      testEnv.HEALTH_CHECK_FAST_ONLY = 'true';
    }

    // Run the vitest health check
    const vitestCommand = 'npx vitest run tests/health-check.test.ts --reporter=verbose';

    console.log(`Running: ${vitestCommand}\n`);

    const startTime = Date.now();
    let testOutput;
    let testExitCode = 0;

    try {
      testOutput = execSync(vitestCommand, {
        cwd: projectRoot,
        env: testEnv,
        encoding: 'utf8',
        stdio: 'pipe'
      });
    } catch (error) {
      testOutput = error.stdout + error.stderr;
      testExitCode = error.status || 1;
    }

    const totalTime = Date.now() - startTime;

    // Parse test output to extract JSON results
    const results = parseTestOutput(testOutput);

    if (config.verbose) {
      console.log('Raw test output:');
      console.log(testOutput);
      console.log('\n' + '='.repeat(80) + '\n');
    }

    // Generate output based on format
    switch (config.output) {
      case 'json':
        const jsonOutput = generateJsonReport(results, totalTime);
        if (config.outputFile) {
          writeOutputFile(config.outputFile, jsonOutput);
          console.log(`📄 JSON report written to: ${config.outputFile}`);
        } else {
          console.log(jsonOutput);
        }
        break;

      case 'html':
        const htmlOutput = generateHtmlReport(results, totalTime);
        const htmlFile = config.outputFile || 'health-check-report.html';
        writeOutputFile(htmlFile, htmlOutput);
        console.log(`📄 HTML report written to: ${htmlFile}`);
        break;

      default:
        // Console output is already shown by vitest
        break;
    }

    // Send webhook notification if configured
    if (config.webhook && results) {
      await sendWebhookNotification(config.webhook, results, totalTime);
    }

    // Exit with appropriate code
    if (config.exitOnFailure && (testExitCode !== 0 || (results && results.summary.failed > 0))) {
      console.log('\\n❌ Health check completed with failures.');
      process.exit(1);
    } else {
      console.log('\\n✅ Health check completed successfully.');
      process.exit(0);
    }

  } catch (error) {
    console.error('💥 Health check script failed:', error.message);
    if (config.verbose) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

/**
 * Check which API keys are available
 */
function checkApiKeys() {
  const providers = [];
  if (process.env.OPENAI_API_KEY) providers.push('OpenAI');
  if (process.env.ANTHROPIC_API_KEY) providers.push('Anthropic');
  if (process.env.GEMINI_API_KEY) providers.push('Google');
  if (process.env.DEEPSEEK_API_KEY) providers.push('DeepSeek');
  if (process.env.OPENROUTER_API_KEY) providers.push('OpenRouter');
  return providers;
}

/**
 * Parse test output to extract JSON results
 */
function parseTestOutput(output) {
  try {
    // Look for JSON results section
    const jsonMatch = output.match(/=== JSON Results ===\\s*\\n(.+)\\n/s);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1]);
    }
  } catch (error) {
    console.warn('⚠️  Could not parse test results JSON:', error.message);
  }
  return null;
}

/**
 * Generate JSON report
 */
function generateJsonReport(results, totalTime) {
  const report = {
    timestamp: new Date().toISOString(),
    totalExecutionTime: totalTime,
    ...results
  };
  return JSON.stringify(report, null, 2);
}

/**
 * Generate HTML report
 */
function generateHtmlReport(results, totalTime) {
  const summary = results?.summary || { totalModels: 0, passed: 0, failed: 0, skipped: 0 };
  const testResults = results?.results || [];

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI Model Health Check Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .summary { background: #f5f5f5; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
        .status-pass { color: #28a745; }
        .status-fail { color: #dc3545; }
        .status-slow { color: #ffc107; }
        .status-skip { color: #6c757d; }
        .status-timeout { color: #fd7e14; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        .timestamp { color: #666; font-size: 0.9em; }
    </style>
</head>
<body>
    <h1>AI Model Health Check Report</h1>
    <div class="timestamp">Generated: ${new Date().toISOString()}</div>

    <div class="summary">
        <h2>Summary</h2>
        <p><strong>Total Models:</strong> ${summary.totalModels}</p>
        <p><strong>Passed:</strong> <span class="status-pass">${summary.passed}</span></p>
        <p><strong>Failed:</strong> <span class="status-fail">${summary.failed}</span></p>
        <p><strong>Slow:</strong> <span class="status-slow">${summary.slow || 0}</span></p>
        <p><strong>Timeout:</strong> <span class="status-timeout">${summary.timeout || 0}</span></p>
        <p><strong>Skipped:</strong> <span class="status-skip">${summary.skipped}</span></p>
        <p><strong>Total Time:</strong> ${formatTime(totalTime)}</p>
        <p><strong>Total Cost:</strong> $${(summary.totalCost || 0).toFixed(4)}</p>
    </div>

    <h2>Individual Results</h2>
    <table>
        <thead>
            <tr>
                <th>Model</th>
                <th>Status</th>
                <th>Response Time</th>
                <th>Cost</th>
                <th>Error</th>
            </tr>
        </thead>
        <tbody>
            ${testResults.map(result => `
                <tr>
                    <td>${result.modelId}</td>
                    <td class="status-${result.status.toLowerCase()}">${result.status}</td>
                    <td>${formatTime(result.responseTime)}</td>
                    <td>$${result.cost ? result.cost.total.toFixed(4) : 'N/A'}</td>
                    <td>${result.error || ''}</td>
                </tr>
            `).join('')}
        </tbody>
    </table>
</body>
</html>
`;
}

/**
 * Format time for display
 */
function formatTime(timeMs) {
  if (timeMs < 1000) return `${timeMs}ms`;
  if (timeMs < 60000) return `${(timeMs / 1000).toFixed(1)}s`;
  const minutes = Math.floor(timeMs / 60000);
  const seconds = Math.floor((timeMs % 60000) / 1000);
  return `${minutes}m ${seconds}s`;
}

/**
 * Write output to file
 */
function writeOutputFile(filepath, content) {
  const dir = dirname(filepath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(filepath, content, 'utf8');
}

/**
 * Send webhook notification
 */
async function sendWebhookNotification(webhookUrl, results, totalTime) {
  try {
    const summary = results.summary;
    const passRate = summary.totalModels > 0 ?
      ((summary.passed / (summary.totalModels - summary.skipped)) * 100).toFixed(1) : '0';

    const payload = {
      text: `🔍 AI Model Health Check Complete`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*AI Model Health Check Results*\\n✅ Passed: ${summary.passed}\\n❌ Failed: ${summary.failed}\\n⏭️ Skipped: ${summary.skipped}\\n📊 Pass Rate: ${passRate}%\\n⏱️ Total Time: ${formatTime(totalTime)}`
          }
        }
      ]
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      console.warn(`⚠️  Webhook notification failed: ${response.status}`);
    } else {
      console.log('📤 Webhook notification sent successfully');
    }
  } catch (error) {
    console.warn(`⚠️  Webhook notification error: ${error.message}`);
  }
}

// Run the script
main().catch(error => {
  console.error('💥 Unhandled error:', error);
  process.exit(1);
});