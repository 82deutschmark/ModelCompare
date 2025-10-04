/*
 * Author: Codex using GPT-5
 * Date: 2025-10-04T10:19:54Z
 * PURPOSE: Artifact panel grouping Luigi outputs by stage with tabbed navigation.
 * SRP/DRY check: Pass - renders artifacts passed in without fetching or mutating state.
 * shadcn/ui: Pass - uses shadcn Tabs, Card, ScrollArea components.
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { LuigiArtifactRecord } from '@shared/luigi-types';

interface LuigiArtifactPanelProps {
  artifacts: LuigiArtifactRecord[];
  className?: string;
}

function groupArtifacts(artifacts: LuigiArtifactRecord[]): Map<string, LuigiArtifactRecord[]> {
  const map = new Map<string, LuigiArtifactRecord[]>();
  artifacts.forEach((artifact) => {
    const existing = map.get(artifact.stageId) ?? [];
    existing.push(artifact);
    map.set(artifact.stageId, existing);
  });
  return map;
}

export function LuigiArtifactPanel({ artifacts, className }: LuigiArtifactPanelProps) {
  const grouped = groupArtifacts(artifacts);
  const stages = Array.from(grouped.keys());
  const defaultStage = stages[0];

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Artifacts</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {artifacts.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground">Artifacts will appear here as Luigi progresses.</div>
        ) : (
          <Tabs defaultValue={defaultStage} className="w-full">
            <ScrollArea className="w-full">
              <TabsList className="flex w-full flex-wrap justify-start gap-2 overflow-x-auto p-4">
                {stages.map((stageId) => (
                  <TabsTrigger key={stageId} value={stageId} className="text-xs">
                    {stageId}
                  </TabsTrigger>
                ))}
              </TabsList>
            </ScrollArea>
            {stages.map((stageId) => (
              <TabsContent key={stageId} value={stageId} className="p-4">
                <div className="space-y-4">
                  {grouped.get(stageId)!.map((artifact) => (
                    <div key={artifact.artifactId} className="space-y-2 rounded-md border border-border/60 p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-sm font-semibold text-foreground">{artifact.title}</h4>
                          {artifact.description && (
                            <p className="text-xs text-muted-foreground">{artifact.description}</p>
                          )}
                        </div>
                        <span className="text-xs uppercase text-muted-foreground">{artifact.type}</span>
                      </div>
                      {artifact.data && (
                        <pre className="max-h-64 overflow-auto rounded bg-muted p-3 text-xs text-muted-foreground">
{JSON.stringify(artifact.data, null, 2)}
                        </pre>
                      )}
                      {artifact.storagePath && (
                        <p className="text-xs text-muted-foreground">Stored at: {artifact.storagePath}</p>
                      )}
                    </div>
                  ))}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}

