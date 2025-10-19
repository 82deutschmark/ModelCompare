import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Play,
  Pause,
  Square,
  RotateCcw,
  Loader2,
  CheckCircle,
  AlertCircle,
  Zap,
  Clock,
  DollarSign
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface StreamingControlsProps {
  isStreaming: boolean;
  progress: number;
  error: string | null;
  estimatedCost: number;
  responseTime?: number;
  canPause?: boolean;
  canResume?: boolean;
  canCancel?: boolean;
  canRestart?: boolean;

  onPlay?: () => void;
  onPause?: () => void;
  onResume?: () => void;
  onCancel?: () => void;
  onRestart?: () => void;

  className?: string;
}

export const StreamingControls: React.FC<StreamingControlsProps> = ({
  isStreaming,
  progress,
  error,
  estimatedCost,
  responseTime,
  canPause = true,
  canResume = true,
  canCancel = true,
  canRestart = true,
  onPlay,
  onPause,
  onResume,
  onCancel,
  onRestart,
  className
}) => {
  const getStatusBadge = () => {
    if (error) {
      return (
        <Badge variant="destructive" className="flex items-center space-x-1">
          <AlertCircle className="w-3 h-3" />
          <span>Error</span>
        </Badge>
      );
    }

    if (isStreaming) {
      return (
        <Badge variant="secondary" className="flex items-center space-x-1 animate-pulse">
          <Loader2 className="w-3 h-3 animate-spin" />
          <span>Streaming</span>
        </Badge>
      );
    }

    if (progress >= 100) {
      return (
        <Badge variant="default" className="flex items-center space-x-1 bg-green-500">
          <CheckCircle className="w-3 h-3" />
          <span>Complete</span>
        </Badge>
      );
    }

    return (
      <Badge variant="outline" className="flex items-center space-x-1">
        <Clock className="w-3 h-3" />
        <span>Ready</span>
      </Badge>
    );
  };

  return (
    <Card className={cn("", className)}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          {/* Status and Progress */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              {getStatusBadge()}
              {isStreaming && progress > 0 && (
                <span className="text-sm text-muted-foreground">
                  {Math.round(progress)}%
                </span>
              )}
            </div>

            {isStreaming && (
              <Progress value={progress} className="w-32 h-2" />
            )}
          </div>

          {/* Metrics */}
          <div className="flex items-center space-x-4 text-sm">
            {estimatedCost > 0 && (
              <div className="flex items-center space-x-1 text-muted-foreground">
                <DollarSign className="w-3 h-3" />
                <span>~{estimatedCost.toFixed(4)}</span>
              </div>
            )}

            {responseTime && responseTime > 0 && (
              <div className="flex items-center space-x-1 text-muted-foreground">
                <Clock className="w-3 h-3" />
                <span>{responseTime}ms</span>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="flex items-center space-x-2">
            {!isStreaming && !error && progress < 100 && onPlay && (
              <Button
                onClick={onPlay}
                size="sm"
                className="bg-green-600 hover:bg-green-700"
              >
                <Play className="w-4 h-4 mr-1" />
                Start
              </Button>
            )}

            {isStreaming && canPause && onPause && (
              <Button
                onClick={onPause}
                size="sm"
                variant="outline"
              >
                <Pause className="w-4 h-4 mr-1" />
                Pause
              </Button>
            )}

            {!isStreaming && progress > 0 && progress < 100 && canResume && onResume && (
              <Button
                onClick={onResume}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Play className="w-4 h-4 mr-1" />
                Resume
              </Button>
            )}

            {canCancel && onCancel && (
              <Button
                onClick={onCancel}
                size="sm"
                variant="destructive"
              >
                <Square className="w-4 h-4 mr-1" />
                Cancel
              </Button>
            )}

            {canRestart && onRestart && (
              <Button
                onClick={onRestart}
                size="sm"
                variant="outline"
              >
                <RotateCcw className="w-4 h-4 mr-1" />
                Restart
              </Button>
            )}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-center space-x-2 text-red-600 dark:text-red-400">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">{error}</span>
            </div>
          </div>
        )}

        {/* Progress Details */}
        {isStreaming && progress > 0 && (
          <div className="mt-3 text-xs text-muted-foreground">
            <div className="flex justify-between">
              <span>Progress:</span>
              <span>{Math.round(progress)}% complete</span>
            </div>
            {estimatedCost > 0 && (
              <div className="flex justify-between mt-1">
                <span>Estimated Cost:</span>
                <span>{estimatedCost.toFixed(6)} credits</span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
