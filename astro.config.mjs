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
            { label: 'Toolhead Rebuilder', slug: 'toolhead-rebuilder' },
          ],
        },
        {
          label: 'Toolheads',
          items: [
            { label: 'Toolheads Overview', slug: 'toolheads/toolheads-overview' },
            { label: 'Toolheads Community Picks', slug: 'toolheads/toolheads-community-picks' },
            { label: 'Toolheads Catalog', slug: 'toolheads/toolheads-catalog' },
          ],
        },
        {
          label: 'Extruders',
          items: [
            { label: 'Extruders Overview', slug: 'extruders/extruders-overview' },
            { label: 'Extruders Community Picks', slug: 'extruders/extruders-community-picks' },
            { label: 'Extruders Catalog', slug: 'extruders/extruders-catalog' },
          ],
        },
        {
          label: 'Hotends',
          items: [
            { label: 'Hotends Overview', slug: 'hotends/hotends-overview' },
            { label: 'Hotends Community Picks', slug: 'hotends/hotends-community-picks' },
            { label: 'Hotends Catalog', slug: 'hotends/hotends-catalog' },
          ],
        },
        {
          label: 'Probes',
          items: [
            { label: 'Probes Overview', slug: 'probes/probes-overview' },
            { label: 'Probes Community Picks', slug: 'probes/probes-community-picks' },
            { label: 'Probes Catalog', slug: 'probes/probes-catalog' },
          ],
        },
      ],
    }),
    react(),
  ],
  vite: {
    plugins: [tailwindcss()],
  },

  adapter: cloudflare(),
});