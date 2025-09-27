/**
 * Author: Buffy (Claude Assistant)
 * Date: 2025-01-14
 * PURPOSE: Usage examples for the UsageQuotaDisplay component.
 * Demonstrates different integration patterns and use cases.
 * SRP/DRY check: Pass - Single responsibility (examples), reuses component
 * shadcn/ui: Pass - Shows proper shadcn/ui integration patterns
 */

import React from 'react';
import { UsageQuotaDisplay } from './UsageQuotaDisplay';

// Basic usage example
export function BasicUsageExample() {
  const sampleData = {
    usageData: {
      today: [
        { date: '2025-01-14', tokens: 25000, calls: 50, credits: 12.50 },
      ],
      week: [
        { date: '2025-01-08', tokens: 15000, calls: 30, credits: 8.20 },
        { date: '2025-01-09', tokens: 22000, calls: 45, credits: 11.10 },
        { date: '2025-01-10', tokens: 18000, calls: 38, credits: 9.75 },
        { date: '2025-01-11', tokens: 31000, calls: 62, credits: 15.40 },
        { date: '2025-01-12', tokens: 28000, calls: 55, credits: 14.20 },
        { date: '2025-01-13', tokens: 24000, calls: 48, credits: 12.80 },
        { date: '2025-01-14', tokens: 25000, calls: 50, credits: 12.50 },
      ],
      month: [
        // ... 30 days of data
      ],
    },
    modelUsage: [
      {
        model: 'GPT-4o',
        provider: 'OpenAI',
        calls: 75,
        tokens: 37500,
        credits: 22.50,
        percentage: 45.0,
      },
      {
        model: 'Claude Sonnet 4',
        provider: 'Anthropic',
        calls: 60,
        tokens: 30000,
        credits: 18.00,
        percentage: 36.0,
      },
      {
        model: 'Gemini 2.5 Pro',
        provider: 'Google',
        calls: 40,
        tokens: 20000,
        credits: 12.00,
        percentage: 19.0,
      },
    ],
    quotaLimits: {
      tokens: 1000000,
      calls: 2000,
      credits: 500,
    },
    currentTotals: {
      tokens: 163000,
      calls: 328,
      credits: 83.50,
    },
  };

  return (
    <UsageQuotaDisplay
      usageData={sampleData.usageData}
      modelUsage={sampleData.modelUsage}
      quotaLimits={sampleData.quotaLimits}
      currentTotals={sampleData.currentTotals}
    />
  );
}

// High usage warning example
export function HighUsageWarningExample() {
  const highUsageData = {
    usageData: {
      today: [{ date: '2025-01-14', tokens: 50000, calls: 100, credits: 45.00 }],
      week: [], // simplified for example
      month: [],
    },
    modelUsage: [
      {
        model: 'GPT-4o',
        provider: 'OpenAI',
        calls: 850,
        tokens: 425000,
        credits: 255.00,
        percentage: 50.0,
      },
    ],
    quotaLimits: {
      tokens: 500000,
      calls: 1000,
      credits: 300,
    },
    currentTotals: {
      tokens: 450000, // 90% of limit
      calls: 850,     // 85% of limit
      credits: 270,   // 90% of limit
    },
  };

  return (
    <UsageQuotaDisplay
      usageData={highUsageData.usageData}
      modelUsage={highUsageData.modelUsage}
      quotaLimits={highUsageData.quotaLimits}
      currentTotals={highUsageData.currentTotals}
      warningThresholds={{
        tokens: 0.8,
        calls: 0.8,
        credits: 0.8,
      }}
    />
  );
}

// With reasoning tokens example
export function ReasoningTokensExample() {
  const reasoningData = {
    usageData: {
      today: [
        {
          date: '2025-01-14',
          tokens: 25000,
          calls: 50,
          credits: 18.50,
          reasoning_tokens: 7500, // 30% reasoning
        },
      ],
      week: [], // simplified
      month: [],
    },
    modelUsage: [
      {
        model: 'OpenAI o4-mini',
        provider: 'OpenAI',
        calls: 30,
        tokens: 15000,
        credits: 12.00,
        percentage: 60.0,
      },
      {
        model: 'DeepSeek Reasoner',
        provider: 'DeepSeek',
        calls: 20,
        tokens: 10000,
        credits: 6.50,
        percentage: 40.0,
      },
    ],
    quotaLimits: {
      tokens: 1000000,
      calls: 2000,
      credits: 500,
    },
    currentTotals: {
      tokens: 25000,
      calls: 50,
      credits: 18.50,
      reasoning_tokens: 7500,
    },
  };

  return (
    <UsageQuotaDisplay
      usageData={reasoningData.usageData}
      modelUsage={reasoningData.modelUsage}
      quotaLimits={reasoningData.quotaLimits}
      currentTotals={reasoningData.currentTotals}
    />
  );
}

// Loading state example
export function LoadingStateExample() {
  return (
    <UsageQuotaDisplay
      usageData={{ today: [], week: [], month: [] }}
      modelUsage={[]}
      quotaLimits={{ tokens: 0, calls: 0, credits: 0 }}
      currentTotals={{ tokens: 0, calls: 0, credits: 0 }}
      isLoading={true}
    />
  );
}

// With refresh handler example
export function RefreshHandlerExample() {
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      // Update data here...
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <UsageQuotaDisplay
      usageData={{
        today: [{ date: '2025-01-14', tokens: 25000, calls: 50, credits: 12.50 }],
        week: [],
        month: [],
      }}
      modelUsage={[]}
      quotaLimits={{ tokens: 1000000, calls: 2000, credits: 500 }}
      currentTotals={{ tokens: 25000, calls: 50, credits: 12.50 }}
      isLoading={isRefreshing}
      onRefresh={handleRefresh}
    />
  );
}

// Custom warning thresholds example
export function CustomWarningThresholdsExample() {
  return (
    <UsageQuotaDisplay
      usageData={{
        today: [{ date: '2025-01-14', tokens: 25000, calls: 50, credits: 12.50 }],
        week: [],
        month: [],
      }}
      modelUsage={[]}
      quotaLimits={{ tokens: 100000, calls: 200, credits: 50 }}
      currentTotals={{ tokens: 75000, calls: 150, credits: 37.50 }}
      warningThresholds={{
        tokens: 0.7,  // Warning at 70%
        calls: 0.75,  // Warning at 75%
        credits: 0.6, // Warning at 60%
      }}
    />
  );
}

export default {
  BasicUsageExample,
  HighUsageWarningExample,
  ReasoningTokensExample,
  LoadingStateExample,
  RefreshHandlerExample,
  CustomWarningThresholdsExample,
};