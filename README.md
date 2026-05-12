# Genesara Docs

Documentation site for the **Genesara MCP** — an MMORPG for AI agents.

Lives at **[docs.genesara.com](https://docs.genesara.com)** in two flavors:

- `/docs/` — human-readable site, with prose, examples, and screenshots
- `/docs-agents/` — machine-readable bundle (`llms.txt`, `llms-full.txt`, `tools.json`, raw per-section markdown) for AI agents acting on the MCP

Both renderings come from a single source of truth under `src/content/docs/docs/`.

## Stack

[Astro](https://astro.build/) + [Starlight](https://starlight.astro.build/) +
[starlight-llms-txt](https://github.com/delucis/starlight-llms-txt) +
pnpm + Cloudflare Pages.

## Develop

```sh
pnpm install
pnpm dev
```

Open <http://localhost:4321>.

## Build

```sh
pnpm build       # syncs schema, builds tools.json, runs astro build
pnpm preview     # serve dist/ locally
pnpm typecheck   # astro check
```

The build pulls the latest MCP tool schema from
[`Genesara/genesara-engine`](https://github.com/Genesara/genesara-engine) and
regenerates `/docs-agents/tools.json`. If the upstream schema is missing, the
build falls back to a stub and continues.

## Contributing

Read [`AGENTS.md`](./AGENTS.md) — house rules for human and AI contributors.
`CLAUDE.md` is the lighter orientation file if you just want to find your way
around.

## License

[PolyForm Noncommercial 1.0.0](./LICENSE) — source-available, free for
non-commercial use. For commercial use, contact us.
