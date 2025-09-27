/**
 * Author: Buffy (Claude Assistant)
 * Date: 2025-01-14
 * PURPOSE: Demo page for the UsageQuotaDisplay component with sample data.
 * Shows how to integrate the component with various usage scenarios.
 * SRP/DRY check: Pass - Single responsibility (demo page), reuses existing components
 * shadcn/ui: Pass - Uses AppNavigation and other shadcn/ui components
 */

import React, { useState, useEffect } from 'react';
import { AppNavigation } from '@/components/AppNavigation';
import { UsageQuotaDisplay } from '@/components/UsageQuotaDisplay';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RefreshCw, Settings } from 'lucide-react';

// Sample data generators
const generateUsageData = (days: number) => {
  const data = [];
  const today = new Date();
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    
    const baseTokens = Math.floor(Math.random() * 50000) + 10000;
    const baseCalls = Math.floor(Math.random() * 100) + 20;
    const baseCredits = Math.random() * 50 + 5;
    
    data.push({
      date: date.toISOString().split('T')[0],
      tokens: baseTokens,
      calls: baseCalls,
      credits: baseCredits,
      reasoning_tokens: Math.floor(baseTokens * 0.3), // 30% reasoning tokens
    });
  }
  
  return data;
};

const sampleModelUsage = [
  {
    model: 'GPT-4o',
    provider: 'OpenAI',
    calls: 150,
    tokens: 75000,
    credits: 45.50,
    percentage: 35.2,
  },
  {
    model: 'Claude Sonnet 4',
    provider: 'Anthropic',
    calls: 120,
    tokens: 60000,
    credits: 38.20,
    percentage: 28.1,
  },
  {
    model: 'Gemini 2.5 Pro',
    provider: 'Google',
    calls: 80,
    tokens: 40000,
    credits: 22.15,
    percentage: 18.7,
  },
  {
    model: 'DeepSeek Reasoner',
    provider: 'DeepSeek',
    calls: 45,
    tokens: 25000,
    credits: 12.80,
    percentage: 10.5,
  },
  {
    model: 'Grok 4',
    provider: 'xAI',
    calls: 25,
    tokens: 15000,
    credits: 8.90,
    percentage: 7.5,
  },
];

const sampleQuotaLimits = {
  tokens: 1000000, // 1M tokens
  calls: 2000,     // 2K calls
  credits: 500,    // $500
};

export default function UsageQuotaDemo() {
  const [isLoading, setIsLoading] = useState(false);
  const [usageData, setUsageData] = useState({
    today: generateUsageData(1),
    week: generateUsageData(7),
    month: generateUsageData(30),
  });
  
  const [currentTotals, setCurrentTotals] = useState({
    tokens: 750000,
    calls: 1650,
    credits: 425.75,
    reasoning_tokens: 225000,
  });

  const handleRefresh = async () => {
    setIsLoading(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Generate new sample data
    setUsageData({
      today: generateUsageData(1),
      week: generateUsageData(7),
      month: generateUsageData(30),
    });
    
    // Update totals with some randomization
    setCurrentTotals(prev => ({
      tokens: Math.floor(prev.tokens + (Math.random() - 0.5) * 50000),
      calls: Math.floor(prev.calls + (Math.random() - 0.5) * 100),
      credits: prev.credits + (Math.random() - 0.5) * 20,
      reasoning_tokens: Math.floor((prev.tokens * 0.3) + (Math.random() - 0.5) * 15000),
    }));
    
    setIsLoading(false);
  };

  const simulateHighUsage = () => {
    setCurrentTotals({
      tokens: 950000,   // 95% of limit
      calls: 1900,      // 95% of limit  
      credits: 475,     // 95% of limit
      reasoning_tokens: 285000,
    });
  };

  const simulateNormalUsage = () => {
    setCurrentTotals({
      tokens: 450000,   // 45% of limit
      calls: 800,       // 40% of limit
      credits: 225,     // 45% of limit
      reasoning_tokens: 135000,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <AppNavigation />
      
      <main className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Usage & Quota Dashboard</h1>
              <p className="text-muted-foreground">
                Monitor your API usage, track spending, and manage quotas across all AI models.
              </p>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                onClick={simulateNormalUsage}
                className="hidden md:flex"
              >
                Normal Usage
              </Button>
              <Button
                variant="outline"
                onClick={simulateHighUsage}
                className="hidden md:flex"
              >
                High Usage
              </Button>
              <Button
                onClick={handleRefresh}
                disabled={isLoading}
                className="flex items-center space-x-2"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </Button>
              <Button variant="outline" className="flex items-center space-x-2">
                <Settings className="h-4 w-4" />
                <span>Settings</span>
              </Button>
            </div>
          </div>

          {/* Demo Controls (Mobile) */}
          <div className="flex space-x-2 md:hidden">
            <Button
              variant="outline"
              size="sm"
              onClick={simulateNormalUsage}
              className="flex-1"
            >
              Normal Usage
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={simulateHighUsage}
              className="flex-1"
            >
              High Usage
            </Button>
          </div>

          {/* Info Card */}
          <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-blue-800 dark:text-blue-200 text-lg">Demo Information</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-blue-700 dark:text-blue-300 text-sm">
                This is a demonstration of the UsageQuotaDisplay component with sample data. 
                Use the buttons above to simulate different usage scenarios and see how the component 
                responds to various quota levels and warning states.
              </p>
            </CardContent>
          </Card>

          {/* Usage Quota Display Component */}
          <UsageQuotaDisplay
            usageData={usageData}
            modelUsage={sampleModelUsage}
            quotaLimits={sampleQuotaLimits}
            currentTotals={currentTotals}
            warningThresholds={{
              tokens: 0.85,
              calls: 0.85,
              credits: 0.85,
            }}
            isLoading={isLoading}
            onRefresh={handleRefresh}
          />
        </div>
      </main>
    </div>
  );
}