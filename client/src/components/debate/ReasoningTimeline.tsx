/*
 * Author: GPT-5 Codex
 * Date: 2025-10-17 19:05 UTC
 * PURPOSE: Render synchronized reasoning and content chunk timelines with scrub controls and inflection highlights.
 * SRP/DRY check: Pass - Component visualizes chunk telemetry without managing streaming state or persistence.
 */

import { useMemo, useState, useEffect } from 'react';
import { Slider } from '@/components/ui/slider';
import type { ReasoningStreamChunk, ContentStreamChunk } from '@/hooks/useAdvancedStreaming';
import { computeInflectionThreshold } from '@/lib/chunkAnalytics';

interface TimelinePoint {
  timestamp: number;
  position: number;
  intensity: number;
  delta: string;
  cumulativeText: string;
  isInflection: boolean;
}

interface ReasoningTimelineProps {
  reasoningChunks: ReasoningStreamChunk[];
  contentChunks: ContentStreamChunk[];
  selectedTimestamp?: number;
  onScrub?: (timestamp: number) => void;
}

const toRelativePosition = (timestamp: number, minTimestamp: number, range: number): number => {
  if (range <= 0) {
    return 0;
  }
  return ((timestamp - minTimestamp) / range) * 100;
};

export function ReasoningTimeline({
  reasoningChunks,
  contentChunks,
  selectedTimestamp,
  onScrub,
}: ReasoningTimelineProps) {
  const allTimestamps = useMemo(() => {
    const combined = [...reasoningChunks, ...contentChunks];
    if (!combined.length) {
      return { min: Date.now(), max: Date.now() + 1 };
    }
    const timestamps = combined.map(chunk => chunk.timestamp);
    return {
      min: Math.min(...timestamps),
      max: Math.max(...timestamps)
    };
  }, [reasoningChunks, contentChunks]);

  const timeRange = Math.max(allTimestamps.max - allTimestamps.min, 1);

  const reasoningThreshold = useMemo(
    () => computeInflectionThreshold(reasoningChunks),
    [reasoningChunks]
  );
  const contentThreshold = useMemo(
    () => computeInflectionThreshold(contentChunks),
    [contentChunks]
  );

  const reasoningPoints = useMemo<TimelinePoint[]>(() =>
    reasoningChunks.map(chunk => ({
      timestamp: chunk.timestamp,
      position: toRelativePosition(chunk.timestamp, allTimestamps.min, timeRange),
      intensity: chunk.intensity,
      delta: chunk.delta,
      cumulativeText: chunk.cumulativeText,
      isInflection: chunk.intensity >= reasoningThreshold
    })),
    [reasoningChunks, reasoningThreshold, allTimestamps.min, timeRange]
  );

  const contentPoints = useMemo<TimelinePoint[]>(() =>
    contentChunks.map(chunk => ({
      timestamp: chunk.timestamp,
      position: toRelativePosition(chunk.timestamp, allTimestamps.min, timeRange),
      intensity: chunk.intensity,
      delta: chunk.delta,
      cumulativeText: chunk.cumulativeText,
      isInflection: chunk.intensity >= contentThreshold
    })),
    [contentChunks, contentThreshold, allTimestamps.min, timeRange]
  );

  const [internalTimestamp, setInternalTimestamp] = useState(() => selectedTimestamp ?? allTimestamps.min);

  useEffect(() => {
    if (typeof selectedTimestamp === 'number') {
      setInternalTimestamp(selectedTimestamp);
    }
  }, [selectedTimestamp]);

  const scrubPercentage = toRelativePosition(internalTimestamp, allTimestamps.min, timeRange);

  const handleScrub = (values: number[]) => {
    const [percentage] = values;
    const normalized = allTimestamps.min + (percentage / 100) * timeRange;
    setInternalTimestamp(normalized);
    onScrub?.(normalized);
  };

  const formatRelativeSeconds = (timestamp: number) => {
    const elapsed = (timestamp - allTimestamps.min) / 1000;
    return `${elapsed.toFixed(2)}s`;
  };

  const nearestReasoningChunk = useMemo(() => {
    if (!reasoningChunks.length) {
      return undefined;
    }
    return reasoningChunks.reduce((closest, chunk) => {
      const closestDiff = Math.abs((closest?.timestamp ?? allTimestamps.min) - internalTimestamp);
      const currentDiff = Math.abs(chunk.timestamp - internalTimestamp);
      return currentDiff < closestDiff ? chunk : closest;
    }, reasoningChunks[0]);
  }, [reasoningChunks, internalTimestamp, allTimestamps.min]);

  const nearestContentChunk = useMemo(() => {
    if (!contentChunks.length) {
      return undefined;
    }
    return contentChunks.reduce((closest, chunk) => {
      const closestDiff = Math.abs((closest?.timestamp ?? allTimestamps.min) - internalTimestamp);
      const currentDiff = Math.abs(chunk.timestamp - internalTimestamp);
      return currentDiff < closestDiff ? chunk : closest;
    }, contentChunks[0]);
  }, [contentChunks, internalTimestamp, allTimestamps.min]);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs uppercase tracking-wide text-muted-foreground">
          <span>Reasoning timeline</span>
          <span>Inflections highlighted</span>
        </div>
        <div className="relative h-8 rounded-md bg-slate-100 dark:bg-slate-800/60">
          {reasoningPoints.map(point => (
            <div
              key={`reason-${point.timestamp}-${point.position}`}
              className="absolute bottom-1 flex -translate-x-1/2 flex-col items-center"
              style={{ left: `${point.position}%` }}
            >
              <div
                className={`rounded-full ${
                  point.isInflection
                    ? 'h-6 w-2 bg-amber-500 shadow-[0_0_6px_rgba(251,191,36,0.7)]'
                    : 'h-4 w-1 bg-slate-400 dark:bg-slate-500'
                }`}
                title={`${formatRelativeSeconds(point.timestamp)} · ${point.intensity.toFixed(2)} intensity`}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs uppercase tracking-wide text-muted-foreground">
          <span>Spoken text timeline</span>
          <span>Delivery cadence</span>
        </div>
        <div className="relative h-8 rounded-md bg-slate-100 dark:bg-slate-800/60">
          {contentPoints.map(point => (
            <div
              key={`content-${point.timestamp}-${point.position}`}
              className="absolute top-1 flex -translate-x-1/2 flex-col items-center"
              style={{ left: `${point.position}%` }}
            >
              <div
                className={`rounded-full ${
                  point.isInflection
                    ? 'h-6 w-2 bg-sky-500 shadow-[0_0_6px_rgba(14,165,233,0.6)]'
                    : 'h-4 w-1 bg-slate-400 dark:bg-slate-500'
                }`}
                title={`${formatRelativeSeconds(point.timestamp)} · ${point.intensity.toFixed(2)} intensity`}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <Slider value={[scrubPercentage]} min={0} max={100} step={0.5} onValueChange={handleScrub} />
        <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-xs dark:border-slate-700 dark:bg-slate-800/40">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-700 dark:text-slate-200">Scrubber</span>
            <span className="font-mono text-slate-600 dark:text-slate-300">
              {formatRelativeSeconds(internalTimestamp)}
            </span>
          </div>
          <div className="mt-2 grid gap-2 text-slate-600 dark:text-slate-300">
            {nearestReasoningChunk && (
              <div>
                <span className="font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-300">Reasoning</span>
                <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-slate-700 dark:text-slate-200">
                  {nearestReasoningChunk.delta.trim() || '…'}
                </p>
              </div>
            )}
            {nearestContentChunk && (
              <div>
                <span className="font-semibold uppercase tracking-wide text-sky-600 dark:text-sky-300">Spoken</span>
                <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-slate-700 dark:text-slate-200">
                  {nearestContentChunk.delta.trim() || '…'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
