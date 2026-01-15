/*
 * Author: gpt-5-codex
 * Date: 2025-11-06T04:06:30Z
 * PURPOSE: Present ARC agent artifacts such as markdown briefs and grid outputs.
 * SRP/DRY check: Pass - stateless artifact browser component.
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { LuigiArtifactRecord } from '@shared/luigi-types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface ArcArtifactPanelProps {
  artifacts: LuigiArtifactRecord[];
  className?: string;
}

function renderArtifact(artifact: LuigiArtifactRecord) {
  switch (artifact.type) {
    case 'markdown':
      return (
        <ScrollArea className="h-[300px]">
          <pre className="whitespace-pre-wrap text-sm text-foreground">
            {typeof artifact.data?.markdown === 'string' ? artifact.data.markdown : artifact.description}
          </pre>
        </ScrollArea>
      );
    case 'json':
      return (
        <pre className="h-[300px] overflow-auto rounded bg-muted p-3 text-xs">
          {JSON.stringify(artifact.data, null, 2)}
        </pre>
      );
    default:
      return (
        <div className="text-sm text-muted-foreground">
          {artifact.description ?? 'Download artifacts from the ARC agent to inspect them.'}
        </div>
      );
  }
}

export function ArcArtifactPanel({ artifacts, className }: ArcArtifactPanelProps) {
  if (artifacts.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Agent Artifacts</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Generated outputs will appear here once the ARC agent emits briefs, grids, or tool outputs.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Agent Artifacts</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Tabs defaultValue={artifacts[0]?.artifactId} className="w-full">
          <TabsList className="w-full justify-start overflow-x-auto">
            {artifacts.map((artifact) => (
              <TabsTrigger key={artifact.artifactId} value={artifact.artifactId} className="whitespace-nowrap">
                {artifact.title}
              </TabsTrigger>
            ))}
          </TabsList>
          {artifacts.map((artifact) => (
            <TabsContent key={artifact.artifactId} value={artifact.artifactId} className="border-t border-border/60 p-4">
              <div className="space-y-3">
                <header className="space-y-1">
                  <h3 className="text-base font-semibold text-foreground">{artifact.title}</h3>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Stage: {artifact.stageId} · Type: {artifact.type}
                  </p>
                  {artifact.description && <p className="text-sm text-muted-foreground">{artifact.description}</p>}
                </header>
                <div className={cn('rounded-md border border-border/60 bg-background p-3')}>{renderArtifact(artifact)}</div>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}
