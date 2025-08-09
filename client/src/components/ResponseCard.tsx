import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Copy, Clock, AlertTriangle, CheckCircle, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { AIModel, ModelResponse } from "@/types/ai-models";

interface ResponseCardProps {
  model: AIModel;
  response?: ModelResponse;
  onRetry?: () => void;
}

export function ResponseCard({ model, response, onRetry }: ResponseCardProps) {
  const { toast } = useToast();
  const [isCopying, setIsCopying] = useState(false);

  const copyToClipboard = async () => {
    if (!response?.content) return;
    
    setIsCopying(true);
    try {
      await navigator.clipboard.writeText(response.content);
      toast({
        title: "Copied!",
        description: "Response copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      });
    } finally {
      setIsCopying(false);
    }
  };

  const getStatusBadge = () => {
    if (!response) {
      return (
        <Badge variant="secondary" className="bg-gray-100 dark:bg-gray-700">
          <Clock className="w-3 h-3 mr-1" />
          Waiting
        </Badge>
      );
    }

    switch (response.status) {
      case 'loading':
        return (
          <Badge variant="secondary" className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
            <div className="w-3 h-3 mr-1 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            Loading
          </Badge>
        );
      case 'success':
        return (
          <Badge variant="secondary" className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
            <CheckCircle className="w-3 h-3 mr-1" />
            Complete
          </Badge>
        );
      case 'error':
        return (
          <Badge variant="destructive" className="bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Error
          </Badge>
        );
      default:
        return null;
    }
  };

  const formatTime = (ms: number) => {
    return ms > 0 ? `${(ms / 1000).toFixed(1)}s` : '-';
  };

  return (
    <Card className={`h-full ${response?.status === 'error' ? 'border-red-200 dark:border-red-800' : 'border-gray-200 dark:border-gray-700'}`}>
      <CardHeader className={`pb-3 ${response?.status === 'error' ? 'bg-red-50 dark:bg-red-900/20' : 'bg-gray-50 dark:bg-gray-800'}`}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-gray-900 dark:text-white">{model.name}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">{model.provider}</p>
          </div>
          <div className="flex items-center space-x-2">
            {getStatusBadge()}
            {response?.responseTime && response.responseTime > 0 && (
              <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                {formatTime(response.responseTime)}
              </span>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-4">
        {response?.status === 'loading' ? (
          <div className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <div className="mt-4">
              <Skeleton className="h-16 w-full" />
            </div>
            <Skeleton className="h-4 w-2/3" />
          </div>
        ) : response?.status === 'error' ? (
          <div className="text-center py-6">
            <AlertTriangle className="w-10 h-10 text-red-400 dark:text-red-500 mx-auto mb-3" />
            <h4 className="font-medium text-gray-900 dark:text-white mb-2">Request Failed</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              {response.error || "An unknown error occurred"}
            </p>
            {onRetry && (
              <Button onClick={onRetry} variant="outline" size="sm">
                <RotateCcw className="w-4 h-4 mr-2" />
                Retry
              </Button>
            )}
          </div>
        ) : response?.status === 'success' ? (
          <div className="space-y-4">
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <div className="text-gray-900 dark:text-gray-100 leading-relaxed whitespace-pre-wrap text-sm">
                {response.content}
              </div>
            </div>
            <div className="flex items-center justify-end pt-3 border-t border-gray-200 dark:border-gray-700">
              <Button
                variant="ghost"
                size="sm"
                onClick={copyToClipboard}
                disabled={isCopying}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <Copy className="w-4 h-4 mr-1" />
                {isCopying ? 'Copied!' : 'Copy'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <Clock className="w-8 h-8 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
            <p className="text-sm">Waiting for response...</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
