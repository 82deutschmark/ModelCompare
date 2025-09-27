/**
 * Author: Buffy (Claude Assistant)
 * Date: 2025-01-14
 * PURPOSE: UsageQuotaDisplay component that shows API usage statistics and quota information.
 * Displays tokens used, models called, credits consumed over time periods with visual charts.
 * Shows remaining quota and usage warnings when approaching limits using shadcn/ui components.
 * SRP/DRY check: Pass - Single responsibility (usage quota display), reuses shadcn/ui components
 * shadcn/ui: Pass - Uses Card, Progress, Badge, Tabs, and Chart components
 */

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { AlertTriangle, TrendingUp, Activity, DollarSign, Zap, Calendar, Clock, Brain } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UsageData {
  date: string;
  tokens: number;
  calls: number;
  credits: number;
  reasoning_tokens?: number;
}

interface ModelUsage {
  model: string;
  provider: string;
  calls: number;
  tokens: number;
  credits: number;
  percentage: number;
}

interface QuotaLimits {
  tokens: number;
  calls: number;
  credits: number;
}

interface UsageQuotaDisplayProps {
  /** Current usage data for different time periods */
  usageData: {
    today: UsageData[];
    week: UsageData[];
    month: UsageData[];
  };
  /** Model-specific usage breakdown */
  modelUsage: ModelUsage[];
  /** Current quota limits */
  quotaLimits: QuotaLimits;
  /** Current totals for the selected period */
  currentTotals: {
    tokens: number;
    calls: number;
    credits: number;
    reasoning_tokens?: number;
  };
  /** Warning thresholds (0-1) */
  warningThresholds?: {
    tokens: number;
    calls: number;
    credits: number;
  };
  /** Loading state */
  isLoading?: boolean;
  /** Refresh function */
  onRefresh?: () => void;
}

const defaultWarningThresholds = {
  tokens: 0.8,
  calls: 0.8,
  credits: 0.8,
};

const chartConfig = {
  tokens: {
    label: "Tokens",
    color: "hsl(var(--chart-1))",
  },
  calls: {
    label: "API Calls",
    color: "hsl(var(--chart-2))",
  },
  credits: {
    label: "Credits",
    color: "hsl(var(--chart-3))",
  },
  reasoning_tokens: {
    label: "Reasoning Tokens",
    color: "hsl(var(--chart-4))",
  },
};

const providerColors = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

export function UsageQuotaDisplay({
  usageData,
  modelUsage,
  quotaLimits,
  currentTotals,
  warningThresholds = defaultWarningThresholds,
  isLoading = false,
  onRefresh
}: UsageQuotaDisplayProps) {
  const [selectedPeriod, setSelectedPeriod] = React.useState<'today' | 'week' | 'month'>('today');

  // Calculate usage percentages and warning states
  const usagePercentages = useMemo(() => {
    return {
      tokens: (currentTotals.tokens / quotaLimits.tokens) * 100,
      calls: (currentTotals.calls / quotaLimits.calls) * 100,
      credits: (currentTotals.credits / quotaLimits.credits) * 100,
    };
  }, [currentTotals, quotaLimits]);

  const warningStates = useMemo(() => {
    return {
      tokens: usagePercentages.tokens >= warningThresholds.tokens * 100,
      calls: usagePercentages.calls >= warningThresholds.calls * 100,
      credits: usagePercentages.credits >= warningThresholds.credits * 100,
    };
  }, [usagePercentages, warningThresholds]);

  const hasAnyWarning = Object.values(warningStates).some(Boolean);

  // Format numbers for display
  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toLocaleString();
  };

  const formatCredits = (credits: number): string => {
    return `$${credits.toFixed(2)}`;
  };

  // Get current period data
  const currentData = usageData[selectedPeriod];

  // Prepare model usage pie chart data
  const pieChartData = modelUsage.map((usage, index) => ({
    ...usage,
    fill: providerColors[index % providerColors.length],
  }));

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/4"></div>
            <div className="space-y-2">
              <div className="h-4 bg-muted rounded"></div>
              <div className="h-4 bg-muted rounded w-3/4"></div>
            </div>
            <div className="h-32 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Warning Banner */}
      {hasAnyWarning && (
        <Card className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/20">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              <div>
                <h4 className="font-semibold text-orange-800 dark:text-orange-200">Usage Warning</h4>
                <p className="text-sm text-orange-700 dark:text-orange-300">
                  You're approaching your quota limits. Consider upgrading your plan.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Tokens Usage */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Tokens Used</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold">{formatNumber(currentTotals.tokens)}</span>
                <Badge variant={warningStates.tokens ? 'destructive' : 'secondary'}>
                  {usagePercentages.tokens.toFixed(1)}%
                </Badge>
              </div>
              <Progress 
                value={usagePercentages.tokens} 
                className={cn(
                  "w-full",
                  warningStates.tokens && "[&>div]:bg-destructive"
                )}
              />
              <p className="text-xs text-muted-foreground">
                {formatNumber(quotaLimits.tokens - currentTotals.tokens)} remaining
              </p>
              {currentTotals.reasoning_tokens && (
                <div className="flex items-center space-x-1 text-xs text-amber-600 dark:text-amber-400">
                  <Brain className="h-3 w-3" />
                  <span>{formatNumber(currentTotals.reasoning_tokens)} reasoning</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* API Calls Usage */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">API Calls</CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold">{formatNumber(currentTotals.calls)}</span>
                <Badge variant={warningStates.calls ? 'destructive' : 'secondary'}>
                  {usagePercentages.calls.toFixed(1)}%
                </Badge>
              </div>
              <Progress 
                value={usagePercentages.calls} 
                className={cn(
                  "w-full",
                  warningStates.calls && "[&>div]:bg-destructive"
                )}
              />
              <p className="text-xs text-muted-foreground">
                {formatNumber(quotaLimits.calls - currentTotals.calls)} remaining
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Credits Usage */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Credits</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold">{formatCredits(currentTotals.credits)}</span>
                <Badge variant={warningStates.credits ? 'destructive' : 'secondary'}>
                  {usagePercentages.credits.toFixed(1)}%
                </Badge>
              </div>
              <Progress 
                value={usagePercentages.credits} 
                className={cn(
                  "w-full",
                  warningStates.credits && "[&>div]:bg-destructive"
                )}
              />
              <p className="text-xs text-muted-foreground">
                {formatCredits(quotaLimits.credits - currentTotals.credits)} remaining
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Usage Trends */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5" />
                  <span>Usage Trends</span>
                </CardTitle>
                <CardDescription>Track your API usage over time</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs value={selectedPeriod} onValueChange={(value) => setSelectedPeriod(value as any)}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="today" className="flex items-center space-x-1">
                  <Clock className="h-3 w-3" />
                  <span>Today</span>
                </TabsTrigger>
                <TabsTrigger value="week" className="flex items-center space-x-1">
                  <Calendar className="h-3 w-3" />
                  <span>This Week</span>
                </TabsTrigger>
                <TabsTrigger value="month" className="flex items-center space-x-1">
                  <Calendar className="h-3 w-3" />
                  <span>This Month</span>
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value={selectedPeriod} className="mt-4">
                <ChartContainer config={chartConfig} className="h-64">
                  <AreaChart data={currentData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Area 
                      type="monotone" 
                      dataKey="tokens" 
                      stackId="1" 
                      stroke={chartConfig.tokens.color} 
                      fill={chartConfig.tokens.color} 
                      fillOpacity={0.6}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="calls" 
                      stackId="2" 
                      stroke={chartConfig.calls.color} 
                      fill={chartConfig.calls.color} 
                      fillOpacity={0.6}
                    />
                    {currentData.some(d => d.reasoning_tokens) && (
                      <Area 
                        type="monotone" 
                        dataKey="reasoning_tokens" 
                        stackId="1" 
                        stroke={chartConfig.reasoning_tokens.color} 
                        fill={chartConfig.reasoning_tokens.color} 
                        fillOpacity={0.4}
                      />
                    )}
                  </AreaChart>
                </ChartContainer>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Model Usage Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Brain className="h-5 w-5" />
              <span>Model Usage</span>
            </CardTitle>
            <CardDescription>Breakdown by AI model</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Pie Chart */}
              <ChartContainer config={chartConfig} className="h-48">
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="percentage"
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ChartContainer>

              {/* Model List */}
              <div className="space-y-2">
                {modelUsage.slice(0, 5).map((usage, index) => (
                  <div key={usage.model} className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: providerColors[index % providerColors.length] }}
                      />
                      <span className="font-medium">{usage.model}</span>
                      <Badge variant="outline" className="text-xs px-1">{usage.provider}</Badge>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{usage.percentage.toFixed(1)}%</div>
                      <div className="text-xs text-muted-foreground">
                        {formatNumber(usage.tokens)} tokens
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Credits Over Time */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <DollarSign className="h-5 w-5" />
            <span>Credit Usage Over Time</span>
          </CardTitle>
          <CardDescription>Monitor your spending patterns</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-64">
            <LineChart data={currentData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line 
                type="monotone" 
                dataKey="credits" 
                stroke={chartConfig.credits.color} 
                strokeWidth={2}
                dot={{ r: 4 }}
              />
            </LineChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}

export default UsageQuotaDisplay;