/*
 * Author: gpt-5-codex
 * Date: 2025-11-06T04:05:00Z
 * PURPOSE: ARC agent workspace intake form capturing task context and validating ARC grid JSON before launching runs.
 * SRP/DRY check: Pass - handles only form presentation and payload normalization, delegating persistence to store/hooks.
 */

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useLuigiWorkspaceStore } from '@/stores/useLuigiWorkspaceStore';
import type { ArcExample, CreateLuigiRunRequest } from '@shared/luigi-types';

const gridSchema = z
  .array(z.array(z.number().int().min(0).max(9)).min(1))
  .min(1, 'ARC grids must contain at least one row.');

const exampleSchema: z.ZodType<ArcExample> = z.object({
  input: gridSchema,
  output: gridSchema.optional(),
});

const trainingExamplesSchema = z
  .string()
  .min(5, 'Provide at least one training pair.')
  .transform((value, ctx) => {
    try {
      const parsed = JSON.parse(value) as unknown;
      const examples = z.array(exampleSchema).min(1).parse(parsed);
      return examples;
    } catch (error) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'Training pairs must be valid JSON: an array of { "input": number[][], "output": number[][] } records with digits 0-9.',
      });
      return z.NEVER;
    }
  });

const evaluationExampleSchema = z
  .string()
  .optional()
  .transform((value, ctx) => {
    if (!value) return undefined;
    try {
      const parsed = JSON.parse(value) as unknown;
      return exampleSchema.parse(parsed);
    } catch (error) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'Evaluation grid must be valid JSON describing a single { "input": number[][], "output"?: number[][] } object.',
      });
      return z.NEVER;
    }
  });

const formSchema = z.object({
  taskId: z.string().min(3, 'Task ID must be at least 3 characters.'),
  analysisBrief: z
    .string()
    .min(10, 'Describe the analysis goal so the ARC agent understands the mission.'),
  trainingPairs: trainingExamplesSchema,
  evaluationInput: evaluationExampleSchema,
  workspaceNotes: z.string().optional(),
});

type FormValues = z.input<typeof formSchema>;

export interface ArcAgentRunFormProps {
  className?: string;
  isSubmitting?: boolean;
  onSubmit: (payload: CreateLuigiRunRequest) => void;
}

export function ArcAgentRunForm({ className, isSubmitting, onSubmit }: ArcAgentRunFormProps) {
  const formStateSnapshot = useLuigiWorkspaceStore((state) => state.form);
  const setFormField = useLuigiWorkspaceStore((state) => state.setFormField);
  const resetForm = useLuigiWorkspaceStore((state) => state.resetForm);

  const [submitError, setSubmitError] = useState<string | undefined>();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: formStateSnapshot,
  });

  useEffect(() => {
    reset(formStateSnapshot);
  }, [formStateSnapshot, reset]);

  const registerField = <K extends keyof FormValues>(field: K) =>
    register(field, {
      onChange: (event) => {
        const value = (event.target as HTMLInputElement | HTMLTextAreaElement).value;
        setFormField(field, value);
      },
    });

  const submit = (values: FormValues) => {
    setSubmitError(undefined);
    const parsed = formSchema.safeParse(values);
    if (!parsed.success) {
      setSubmitError('Fix validation errors before launching the ARC agent.');
      return;
    }

    onSubmit({
      taskId: parsed.data.taskId.trim(),
      analysisBrief: parsed.data.analysisBrief.trim(),
      trainingExamples: parsed.data.trainingPairs,
      evaluationExample: parsed.data.evaluationInput,
      workspaceNotes: parsed.data.workspaceNotes?.trim() || undefined,
    });
  };

  const handleClear = () => {
    resetForm();
    reset({
      taskId: '',
      analysisBrief: '',
      trainingPairs: '',
      evaluationInput: '',
      workspaceNotes: '',
    });
    setSubmitError(undefined);
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Launch ARC Agent</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(submit)} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="taskId">ARC Task ID</Label>
            <Input
              id="taskId"
              placeholder="e.g. 0e0a153c"
              autoComplete="off"
              {...registerField('taskId')}
            />
            {errors.taskId && <p className="text-sm text-red-500">{errors.taskId.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="analysisBrief">Mission Brief</Label>
            <Textarea
              id="analysisBrief"
              rows={3}
              placeholder="Summarize the transformation you want the ARC agent to uncover and how to evaluate success."
              {...registerField('analysisBrief')}
            />
            {errors.analysisBrief && (
              <p className="text-sm text-red-500">{errors.analysisBrief.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="trainingPairs">Training Pairs JSON</Label>
            <Textarea
              id="trainingPairs"
              rows={6}
              placeholder='[
  { "input": [[0,1],[1,0]], "output": [[1,0],[0,1]] }
]'
              {...registerField('trainingPairs')}
            />
            {errors.trainingPairs && (
              <p className="text-sm text-red-500">{errors.trainingPairs.message as string}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="evaluationInput">Evaluation Grid JSON (optional)</Label>
            <Textarea
              id="evaluationInput"
              rows={4}
              placeholder='{ "input": [[0,2,0],[2,0,2],[0,2,0]] }'
              {...registerField('evaluationInput')}
            />
            {errors.evaluationInput && (
              <p className="text-sm text-red-500">{errors.evaluationInput.message as string}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="workspaceNotes">Workspace Notes</Label>
            <Textarea
              id="workspaceNotes"
              rows={2}
              placeholder="Additional hypotheses, tool usage expectations, or dataset references."
              {...registerField('workspaceNotes')}
            />
          </div>

          {submitError && <p className="text-sm text-red-500">{submitError}</p>}

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
