/*
 * Author: Codex using GPT-5
 * Date: 2025-10-04T10:33:02Z
 * PURPOSE: Luigi mission input form leveraging react-hook-form with Zod validation.
 * SRP/DRY check: Pass - focuses solely on capturing run parameters, emits submit callback.
 * shadcn/ui: Pass - uses shadcn form primitives (Card, Button, Inputs).
 */

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useLuigiWorkspaceStore } from "@/stores/useLuigiWorkspaceStore";

const formSchema = z.object({
  missionName: z.string().min(3, "Name must be at least 3 characters"),
  objective: z.string().min(5, "Objective must be at least 5 characters"),
  constraints: z.string().optional(),
  successCriteria: z.string().optional(),
  stakeholderNotes: z.string().optional(),
});

export type LuigiRunFormValues = z.infer<typeof formSchema>;

interface LuigiRunFormProps {
  className?: string;
  isSubmitting?: boolean;
  onSubmit: (values: LuigiRunFormValues) => void;
}

const INITIAL_VALUES: LuigiRunFormValues = {
  missionName: "",
  objective: "",
  constraints: "",
  successCriteria: "",
  stakeholderNotes: "",
};

export function LuigiRunForm({ className, isSubmitting, onSubmit }: LuigiRunFormProps) {
  const { form, setFormField, resetForm } = useLuigiWorkspaceStore((state) => ({
    form: state.form,
    setFormField: state.setFormField,
    resetForm: state.resetForm,
  }));

  const { register, handleSubmit, reset, formState } = useForm<LuigiRunFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: form ?? INITIAL_VALUES,
  });

  useEffect(() => {
    reset(form ?? INITIAL_VALUES);
  }, [form, reset]);

  const submit = (values: LuigiRunFormValues) => {
    onSubmit(values);
  };

  const registerField = <K extends keyof LuigiRunFormValues>(field: K) =>
    register(field, {
      onChange: (event) => setFormField(field, (event.target as HTMLInputElement | HTMLTextAreaElement).value),
    });

  const handleClear = () => {
    resetForm();
    reset(INITIAL_VALUES);
  };

  return (
    <Card className={cn("space-y-6", className)}>
      <CardHeader>
        <CardTitle>Start Luigi Plan</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(submit)} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="missionName">Mission Name</Label>
            <Input
              id="missionName"
              placeholder="Global expansion readiness"
              {...registerField("missionName")}
            />
            {formState.errors.missionName && (
              <p className="text-sm text-red-500">{formState.errors.missionName.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="objective">Objective</Label>
            <Textarea
              id="objective"
              rows={3}
              placeholder="Build a cross-regional business plan for the Luigi agents to execute."
              {...registerField("objective")}
            />
            {formState.errors.objective && (
              <p className="text-sm text-red-500">{formState.errors.objective.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="constraints">Constraints</Label>
            <Textarea
              id="constraints"
              rows={2}
              placeholder="Budget limited to .5M, launch within Q2."
              {...registerField("constraints")}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="successCriteria">Success Criteria</Label>
            <Textarea
              id="successCriteria"
              rows={2}
              placeholder="Operational readiness score >= 90, stakeholder buy-in across 4 functions."
              {...registerField("successCriteria")}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="stakeholderNotes">Stakeholder Notes</Label>
            <Textarea
              id="stakeholderNotes"
              rows={2}
              placeholder="CEO wants emphasis on PMO structure and governance."
              {...registerField("stakeholderNotes")}
            />
          </div>
          <div className="flex justify-between gap-3">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Launching…" : "Launch Luigi Pipeline"}
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
