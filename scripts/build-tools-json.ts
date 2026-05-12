#!/usr/bin/env tsx
/**
 * Reads schema/schema.json (produced by sync-schema.ts) and writes the
 * agent-facing artifact to public/docs-agents/tools.json. Astro serves the
 * public/ tree verbatim at the site root, so it's reachable at
 * /docs-agents/tools.json with no endpoint code.
 *
 * The shape we emit is intentionally minimal and stable. Agents are the
 * consumer; every extra field they have to parse costs them tokens.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

type RawTool = {
  name?: string;
  description?: string;
  inputSchema?: unknown;
  errors?: unknown;
};

type RawSchema = {
  tools?: RawTool[];
  version?: string;
  generatedAt?: string;
};

type AgentTool = {
  name: string;
  description: string;
  inputSchema: unknown;
  errors?: unknown;
};

type AgentManifest = {
  $schema: string;
  source: { repo: string; ref: string; path: string };
  version: string;
  generatedAt: string;
  tools: AgentTool[];
};

const SOURCE_REPO = 'Genesara/genesara-engine';
const SOURCE_REF = 'main';
const SOURCE_PATH = 'schema/schema.json';

const input = resolve(process.cwd(), 'schema/schema.json');
const output = resolve(process.cwd(), 'public/docs-agents/tools.json');

async function main() {
  const raw = JSON.parse(await readFile(input, 'utf8')) as RawSchema;
  const tools = (raw.tools ?? [])
    .filter((t): t is RawTool & { name: string } => typeof t.name === 'string')
    .map<AgentTool>((t) => ({
      name: t.name,
      description: t.description ?? '',
      inputSchema: t.inputSchema ?? { type: 'object', properties: {} },
      ...(t.errors !== undefined ? { errors: t.errors } : {}),
    }));

  const manifest: AgentManifest = {
    $schema: 'https://docs.genesara.com/schemas/tools.schema.json',
    source: { repo: SOURCE_REPO, ref: SOURCE_REF, path: SOURCE_PATH },
    version: raw.version ?? '0.0.0',
    generatedAt: raw.generatedAt ?? new Date().toISOString(),
    tools,
  };

  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, JSON.stringify(manifest, null, 2) + '\n');
  console.log(`[build-tools-json] wrote ${tools.length} tools to ${output}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
