#!/usr/bin/env tsx
/**
 * Post-build: move the starlight-llms-txt plugin's outputs from the site root
 * to `/docs-agents/` so the URL map matches the design:
 *
 *   /llms.txt           → /docs-agents/llms.txt
 *   /llms-full.txt      → /docs-agents/llms-full.txt
 *   /llms-small.txt     → /docs-agents/llms-small.txt
 *   /_llms-txt/*.txt    → /docs-agents/*.txt
 *
 * The plugin doesn't (yet) support a path prefix, so we relocate after build.
 * If/when the plugin adds prefix support, delete this script and the postbuild
 * hook in package.json.
 */
import { readFile, readdir, rename, rm, stat, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const dist = resolve(process.cwd(), 'dist');
const dest = join(dist, 'docs-agents');

const rootFiles = ['llms.txt', 'llms-full.txt', 'llms-small.txt'];

async function moveIfExists(from: string, to: string) {
  if (!existsSync(from)) return;
  await rename(from, to);
  console.log(`[relocate] ${from} → ${to}`);
}

async function rewriteUrls(file: string) {
  if (!existsSync(file)) return;
  const before = await readFile(file, 'utf8');
  const after = before
    // /_llms-txt/foo.txt → /docs-agents/foo.txt
    .replace(/(https:\/\/docs\.genesara\.com)\/_llms-txt\//g, '$1/docs-agents/')
    // /llms.txt, /llms-full.txt, /llms-small.txt at site root → under /docs-agents/
    .replace(
      /(https:\/\/docs\.genesara\.com)\/(llms(?:-full|-small)?\.txt)/g,
      '$1/docs-agents/$2',
    );
  if (after !== before) {
    await writeFile(file, after);
    console.log(`[relocate] rewrote internal URLs in ${file}`);
  }
}

async function main() {
  if (!existsSync(dist)) {
    throw new Error(`[relocate] dist/ not found at ${dist} — run astro build first.`);
  }
  if (!existsSync(dest)) {
    throw new Error(`[relocate] ${dest} missing — /docs-agents/index.html should have been built.`);
  }

  for (const name of rootFiles) {
    await moveIfExists(join(dist, name), join(dest, name));
  }

  const customDir = join(dist, '_llms-txt');
  if (existsSync(customDir)) {
    const entries = await readdir(customDir);
    for (const name of entries) {
      const src = join(customDir, name);
      const s = await stat(src);
      if (s.isFile()) {
        await moveIfExists(src, join(dest, name));
      }
    }
    await rm(customDir, { recursive: true, force: true });
    console.log(`[relocate] removed empty ${customDir}`);
  }

  // Rewrite URLs inside the moved files so they point to the new /docs-agents/ paths.
  for (const name of [...rootFiles, 'guides.txt', 'reference.txt']) {
    await rewriteUrls(join(dest, name));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
