// * Author: gpt-5-codex
// * Date: 2025-10-17 18:40 UTC
// * PURPOSE: Visualize Robert's Rules debate phases with timers, speaker order, and floor status cues.
// * SRP/DRY check: Pass - Dedicated to rendering the stage timeline without managing external state.
import { useEffect, useMemo, useState } from 'react';
import { Gavel, Users, Timer, CheckCircle2, Circle } from 'lucide-react';
import type { DebatePhase } from '@/hooks/useDebateSession';
import { Badge } from '@/components/ui/badge';

interface SpeakerInfo {
  modelId: string;
  modelName: string;
  role: string;
}

interface PhaseDescriptor {
  id: DebatePhase;
  label: string;
  description: string;
  speakers: SpeakerInfo[];
}

interface DebateStageTimelineProps {
  phases: PhaseDescriptor[];
  currentPhase: DebatePhase;
  phaseTimestamps: Partial<Record<DebatePhase, number>>;
  floorOpen: boolean;
  currentSpeaker?: SpeakerInfo | null;
  rebuttalQueue?: SpeakerInfo[];
}

function formatElapsed(ms?: number | null): string {
  if (!ms || ms < 0) {
    return '00:00';
  }
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

export function DebateStageTimeline({
  phases,
  currentPhase,
  phaseTimestamps,
  floorOpen,
  currentSpeaker,
  rebuttalQueue = [],
}: DebateStageTimelineProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const phaseStatus = useMemo(() => {
    const currentIndex = phases.findIndex(phase => phase.id === currentPhase);
    return phases.map((phase, index) => {
      const startedAt = phaseTimestamps[phase.id];
      const elapsed = startedAt ? now - startedAt : null;
      if (index < currentIndex) {
        return { phase, status: 'complete' as const, elapsed };
      }
      if (index === currentIndex) {
        return { phase, status: 'active' as const, elapsed };
      }
      return { phase, status: 'upcoming' as const, elapsed: null };
    });
  }, [currentPhase, now, phaseTimestamps, phases]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <Gavel className="w-4 h-4" /> Debate Stage Timeline
          </h2>
          <p className="text-xs text-muted-foreground">
            Track procedural phases and speaker order following Robert's Rules.
          </p>
        </div>
        <Badge variant={floorOpen ? 'outline' : 'secondary'} className={floorOpen ? 'border-green-600 text-green-700 dark:text-green-400 dark:border-green-500' : 'bg-amber-500/20 text-amber-600 dark:text-amber-300'}>
          {floorOpen ? 'Floor Open' : 'Floor Closed'}
        </Badge>
      </div>

      <div className="space-y-3">
        {phaseStatus.map(({ phase, status, elapsed }) => (
          <div
            key={phase.id}
            className={`rounded-md border p-3 transition-colors ${
              status === 'active'
                ? 'border-blue-500/60 bg-blue-500/5 dark:bg-blue-500/10'
                : status === 'complete'
                ? 'border-muted bg-muted/40'
                : 'border-dashed'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {status === 'complete' ? (
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                ) : status === 'active' ? (
                  <Gavel className="w-4 h-4 text-blue-500" />
                ) : (
                  <Circle className="w-4 h-4 text-muted-foreground" />
                )}
                <div>
                  <div className="text-sm font-medium">{phase.label}</div>
                  <div className="text-xs text-muted-foreground">{phase.description}</div>
                </div>
              </div>
              {status !== 'upcoming' && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Timer className="w-3 h-3" />
                  {formatElapsed(elapsed)}
                </div>
              )}
            </div>
            <div className="mt-3 text-xs text-muted-foreground flex items-center gap-2">
              <Users className="w-3 h-3" />
              <span className="font-medium text-foreground">Speaker Order:</span>
              <span>
                {phase.speakers
                  .map(speaker => `${speaker.modelName} (${speaker.role})`)
                  .join(' → ')}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Live Floor
        </div>
        <div className="rounded-md border p-3 space-y-2">
          <div className="text-sm font-medium">
            Current Speaker:
            <span className="ml-2 text-foreground">
              {currentSpeaker ? `${currentSpeaker.modelName} (${currentSpeaker.role})` : 'Awaiting turn'}
            </span>
          </div>
          <div className="text-xs text-muted-foreground">
            Rebuttal Queue:
            {rebuttalQueue.length === 0 ? (
              <span className="ml-2">No speakers queued</span>
            ) : (
              <span className="ml-2">
                {rebuttalQueue.map(speaker => `${speaker.modelName} (${speaker.role})`).join(', ')}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
