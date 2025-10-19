/**
 *
 * Author: gpt-5-codex
 * Date: October 17, 2025 at 19:15 UTC
 * PURPOSE: Drawer component that surfaces persisted debate sessions (topic, duration, cost, jury summary) and
 *          lets users reopen a session to hydrate the transcript and scoring state.
 * SRP/DRY check: Pass - Focused on history presentation/selection while relying on hooks for state hydration.
 */

import { History, RefreshCw, Clock, Scale } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Drawer,
  DrawerTrigger,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerClose,
} from '@/components/ui/drawer';
import { formatCost } from '@/lib/formatUtils';
import type { DebateSessionSummary } from '@/hooks/useDebateSession';

interface DebateHistoryDrawerProps {
  sessions: DebateSessionSummary[];
  onRefresh: () => void;
  isRefreshing?: boolean;
  onSelectSession: (session: DebateSessionSummary) => void;
  activeSessionId?: string | null;
}

function formatDuration(durationMs?: number, createdAt?: string, updatedAt?: string): string {
  if (durationMs && durationMs > 0) {
    const minutes = Math.floor(durationMs / 60000);
    const seconds = Math.round((durationMs % 60000) / 1000);
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  }

  if (createdAt && updatedAt) {
    const diff = new Date(updatedAt).getTime() - new Date(createdAt).getTime();
    if (!Number.isNaN(diff) && diff > 0) {
      return formatDuration(diff);
    }
  }

  return '—';
}

function formatTimestamp(timestamp?: string): string {
  if (!timestamp) return '—';
  const value = new Date(timestamp);
  if (Number.isNaN(value.getTime())) {
    return '—';
  }
  return value.toLocaleString();
}

export function DebateHistoryDrawer({
  sessions,
  onRefresh,
  isRefreshing = false,
  onSelectSession,
  activeSessionId,
}: DebateHistoryDrawerProps) {
  const hasSessions = sessions.length > 0;

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-sm">
          <span className="flex items-center space-x-2">
            <History className="w-4 h-4" />
            <span>Recent Debates</span>
            <Badge variant="outline" className="text-[10px]">
              {sessions.length}
            </Badge>
          </span>
          <Drawer>
            <DrawerTrigger asChild>
              <Button variant="outline" size="sm">
                View History
              </Button>
            </DrawerTrigger>
            <DrawerContent className="max-w-3xl mx-auto">
              <DrawerHeader>
                <DrawerTitle>Debate History</DrawerTitle>
                <DrawerDescription>
                  Select a saved debate to reopen its transcript and scoring details.
                </DrawerDescription>
              </DrawerHeader>

              <div className="px-6 pb-6 space-y-3 max-h-[60vh] overflow-y-auto">
                {hasSessions ? (
                  sessions.map(session => {
                    const isActive = session.id === activeSessionId;
                    const duration = formatDuration(session.durationMs, session.createdAt, session.updatedAt);
                    const verdictText = session.jury?.verdict || session.jury?.summary;

                    return (
                      <div
                        key={session.id}
                        className={`rounded-lg border p-4 transition-colors ${
                          isActive ? 'border-primary bg-primary/5' : 'border-muted'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <p className="text-sm font-medium leading-tight">{session.topic}</p>
                            <p className="text-xs text-muted-foreground">
                              Started {formatTimestamp(session.createdAt)}
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            {verdictText && (
                              <Badge variant={isActive ? 'default' : 'outline'} className="text-[10px]">
                                {verdictText}
                              </Badge>
                            )}
                            <Button
                              size="sm"
                              variant={isActive ? 'default' : 'outline'}
                              onClick={() => onSelectSession(session)}
                            >
                              {isActive ? 'Active' : 'Reopen'}
                            </Button>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mt-3 text-xs text-muted-foreground">
                          <div className="flex items-center space-x-2">
                            <Clock className="w-3 h-3" />
                            <span>Duration: {duration}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Scale className="w-3 h-3" />
                            <span>Cost: {formatCost(session.totalCost)}</span>
                          </div>
                          {session.turnCount !== undefined && (
                            <div className="col-span-2">
                              Turns Recorded: {session.turnCount}
                            </div>
                          )}
                          {session.jury?.summary && (
                            <div className="col-span-2 text-muted-foreground italic">
                              Jury: {session.jury.summary}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                    No stored debates yet. Start a session and it will appear here.
                  </div>
                )}
              </div>

              <DrawerFooter className="flex items-center justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onRefresh}
                  disabled={isRefreshing}
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
                <DrawerClose asChild>
                  <Button variant="ghost" size="sm">
                    Close
                  </Button>
                </DrawerClose>
              </DrawerFooter>
            </DrawerContent>
          </Drawer>
        </CardTitle>
      </CardHeader>
      <CardContent className="text-xs text-muted-foreground">
        {hasSessions ? 'Reopen or continue a previous debate.' : 'No debate history yet.'}
      </CardContent>
    </Card>
  );
}
