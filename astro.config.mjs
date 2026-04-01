// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import react from '@astrojs/react';
import tailwindcss from "@tailwindcss/vite";
import cloudflare from '@astrojs/cloudflare';

export default defineConfig({
  site: 'https://toolheadbuilder.com',

  integrations: [
    starlight({
      title: 'Toolhead Builder',
      customCss: ['./src/styles/custom.css'],
      social: [
        { icon: 'github', label: 'GitHub', href: 'https://github.com/withastro/starlight' }
      ],

      sidebar: [
        {
          label: 'Introduction',
          items: [
            { label: 'Introduction', slug: 'introduction' },
            { label: 'Toolhead Builder', slug: 'toolhead-builder' },
          ],
        },
        {
          label: 'Toolheads',
          items: [
            { label: 'Toolheads Overview', slug: 'toolheads/toolheads-overview' },
            { label: 'Toolheads Top Picks', slug: 'toolheads/toolheads-top-picks' },
            { label: 'Toolheads Catalog', slug: 'toolheads/toolheads-catalog' },
          ],
        },
        {
          label: 'Extruders',
          items: [
            { label: 'Extruders Overview', slug: 'extruders/extruders-overview' },
            { label: 'Extruders Top Picks', slug: 'extruders/extruders-top-picks' },
            { label: 'Extruders Catalog', slug: 'extruders/extruders-catalog' },
          ],
        },
        {
          label: 'Hotends',
          items: [
            { label: 'Hotends Overview', slug: 'hotends/hotends-overview' },
            { label: 'Hotends Top Picks', slug: 'hotends/hotends-top-picks' },
            { label: 'Hotends Catalog', slug: 'hotends/hotends-catalog' },
          ],
        },
        {
          label: 'Probes',
          items: [
            { label: 'Probes Overview', slug: 'probes/probes-overview' },
            { label: 'Probes Top Picks', slug: 'probes/probes-top-picks' },
            { label: 'Probes Catalog', slug: 'probes/probes-catalog' },
          ],
        },
      ],
    }),
    react(),
  ],
  vite: {
    plugins: [tailwindcss()],
    assetsInclude: ['**/*.wasm'],
  },

  adapter: cloudflare(),
});