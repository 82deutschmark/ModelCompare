/*
 * Author: GPT-5 Codex
 * Date: 2025-10-17 and the 16:24 UTC
 * PURPOSE: Normalize OpenAI Responses API streaming events into the small set of chunks our harness
 *          understands (reasoning/text/json/status), ensuring we do not miss annotations or structured
 *          outputs while forwarding errors for consistent handling.
 * SRP/DRY check: Pass - Utility only maps raw SDK events to callback invocations; no transport logic.
 */

export interface ResponsesStreamCallbacks {
  onReasoningDelta?: (text: string) => void;
  onContentDelta?: (text: string) => void;
  onJsonDelta?: (json: unknown) => void;
  onStatus?: (phase: string, data?: Record<string, unknown>) => void;
  onRefusal?: (payload: unknown) => void;
  onError?: (error: Error) => void;
}

function toStringSafe(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  if (value && typeof value === "object" && "text" in value && typeof (value as any).text === "string") {
    return (value as any).text;
  }
  if (value && typeof value === "object" && "content" in value && typeof (value as any).content === "string") {
    return (value as any).content;
  }
  return "";
}

export function handleResponsesStreamEvent(event: unknown, callbacks: ResponsesStreamCallbacks): void {
  if (!event || typeof event !== "object" || !("type" in event)) {
    return;
  }

  const type = (event as any).type as string;
  switch (type) {
    case "response.created": {
      callbacks.onStatus?.("created");
      return;
    }
    case "response.in_progress": {
      callbacks.onStatus?.("in_progress");
      return;
    }
    case "response.completed": {
      callbacks.onStatus?.("completed");
      return;
    }
    case "response.output_text.delta":
    case "response.output_text.part": {
      const delta = toStringSafe((event as any).delta ?? (event as any).part);
      if (delta) {
        callbacks.onContentDelta?.(delta);
      }
      return;
    }
    case "response.content_part.added": {
      const part = (event as any).part;
      const delta = toStringSafe(part);
      if (delta) {
        callbacks.onContentDelta?.(delta);
      }
      return;
    }
    case "response.output_text.done": {
      const text = toStringSafe((event as any).output);
      if (text) {
        callbacks.onContentDelta?.(text);
      }
      return;
    }
    case "response.reasoning_summary_text.delta":
    case "response.reasoning_summary_part.added": {
      const delta = toStringSafe((event as any).delta ?? (event as any).part);
      if (delta) {
        callbacks.onReasoningDelta?.(delta);
      }
      return;
    }
    case "response.output_parsed.delta":
    case "response.output_json.delta": {
      const payload = (event as any).delta ?? (event as any).json ?? (event as any).output;
      if (payload !== undefined) {
        callbacks.onJsonDelta?.(payload);
      }
      return;
    }
    case "response.output_message.delta": {
      const payload = (event as any).delta;
      if (payload && typeof payload === "object" && Array.isArray((payload as any).content)) {
        for (const entry of (payload as any).content) {
          const delta = toStringSafe(entry);
          if (delta) {
            callbacks.onContentDelta?.(delta);
          }
        }
      }
      return;
    }
    case "response.refusal.delta": {
      callbacks.onRefusal?.((event as any).delta);
      return;
    }
    case "response.failed":
    case "response.error":
    case "error": {
      const message =
        typeof (event as any)?.error?.message === "string"
          ? (event as any).error.message
          : "OpenAI streaming failed";
      callbacks.onError?.(new Error(message));
      return;
    }
    case "response.canceled":
    case "response.cancelled": {
      callbacks.onError?.(new Error("OpenAI streaming cancelled"));
      return;
    }
    case "response.truncated": {
      callbacks.onStatus?.("truncated");
      return;
    }
    default: {
      // ignore other events such as logprobs for now
      return;
    }
  }
}
