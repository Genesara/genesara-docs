# Deploy guide — one-time setup

Everything is scaffolded locally; this is the manual sequence to wire it up to
GitHub and Cloudflare Pages. After this, every push to `main` auto-deploys.

## 1. Create the GitHub repo

In the GitHub UI:

- **Owner:** `Genesara` (your org)
- **Repository name:** `genesara-docs`
- **Description:** "Documentation for the Genesara MCP — an MMORPG for AI agents"
- **Visibility:** Public (recommended) or Private
- **Initialize repository:** leave all three checkboxes **off** (no README, no .gitignore, **no license** — we already have all three)

Click *Create repository*. You'll land on the empty-repo screen with copy-pasteable instructions.

## 2. Push the local scaffold

From this directory (`genesara-docs/`):

```sh
git init -b main
git add .
git commit -m "feat: initial scaffold"
git remote add origin git@github.com:Genesara/genesara-docs.git
git push -u origin main
```

After the push, GitHub will display "PolyForm Noncommercial License 1.0.0" in
the repo header (auto-detected from the `LICENSE` file's SPDX identifier).

## 3. Connect Cloudflare Pages

1. Cloudflare dashboard → **Workers & Pages → Create application → Pages → Connect to Git**.
2. Pick the `Genesara/genesara-docs` repo (the one you just pushed). Authorize the GitHub app to the org if prompted.
3. **Build settings:**
   - Framework preset: **Astro**
   - Build command: `pnpm build`
   - Build output directory: `dist`
   - Root directory: *(blank)*
   - Environment variables: none required for v1
   - Node.js version: `22` (or latest LTS)
4. Save and deploy. First build takes ~90s.

The default Pages URL will be something like `genesara-docs.pages.dev` — confirm it works before adding the custom domain.

## 4. Wire up the custom domain

In the Pages project → **Custom domains → Set up a custom domain**.

- Enter `docs.genesara.com`.
- Cloudflare auto-creates the CNAME record because `genesara.com` is already on Cloudflare DNS.
- SSL/TLS issuance happens automatically (typically <2 minutes).

After the green check, https://docs.genesara.com/ is live.

## 5. Verify the routes

```sh
curl -I https://docs.genesara.com/                          # 200, selector
curl -I https://docs.genesara.com/docs/                     # 200, Starlight UI
curl -I https://docs.genesara.com/docs-agents/              # 200, HTML index
curl    https://docs.genesara.com/docs-agents/llms.txt      # text/plain, index
curl    https://docs.genesara.com/docs-agents/tools.json    # JSON manifest
```

## 6. Ongoing operations

- **Edit content:** branch from `main` → MDX changes under `src/content/docs/docs/` → PR. Cloudflare Pages auto-builds a preview URL. Merge to `main` deploys to prod.
- **Schema bumps:** as long as `Genesara/genesara-engine`'s `schema/schema.json` keeps moving on `main`, every docs deploy automatically picks up the latest. To pin docs to a stable engine tag, edit `scripts/sync-schema.ts` (`REF` constant).
- **Pin pnpm version:** Cloudflare uses the `packageManager` field in `package.json` (`pnpm@9.15.0`). Bump it intentionally.

## 7. Future hardening (not required for v1)

- Promote the engine schema from a raw GitHub file to a published `@genesara/mcp-schema` npm package so the docs depend on a versioned artifact, not a moving `main`.
- Add a link-checker step to CI (`lychee`, `linkinator`).
- Add a `_redirects` file if the URL map ever needs aliasing (`/llms.txt` → `/docs-agents/llms.txt`, etc.).
- Once the engine ships a stable schema, delete `schema/schema.fallback.json` and the fallback branch in `scripts/sync-schema.ts`.
