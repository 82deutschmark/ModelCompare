/*
 * Author: gpt-5-codex
 * Date: 2025-11-06T03:49:34Z
 * PURPOSE: ARC agent run form collecting puzzle metadata and payload details with
 *          inline validation and hydration from the workspace store.
 * SRP/DRY check: Pass - handles only input capture and delegates submission logic via props.
 */

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useArcWorkspaceStore } from '@/stores/useArcWorkspaceStore';

const formSchema = z.object({
  taskId: z.string().min(3, 'Task ID must be at least 3 characters'),
  challengeName: z.string().min(3, 'Challenge name must be at least 3 characters'),
  puzzleDescription: z.string().min(10, 'Description must be at least 10 characters'),
  puzzlePayload: z
    .string()
    .min(2, 'Puzzle payload is required')
    .refine((value) => {
      try {
        JSON.parse(value);
        return true;
      } catch (error) {
        return false;
      }
    }, 'Puzzle payload must be valid JSON'),
  targetPatternSummary: z.string().optional(),
  evaluationFocus: z.string().optional(),
});

export type ArcRunFormValues = z.infer<typeof formSchema>;

interface ArcRunFormProps {
  className?: string;
  isSubmitting?: boolean;
  onSubmit: (values: ArcRunFormValues) => void;
}

const INITIAL_VALUES: ArcRunFormValues = {
  taskId: '',
  challengeName: '',
  puzzleDescription: '',
  puzzlePayload: '',
  targetPatternSummary: '',
  evaluationFocus: '',
};

export function ArcRunForm({ className, isSubmitting, onSubmit }: ArcRunFormProps) {
  const form = useArcWorkspaceStore((state) => state.form);
  const setFormField = useArcWorkspaceStore((state) => state.setFormField);
  const resetForm = useArcWorkspaceStore((state) => state.resetForm);

  const { register, handleSubmit, reset, formState } = useForm<ArcRunFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: form ?? INITIAL_VALUES,
  });

  useEffect(() => {
    reset(form ?? INITIAL_VALUES);
  }, [form, reset]);

  const submit = (values: ArcRunFormValues) => {
    onSubmit(values);
  };

  const registerField = <K extends keyof ArcRunFormValues>(field: K) =>
    register(field, {
      onChange: (event) => setFormField(field, (event.target as HTMLInputElement | HTMLTextAreaElement).value),
    });

  const handleClear = () => {
    resetForm();
    reset(INITIAL_VALUES);
  };

  return (
    <Card className={cn('space-y-6', className)}>
      <CardHeader>
        <CardTitle>Configure ARC Mission</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(submit)} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="taskId">ARC Task ID</Label>
            <Input id="taskId" placeholder="0a1abc" {...registerField('taskId')} />
            {formState.errors.taskId && <p className="text-sm text-red-500">{formState.errors.taskId.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="challengeName">Challenge Name</Label>
            <Input id="challengeName" placeholder="Diagonal symmetry discovery" {...registerField('challengeName')} />
            {formState.errors.challengeName && (
              <p className="text-sm text-red-500">{formState.errors.challengeName.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="puzzleDescription">Puzzle Description</Label>
            <Textarea
              id="puzzleDescription"
              rows={3}
              placeholder="Describe the observed transformation between input and output grids."
              {...registerField('puzzleDescription')}
            />
            {formState.errors.puzzleDescription && (
              <p className="text-sm text-red-500">{formState.errors.puzzleDescription.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="puzzlePayload">Puzzle Payload (JSON)</Label>
            <Textarea
              id="puzzlePayload"
              rows={6}
              placeholder='{"train": [...], "test": [...]}'
              {...registerField('puzzlePayload')}
            />
            {formState.errors.puzzlePayload && (
              <p className="text-sm text-red-500">{formState.errors.puzzlePayload.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="targetPatternSummary">Target Pattern Summary</Label>
            <Textarea
              id="targetPatternSummary"
              rows={2}
              placeholder="Highlight the target transformation or evaluation criteria."
              {...registerField('targetPatternSummary')}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="evaluationFocus">Evaluation Focus</Label>
            <Textarea
              id="evaluationFocus"
              rows={2}
              placeholder="Optional hints about what qualifies as a correct solution."
              {...registerField('evaluationFocus')}
            />
          </div>
          <div className="flex justify-between gap-3">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Launching…' : 'Launch ARC Agent'}
            </Button>
            <Button type="button" variant="ghost" onClick={handleClear}>
              Clear
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
