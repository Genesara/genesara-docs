#!/usr/bin/env tsx
/**
 * Generates one MDX page per MCP tool from schema/schema.json plus an index
 * page listing every tool. Output lives at src/content/docs/docs/reference/
 * tools/ — Starlight picks them up via its existing autogenerate config.
 *
 * Generated files are git-ignored. Editing them by hand is pointless; the next
 * build will overwrite. To change a tool's docs, change its description in the
 * engine, cut a new release, rebuild.
 */
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

type JsonSchemaProperty = {
  type?: string;
  description?: string;
  enum?: string[];
  const?: string;
};

type ToolInputSchema = {
  type?: string;
  properties?: Record<string, JsonSchemaProperty>;
  required?: string[];
  additionalProperties?: boolean;
};

type RawTool = {
  name: string;
  description: string;
  inputSchema?: ToolInputSchema;
};

type RawSchema = {
  version?: string;
  generatedAt?: string;
  tools?: RawTool[];
};

const schemaPath = resolve(process.cwd(), 'schema/schema.json');
const outDir = resolve(process.cwd(), 'src/content/docs/docs/reference/tools');

function escapeMdx(s: string): string {
  // Curly braces are MDX expressions; backticks are inline code. Both can show
  // up in tool descriptions (e.g. "in `unspentAttributePoints`"). Backticks are
  // legal in MDX so we leave them; braces we leave alone too — the engine
  // descriptions don't contain raw `{` so far. If that changes, escape here.
  return s;
}

function deriveFrontmatterDescription(toolDescription: string): string {
  // Use first sentence (up to ~160 chars) as the meta description.
  const firstSentence = toolDescription.split(/(?<=[.!?])\s+/)[0] ?? toolDescription;
  const trimmed = firstSentence.length > 160 ? `${firstSentence.slice(0, 157)}...` : firstSentence;
  return trimmed.replace(/"/g, '\\"');
}

function renderParamRow(name: string, prop: JsonSchemaProperty, required: boolean): string {
  const typeLabel = prop.enum
    ? `enum`
    : prop.const !== undefined
      ? `const`
      : (prop.type ?? 'any');
  const requiredCell = required ? '**required**' : 'optional';
  const description = (prop.description ?? '').replace(/\n+/g, ' ').replace(/\|/g, '\\|');
  return `| \`${name}\` | \`${typeLabel}\` | ${requiredCell} | ${description} |`;
}

function renderEnumDetails(name: string, prop: JsonSchemaProperty): string {
  if (!prop.enum || prop.enum.length === 0) return '';
  const values = prop.enum.map((v) => `\`${v}\``).join(', ');
  return `\n**\`${name}\`** accepts: ${values}\n`;
}

function renderToolPage(tool: RawTool, sourceVersion: string): string {
  const description = escapeMdx(tool.description);
  const fmDescription = deriveFrontmatterDescription(tool.description);
  const props = tool.inputSchema?.properties ?? {};
  const required = new Set(tool.inputSchema?.required ?? []);
  const propNames = Object.keys(props);
  const hasParams = propNames.length > 0;

  const paramsTable = hasParams
    ? [
        '| Parameter | Type | Required | Description |',
        '| --- | --- | --- | --- |',
        ...propNames.map((name) => renderParamRow(name, props[name]!, required.has(name))),
      ].join('\n')
    : '_No parameters._';

  const enumSections = propNames
    .map((name) => renderEnumDetails(name, props[name]!))
    .filter(Boolean)
    .join('');

  const inputSchemaJson = JSON.stringify(tool.inputSchema ?? {}, null, 2);

  return `---
title: ${tool.name}
description: "${fmDescription}"
---

${description}

## Parameters

${paramsTable}
${enumSections}
## Input schema

\`\`\`json
${inputSchemaJson}
\`\`\`

---

Engine schema version: \`${sourceVersion}\`. The agent-facing form of this tool
is at [\`/docs-agents/tools.json\`](/docs-agents/tools.json).
`;
}

function renderIndexPage(tools: RawTool[], sourceVersion: string): string {
  const rows = tools
    .map((t) => {
      const firstSentence = t.description.split(/(?<=[.!?])\s+/)[0] ?? t.description;
      const short = firstSentence.length > 110 ? `${firstSentence.slice(0, 107)}...` : firstSentence;
      return `| [\`${t.name}\`](/docs/reference/tools/${t.name}/) | ${short.replace(/\|/g, '\\|')} |`;
    })
    .join('\n');

  return `---
title: Tools
description: Every MCP tool the Genesara engine exposes, generated from the engine schema.
---

The Genesara MCP exposes **${tools.length} tools**. Each one is documented on
its own page below, and the same set is published as a machine-readable
manifest at [\`/docs-agents/tools.json\`](/docs-agents/tools.json) for agents.

| Tool | Summary |
| --- | --- |
${rows}

---

Engine schema version: \`${sourceVersion}\`. This page and the per-tool pages
are generated at build time from [\`Genesara/genesara-engine\`](https://github.com/Genesara/genesara-engine)'s
latest release. They are never hand-edited.
`;
}

async function main() {
  if (!existsSync(schemaPath)) {
    throw new Error(`[build-tool-pages] ${schemaPath} not found. Run 'pnpm sync:schema' first.`);
  }
  const raw = JSON.parse(await readFile(schemaPath, 'utf8')) as RawSchema;
  const tools = (raw.tools ?? [])
    .filter((t): t is RawTool => typeof t?.name === 'string' && typeof t?.description === 'string')
    .sort((a, b) => a.name.localeCompare(b.name));
  const version = raw.version ?? '0.0.0';

  // Wipe and recreate so renamed/removed tools don't leave stale pages behind.
  if (existsSync(outDir)) {
    await rm(outDir, { recursive: true, force: true });
  }
  await mkdir(outDir, { recursive: true });

  await writeFile(resolve(outDir, 'index.mdx'), renderIndexPage(tools, version));

  for (const tool of tools) {
    await writeFile(resolve(outDir, `${tool.name}.mdx`), renderToolPage(tool, version));
  }

  console.log(`[build-tool-pages] wrote ${tools.length + 1} pages to ${outDir}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
