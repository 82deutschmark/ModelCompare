# Health Check E2E Test Suite Implementation Plan

**Author:** Claude Code using Sonnet 4
**Date:** 2025-09-28
**PURPOSE:** Document the architecture and implementation plan for automated health checks of all AI model providers

## Overview

Create an end-to-end test suite that automatically validates the health and availability of all 24 models across 5 providers (OpenAI, Anthropic, Google, DeepSeek, OpenRouter).

## Architecture Design

### Core Components

1. **Health Check Test Runner** (`tests/health-check.test.ts`)
   - Uses Vitest framework (already configured)
   - Iterates through all models from `MODEL_CATALOG`
   - Sends standardized test prompts
   - Validates response structure and content
   - Reports detailed results with timing and costs

2. **Test Utilities** (`tests/utils/health-check-utils.ts`)
   - Standardized test prompts for different model types
   - Response validation functions
   - Timeout and retry logic
   - Result formatting and reporting

3. **Automated Execution Script** (`scripts/health-check.js`)
   - Standalone Node.js script for CI/CD integration
   - Environment validation
   - Automated scheduling support
   - JSON/HTML report generation

### Test Strategy

#### Test Prompts
- **Standard Models**: "Hello, please respond with exactly: 'Health check successful'"
- **Reasoning Models**: Simple math problem to validate reasoning capabilities
- **Multimodal Models**: Text-only prompts (image testing excluded for simplicity)

#### Validation Criteria
1. **Response Time**: < 5 minutes (configurable per model speed category)
2. **Content Quality**: Non-empty response containing expected patterns
3. **API Structure**: Valid ModelResponse with required fields
4. **Error Handling**: Graceful circuit breaker and provider error handling

#### Coverage Matrix
- All 24 models from `MODEL_CATALOG`
- Provider-specific configurations and error patterns
- Temperature support validation for applicable models
- Reasoning capability validation for supporting models

### Implementation Details

#### File Structure
```
tests/
├── health-check.test.ts        # Main test suite
├── utils/
│   ├── health-check-utils.ts   # Utilities and helpers
│   └── test-prompts.ts         # Standardized test prompts
scripts/
└── health-check.js             # Standalone execution script
```

#### npm Scripts
- `npm run health-check` - Run full health check suite
- `npm run health-check:quick` - Run subset of fastest models only
- `npm run health-check:report` - Generate detailed HTML report

### Error Handling & Reporting

#### Circuit Breaker Integration
- Respect existing circuit breaker states
- Report breaker status in test results
- Allow tests to continue if individual providers fail

#### Result Categories
1. **PASS**: Model responds successfully within time limits
2. **SLOW**: Model responds but exceeds optimal time thresholds
3. **FAIL**: Model returns error or invalid response
4. **SKIP**: Model skipped due to missing API keys or circuit breaker

#### Report Format
- Console output with color-coded results
- JSON report for programmatic consumption
- Optional HTML report with detailed timing charts
- Summary statistics (pass rate, average response time, total cost)

### Configuration

#### Environment Variables
```bash
# Required for respective providers
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GEMINI_API_KEY=AI...
DEEPSEEK_API_KEY=sk-...
OPENROUTER_API_KEY=sk-...

# Test configuration
HEALTH_CHECK_TIMEOUT=300000     # 5 minute default timeout
HEALTH_CHECK_CONCURRENT=3       # Max concurrent tests
HEALTH_CHECK_RETRY_COUNT=1      # Retry failed tests once
```

#### Filtering Options
- `--provider=openai` - Test only specific provider
- `--fast-only` - Test only fast response models
- `--premium-only` - Test only premium models
- `--reasoning-only` - Test only reasoning-capable models

### Integration Points

#### CI/CD Integration
- Exit code 0 for all tests passing
- Exit code 1 for any critical failures
- JSON output for integration with monitoring systems
- Optional Slack/Discord webhook notifications

#### Monitoring Integration
- Results can be ingested by monitoring systems
- Historical trend tracking capability
- Alert thresholds for provider availability

## Implementation Timeline

1. **Phase 1**: Core test infrastructure and basic model validation
2. **Phase 2**: Advanced reporting and filtering options
3. **Phase 3**: CI/CD integration and monitoring hooks
4. **Phase 4**: Historical tracking and trend analysis

## Success Criteria

1. **Coverage**: All 24 models tested automatically
2. **Reliability**: Handles provider outages gracefully
3. **Performance**: Complete test suite runs in < 30 minutes
4. **Usability**: Clear reporting and actionable error messages
5. **Automation**: Integrates seamlessly with existing npm scripts