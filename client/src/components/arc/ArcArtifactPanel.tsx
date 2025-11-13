/*
 * Author: gpt-5-codex
 * Date: 2025-11-06T03:49:34Z
 * PURPOSE: Display ARC artifacts with collapsible detail views for markdown/json datasets.
 * SRP/DRY check: Pass - component only renders artifact data passed via props.
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { ArcArtifactRecord } from '@shared/arc-types';

interface ArcArtifactPanelProps {
  artifacts: ArcArtifactRecord[];
}

export function ArcArtifactPanel({ artifacts }: ArcArtifactPanelProps) {
  if (artifacts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Artifacts</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Artifacts will appear once the ARC agent generates outputs.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Artifacts</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={artifacts[0]?.id} className="space-y-3">
          <TabsList className="w-full justify-start overflow-x-auto">
            {artifacts.map((artifact) => (
              <TabsTrigger key={artifact.id} value={artifact.id} className="truncate">
                {artifact.title}
              </TabsTrigger>
            ))}
          </TabsList>
          {artifacts.map((artifact) => (
            <TabsContent key={artifact.id} value={artifact.id} className="mt-2">
              <div className="space-y-2">
                {artifact.description && <p className="text-sm text-muted-foreground">{artifact.description}</p>}
                <ScrollArea className="max-h-64 rounded-md border border-border/60 bg-muted/20 p-3 text-xs text-muted-foreground">
                  <pre className="whitespace-pre-wrap">
                    {typeof artifact.data === 'string'
                      ? artifact.data
                      : JSON.stringify(artifact.data, null, 2)}
                  </pre>
                </ScrollArea>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}
