/**
 * Author: ChatGPT-4.1
 * Date: 2025-10-24T22:45:00Z
 * PURPOSE: Provide reusable OpenAI Agents SDK tool and handoff builders for Luigi
 *          stage execution, including secure filesystem access helpers and
 *          standardized agent delegation wiring.
 * SRP/DRY check: Pass – centralizes Luigi SDK tool creation so stage leads and
 *                orchestrators reuse vetted utilities instead of re-declaring
 *                tool definitions.
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import {
  handoff,
  tool,
  type Agent,
  type AgentOutputType,
  type Handoff,
} from '@openai/agents';
import { z } from 'zod';

const DEFAULT_MAX_FILE_BYTES = 200 * 1024; // 200 KB per file
const DEFAULT_MAX_FILES = 20;

export interface LuigiToolContext {
  /** Optional override root for filesystem reads; defaults to process.cwd(). */
  readonly workspaceRoot?: string;
}

export interface LuigiReadFileResult {
  readonly path: string;
  readonly size: number;
  readonly truncated: boolean;
  readonly content: string;
}

export interface LuigiReadFilesResponse {
  readonly files: LuigiReadFileResult[];
  readonly errors: string[];
}

const readFileParamsSchema = z.object({
  paths: z.array(z.string().min(1)).min(1).max(DEFAULT_MAX_FILES),
  encoding: z.enum(['utf-8', 'base64']).optional().default('utf-8'),
  maxBytes: z.number().int().positive().max(DEFAULT_MAX_FILE_BYTES * 5).optional(),
});

type ReadFileParams = z.infer<typeof readFileParamsSchema>;

type ReadFilesExecute = (
  params: ReadFileParams,
  context?: LuigiToolContext,
) => Promise<LuigiReadFilesResponse>;

function resolveWorkspaceRoot(context?: LuigiToolContext): string {
  return context?.workspaceRoot
    ? path.resolve(context.workspaceRoot)
    : process.cwd();
}

function ensureWithinRoot(root: string, candidate: string): boolean {
  const relative = path.relative(root, candidate);
  if (!relative) {
    return true;
  }
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    return false;
  }
  return true;
}

async function safeReadFile(
  absolutePath: string,
  encoding: BufferEncoding,
  maxBytes: number,
): Promise<Omit<LuigiReadFileResult, 'path'>> {
  const data = await fs.readFile(absolutePath);
  const truncated = data.byteLength > maxBytes;
  const slice = truncated ? data.subarray(0, maxBytes) : data;
  const content = encoding === 'base64' ? slice.toString('base64') : slice.toString('utf-8');

  return {
    content,
    size: data.byteLength,
    truncated,
  };
}

async function executeReadFiles(
  params: ReadFileParams,
  context?: LuigiToolContext,
): Promise<LuigiReadFilesResponse> {
  const root = resolveWorkspaceRoot(context);
  const encoding = params.encoding ?? 'utf-8';
  const maxBytes = params.maxBytes ?? DEFAULT_MAX_FILE_BYTES;

  const files: LuigiReadFileResult[] = [];
  const errors: string[] = [];

  for (const rawPath of params.paths) {
    const normalized = path.normalize(rawPath);
    const absolute = path.resolve(root, normalized);

    if (!ensureWithinRoot(root, absolute)) {
      errors.push(`Path ${rawPath} resolves outside workspace root.`);
      continue;
    }

    try {
      const stats = await fs.stat(absolute);
      if (stats.isDirectory()) {
        errors.push(`Path ${rawPath} is a directory; only files are supported.`);
        continue;
      }

      const result = await safeReadFile(absolute, encoding as BufferEncoding, maxBytes);
      files.push({ path: normalized, ...result });
    } catch (error) {
      errors.push(`Failed to read ${rawPath}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  return { files, errors };
}

export const luigiReadFilesTool = tool({
  name: 'read_files',
  description:
    'Read repository files required for Luigi stages. Accepts up to 20 relative paths and returns file contents with truncation metadata.',
  parameters: readFileParamsSchema,
  strict: true,
  async execute(input: ReadFileParams, runContext) {
    const context = runContext?.context as LuigiToolContext | undefined;
    return executeReadFiles(input, context);
  },
} as const);

export interface LuigiHandoffOptions {
  readonly description: string;
  readonly inputFilter?: NonNullable<Parameters<typeof handoff>[1]>['inputFilter'];
}

export function createLuigiHandoff(
  name: string,
  agent: Agent<any, any>,
  options: LuigiHandoffOptions,
): Handoff<unknown, AgentOutputType> {
  const wrapped = handoff(agent as Agent<unknown, AgentOutputType>, {
    toolNameOverride: name,
    toolDescriptionOverride: options.description,
    inputFilter: options.inputFilter,
  }) as Handoff<unknown, AgentOutputType>;
  return wrapped;
}

export const defaultLuigiTools = [luigiReadFilesTool];

export type LuigiWorkspaceToolset = typeof defaultLuigiTools[number];
