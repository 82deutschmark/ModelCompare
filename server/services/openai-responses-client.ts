/*
 * Author: gpt-5-codex
 * Date: 2025-11-06T19:25:00Z
 * PURPOSE: Provide a production-ready wrapper around the OpenAI Responses API so
 *          agent executors (ARC, Luigi, etc.) can request structured JSON output
 *          without reimplementing HTTP plumbing or response parsing.
 * SRP/DRY check: Pass - encapsulates OpenAI Responses API transport and parsing
 *                logic reused across agent executors.
 */

import { z } from 'zod';

const DEFAULT_BASE_URL = 'https://api.openai.com/v1';
const RESPONSES_PATH = '/responses';

export interface OpenAiResponsesClientOptions {
  readonly apiKey: string;
  readonly baseUrl?: string;
  readonly organization?: string;
  readonly project?: string;
  readonly fetchFn?: typeof fetch;
}

export interface JsonSchemaDefinition {
  readonly name: string;
  readonly schema: Record<string, unknown>;
}

export interface JsonResponseRequest<TSchema extends z.ZodTypeAny> {
  readonly model: string;
  readonly prompt: string;
  readonly schema: TSchema;
  readonly schemaDefinition: JsonSchemaDefinition;
  readonly temperature?: number;
  readonly maxOutputTokens?: number;
  readonly metadata?: Record<string, unknown>;
}

export interface JsonResponseUsageSummary {
  readonly inputTokens?: number;
  readonly outputTokens?: number;
  readonly totalTokens?: number;
  readonly costCents?: number;
}

export interface JsonResponseResult<T> {
  readonly parsed: T;
  readonly rawText: string;
  readonly usage: JsonResponseUsageSummary;
}

type ResponsePayload = Record<string, any>;

type FetchJsonFn = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export class OpenAiResponsesClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly organization?: string;
  private readonly project?: string;
  private readonly fetchFn: FetchJsonFn;

  constructor(options: OpenAiResponsesClientOptions) {
    if (!options.apiKey) {
      throw new Error('OpenAI API key is required to initialise the Responses client.');
    }

    this.apiKey = options.apiKey;
    this.baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
    this.organization = options.organization;
    this.project = options.project;
    this.fetchFn = options.fetchFn ?? fetch;
  }

  async createJsonResponse<TSchema extends z.ZodTypeAny>(
    request: JsonResponseRequest<TSchema>,
  ): Promise<JsonResponseResult<z.infer<TSchema>>> {
    const url = new URL(RESPONSES_PATH, this.baseUrl);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.apiKey}`,
    };

    if (this.organization) {
      headers['OpenAI-Organization'] = this.organization;
    }
    if (this.project) {
      headers['OpenAI-Project'] = this.project;
    }

    const body: Record<string, unknown> = {
      model: request.model,
      input: request.prompt,
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: request.schemaDefinition.name,
          schema: request.schemaDefinition.schema,
        },
      },
      max_output_tokens: request.maxOutputTokens ?? 4096,
      temperature: request.temperature ?? 0.2,
    };

    if (request.metadata && Object.keys(request.metadata).length > 0) {
      body.metadata = request.metadata;
    }

    const response = await this.fetchFn(url.toString(), {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorPayload = await safeReadError(response);
      throw new Error(`OpenAI Responses API request failed (${response.status}): ${errorPayload}`);
    }

    const payload = (await response.json()) as ResponsePayload;
    const rawText = extractOutputText(payload);
    const cleaned = stripMarkdownFence(rawText);
    const parsedJson = parseJson(cleaned);
    const result = request.schema.safeParse(parsedJson);

    if (!result.success) {
      throw new Error(`OpenAI response did not match expected schema: ${result.error.message}\nRaw: ${cleaned}`);
    }

    return {
      parsed: result.data,
      rawText: cleaned,
      usage: extractUsage(payload),
    };
  }
}

let cachedClient: OpenAiResponsesClient | null = null;

export function getOpenAiResponsesClient(): OpenAiResponsesClient {
  if (!cachedClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required to run agent SDK flows.');
    }
    cachedClient = new OpenAiResponsesClient({ apiKey });
  }
  return cachedClient;
}

export function setOpenAiResponsesClient(client: OpenAiResponsesClient | null): void {
  cachedClient = client;
}

async function safeReadError(response: Response): Promise<string> {
  try {
    const text = await response.text();
    if (!text) {
      return 'No response body available.';
    }
    try {
      const json = JSON.parse(text) as Record<string, any>;
      const message = json?.error?.message ?? json?.message;
      return message ? `${message}` : text;
    } catch {
      return text;
    }
  } catch (error) {
    return `Unable to read error payload: ${error instanceof Error ? error.message : String(error)}`;
  }
}

function extractOutputText(payload: ResponsePayload): string {
  if (typeof payload?.output_text === 'string' && payload.output_text.trim()) {
    return payload.output_text;
  }

  const outputs = payload?.output ?? payload?.response?.output;
  if (Array.isArray(outputs)) {
    for (const entry of outputs) {
      const text = extractTextFromEntry(entry);
      if (text) {
        return text;
      }
    }
  }

  const messages = payload?.messages ?? payload?.response?.messages;
  if (Array.isArray(messages)) {
    for (const message of messages) {
      const text = extractTextFromEntry(message);
      if (text) {
        return text;
      }
    }
  }

  return typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2);
}

function extractTextFromEntry(entry: any): string | undefined {
  if (!entry) {
    return undefined;
  }
  if (typeof entry === 'string') {
    return entry;
  }
  if (typeof entry.text === 'string' && entry.text.trim()) {
    return entry.text;
  }
  if (Array.isArray(entry.content)) {
    for (const content of entry.content) {
      if (typeof content.text === 'string' && content.text.trim()) {
        return content.text;
      }
      if (content.type === 'output_text' && typeof content.output_text === 'string' && content.output_text.trim()) {
        return content.output_text;
      }
    }
  }
  if (typeof entry.output_text === 'string' && entry.output_text.trim()) {
    return entry.output_text;
  }
  if (typeof entry.message === 'string' && entry.message.trim()) {
    return entry.message;
  }
  return undefined;
}

function stripMarkdownFence(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith('```')) {
    const parts = trimmed.replace(/^```json?/i, '').replace(/```$/i, '');
    return parts.trim();
  }
  return trimmed;
}

function parseJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error(`Failed to parse OpenAI response as JSON: ${error instanceof Error ? error.message : String(error)}\nRaw: ${raw}`);
  }
}

function extractUsage(payload: ResponsePayload): JsonResponseUsageSummary {
  const usage = payload?.usage ?? payload?.response?.usage ?? {};
  const totalTokens = coerceNumber(usage.total_tokens ?? usage.totalTokens);
  const inputTokens = coerceNumber(usage.input_tokens ?? usage.inputTokens);
  const outputTokens = coerceNumber(usage.output_tokens ?? usage.outputTokens);

  const totalCost = payload?.usage?.total_cost ?? payload?.response?.usage?.total_cost ?? usage.total_cost ?? usage.totalCost;
  const usd = typeof totalCost?.usd === 'number'
    ? totalCost.usd
    : typeof totalCost?.USD === 'number'
      ? totalCost.USD
      : typeof usage.total_cost_usd === 'number'
        ? usage.total_cost_usd
        : undefined;

  const costCents = typeof usd === 'number' ? Math.round(usd * 100) : undefined;

  return { inputTokens, outputTokens, totalTokens, costCents };
}

function coerceNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}
