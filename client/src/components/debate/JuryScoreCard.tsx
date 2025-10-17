// * Author: gpt-5-codex
// * Date: 2025-10-17 19:26 UTC
// * PURPOSE: Capture jury scoring, quick tags, and verdict notes with review gating for debate progression.
// * SRP/DRY check: Pass - Focused on jury interactions without handling external debate logic.
import { Fragment } from 'react';
import { Plus, Minus, Tag, Check } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import type { JuryAnnotation } from '@/hooks/useDebateSession';

const QUICK_TAGS = ['Strong evidence', 'Logical clarity', 'Emotional appeal', 'Needs citation', 'Rebuttal landed'];

interface JuryScoreCardProps {
  annotations: Record<string, JuryAnnotation>;
  onIncrement: (modelId: string) => void;
  onDecrement: (modelId: string) => void;
  onToggleTag: (modelId: string, tag: string) => void;
  onUpdateNotes: (modelId: string, notes: string) => void;
  onMarkReviewed: (modelId: string, reviewed?: boolean) => void;
}

export function JuryScoreCard({
  annotations,
  onIncrement,
  onDecrement,
  onToggleTag,
  onUpdateNotes,
  onMarkReviewed,
}: JuryScoreCardProps) {
  const entries = Object.values(annotations);

  if (entries.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Jury Bench</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">
            Jury scoring tools appear once debaters are selected.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Jury Bench</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {entries.map(entry => (
          <Fragment key={entry.modelId}>
            <div className="rounded-md border p-3 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold">{entry.modelName}</div>
                  <div className="text-xs text-muted-foreground">
                    {entry.needsReview ? 'Awaiting jury review' : 'Reviewed'}
                  </div>
                </div>
                <Badge variant={entry.needsReview ? 'destructive' : 'outline'}>
                  {entry.points} pts
                </Badge>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => onDecrement(entry.modelId)}
                  aria-label={`Decrease points for ${entry.modelName}`}
                >
                  <Minus className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => onIncrement(entry.modelId)}
                  aria-label={`Increase points for ${entry.modelName}`}
                >
                  <Plus className="w-4 h-4" />
                </Button>
                <Button
                  variant={entry.needsReview ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => onMarkReviewed(entry.modelId, entry.needsReview)}
                >
                  <Check className="w-4 h-4 mr-2" />
                  {entry.needsReview ? 'Mark Reviewed' : 'Mark Pending'}
                </Button>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <Tag className="w-3 h-3" /> Quick Tags
                </div>
                <div className="flex flex-wrap gap-2">
                  {QUICK_TAGS.map(tag => {
                    const active = entry.tags.includes(tag);
                    return (
                      <Button
                        key={tag}
                        size="sm"
                        className="h-8 px-2 text-xs"
                        variant={active ? 'default' : 'outline'}
                        onClick={() => onToggleTag(entry.modelId, tag)}
                      >
                        {tag}
                      </Button>
                    );
                  })}
                </div>
                {entry.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 text-xs text-muted-foreground">
                    {entry.tags.map(tag => (
                      <Badge key={tag} variant="outline">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground" htmlFor={`jury-note-${entry.modelId}`}>
                  Verdict Notes
                </label>
                <Textarea
                  id={`jury-note-${entry.modelId}`}
                  value={entry.notes}
                  placeholder="Add concise verdict notes..."
                  className="text-sm"
                  onChange={event => onUpdateNotes(entry.modelId, event.target.value)}
                  rows={3}
                />
              </div>
            </div>
          </Fragment>
        ))}
      </CardContent>
    </Card>
  );
}
