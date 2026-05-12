#!/usr/bin/env tsx
/**
 * Fetches the Genesara MCP schema from the genesara-engine repo (pinned to a
 * git ref) and writes it to schema/schema.json. Falls back to the committed
 * stub if the upstream file is missing — lets the docs build during the window
 * where the engine hasn't published its schema yet.
 *
 * Run automatically as part of `pnpm build`. Safe to re-run locally.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const REPO = 'Genesara/genesara-engine';
const REF = 'main';
const SCHEMA_PATH = 'schema/schema.json';
const URL = `https://raw.githubusercontent.com/${REPO}/${REF}/${SCHEMA_PATH}`;

const out = resolve(process.cwd(), 'schema/schema.json');
const fallback = resolve(process.cwd(), 'schema/schema.fallback.json');

async function main() {
  await mkdir(dirname(out), { recursive: true });

  let payload: string | null = null;
  try {
    const res = await fetch(URL, { redirect: 'follow' });
    if (res.ok) {
      payload = await res.text();
      console.log(`[sync-schema] fetched ${URL} (${payload.length} bytes)`);
    } else {
      console.warn(`[sync-schema] upstream returned ${res.status}, using fallback`);
    }
  } catch (err) {
    console.warn(`[sync-schema] fetch failed (${(err as Error).message}), using fallback`);
  }

  if (!payload) {
    payload = await readFile(fallback, 'utf8');
    console.log('[sync-schema] wrote schema.json from local fallback');
  }

  // Validate it parses before writing.
  try {
    JSON.parse(payload);
  } catch (err) {
    throw new Error(`[sync-schema] payload is not valid JSON: ${(err as Error).message}`);
  }

  await writeFile(out, payload);
  console.log(`[sync-schema] schema.json written to ${out}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
