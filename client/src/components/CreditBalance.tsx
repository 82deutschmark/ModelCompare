/**
 * Author: Buffy (Claude 4 Sonnet)
 * Date: 2025-01-15
 * PURPOSE: CreditBalance component displays user's current credit balance with visual indicator.
 * Fetches credits from /api/user/credits endpoint, shows remaining credits, includes 'Buy More Credits' button
 * that opens pricing table, and handles loading/error states.
 * SRP check: Pass - Single responsibility (credit balance display)
 * shadcn/ui: Pass - Uses Card, Badge, Button, Skeleton, Alert components
 */

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  Coins,
  CreditCard,
  AlertTriangle,
  RefreshCw,
  Zap,
  TrendingUp
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CreditBalanceProps {
  onBuyCredits?: () => void;
  showBuyButton?: boolean;
  compact?: boolean;
  className?: string;
}

interface CreditsResponse {
  credits: number;
}

export function CreditBalance({ 
  onBuyCredits, 
  showBuyButton = true, 
  compact = false,
  className 
}: CreditBalanceProps) {
  const [retryCount, setRetryCount] = useState(0);

  const { data, isLoading, error, refetch } = useQuery<CreditsResponse>({
    queryKey: ['user-credits', retryCount],
    queryFn: async () => {
      const response = await fetch('/api/user/credits', {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch credits: ${response.status}`);
      }
      
      return response.json();
    },
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: true,
  });

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    refetch();
  };

  const getStatusColor = (credits: number) => {
    if (credits >= 100) return "text-green-600 dark:text-green-400";
    if (credits >= 25) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  const getStatusBadge = (credits: number) => {
    if (credits >= 100) {
      return (
        <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
          <TrendingUp className="w-3 h-3 mr-1" />
          Healthy
        </Badge>
      );
    }
    if (credits >= 25) {
      return (
        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
          <Zap className="w-3 h-3 mr-1" />
          Low
        </Badge>
      );
    }
    return (
      <Badge variant="destructive">
        <AlertTriangle className="w-3 h-3 mr-1" />
        Critical
      </Badge>
    );
  };

  const formatCredits = (credits: number) => {
    return credits.toLocaleString();
  };

  if (compact) {
    return (
      <div className={cn("flex items-center space-x-2", className)}>
        {isLoading ? (
          <Skeleton className="h-6 w-16" />
        ) : error ? (
          <Badge variant="destructive" className="cursor-pointer" onClick={handleRetry}>
            <AlertTriangle className="w-3 h-3 mr-1" />
            Error
          </Badge>
        ) : (
          <>
            <div className="flex items-center space-x-1">
              <Coins className={cn("w-4 h-4", getStatusColor(data?.credits || 0))} />
              <span className={cn("font-medium text-sm", getStatusColor(data?.credits || 0))}>
                {formatCredits(data?.credits || 0)}
              </span>
            </div>
            {showBuyButton && data && data.credits < 25 && (
              <Button
                variant="outline"
                size="sm"
                onClick={onBuyCredits}
                className="h-6 px-2 text-xs"
              >
                <CreditCard className="w-3 h-3 mr-1" />
                Buy
              </Button>
            )}
          </>
        )}
      </div>
    );
  }

  return (
    <Card className={cn("transition-all duration-200 hover:shadow-md", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Coins className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg font-semibold">Credit Balance</CardTitle>
          </div>
          
          {!isLoading && !error && data && getStatusBadge(data.credits)}
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-9 w-full" />
          </div>
        ) : error ? (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="mt-2">
              <p className="mb-3">
                Failed to load credit balance. Please check your connection.
              </p>
              <Button
                onClick={handleRetry}
                variant="outline"
                size="sm"
                className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
              >
                <RefreshCw className="w-4 h-4 mr-1" />
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-4">
            {/* Credits Display */}
            <div className="text-center">
              <div className={cn("text-3xl font-bold", getStatusColor(data?.credits || 0))}>
                {formatCredits(data?.credits || 0)}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {data?.credits === 1 ? 'credit remaining' : 'credits remaining'}
              </p>
            </div>

            {/* Usage Info */}
            <div className="text-xs text-muted-foreground text-center">
              <p>Each AI model comparison uses 5 credits</p>
            </div>

            {/* Low Credit Warning */}
            {data && data.credits < 25 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <p className="text-sm">
                    {data.credits < 5 
                      ? "You don't have enough credits for a comparison. Buy more to continue."
                      : `You're running low on credits. Only ${Math.floor(data.credits / 5)} comparisons remaining.`
                    }
                  </p>
                </AlertDescription>
              </Alert>
            )}

            {/* Action Buttons */}
            {showBuyButton && (
              <>
                <Separator />
                <Button 
                  onClick={onBuyCredits}
                  className="w-full"
                  variant={data && data.credits < 25 ? "default" : "outline"}
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  Buy More Credits
                </Button>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default CreditBalance;