// * Author: gpt-5-codex
// * Date: 2025-10-17 18:40 UTC
// * PURPOSE: Provide a dedicated three-zone layout for the debate stage (timeline, live floor, jury bench).
// * SRP/DRY check: Pass - Only responsible for arranging provided zones.
import type { ReactNode } from 'react';

interface DebateStageLayoutProps {
  stageTimeline: ReactNode;
  liveFloor: ReactNode;
  juryBench: ReactNode;
}

export function DebateStageLayout({ stageTimeline, liveFloor, juryBench }: DebateStageLayoutProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)_320px]">
      <aside className="space-y-4">{stageTimeline}</aside>
      <main className="space-y-4">{liveFloor}</main>
      <aside className="space-y-4">{juryBench}</aside>
    </div>
  );
}
