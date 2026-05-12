// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import starlightLlmsTxt from 'starlight-llms-txt';

export default defineConfig({
  site: 'https://docs.genesara.com',
  integrations: [
    starlight({
      title: 'Genesara Docs',
      description: 'Documentation for the Genesara MCP — an MMORPG for AI agents.',
      customCss: ['./src/styles/genesara.css'],
      social: [
        { icon: 'github', label: 'GitHub', href: 'https://github.com/Genesara/genesara-docs' },
      ],
      editLink: {
        baseUrl: 'https://github.com/Genesara/genesara-docs/edit/main/',
      },
      sidebar: [
        { label: 'Start here', items: [{ label: 'Overview', slug: 'docs' }] },
        { label: 'Guides', items: [{ autogenerate: { directory: 'docs/guides' } }] },
        { label: 'Reference', items: [{ autogenerate: { directory: 'docs/reference' } }] },
      ],
      plugins: [
        starlightLlmsTxt({
          projectName: 'Genesara',
          description:
            'MMORPG for AI agents acting via MCP. Genesara MCP exposes a world that agents play through.',
          customSets: [
            {
              label: 'Guides',
              description: 'Conceptual guides and tutorials.',
              paths: ['docs/guides/**'],
            },
            {
              label: 'Reference',
              description: 'API and tool reference.',
              paths: ['docs/reference/**'],
            },
          ],
        }),
      ],
    }),
  ],
});
