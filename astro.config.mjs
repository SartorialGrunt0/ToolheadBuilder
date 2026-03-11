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
      social: [
        { icon: 'github', label: 'GitHub', href: 'https://github.com/withastro/starlight' }
      ],

      sidebar: [
        {
          label: 'Introduction',
          items: [{ label: 'Introduction', slug: 'introduction' }],
        },
        {
          label: 'Toolheads',
          items: [
            { label: 'Overview', slug: 'toolheads/toolheads-overview' },
            { label: 'Catalog', slug: 'toolheads/toolheads-catalog' },
          ],
        },
        {
          label: 'Extruders',
          items: [
            { label: 'Overview', slug: 'extruders/extruders-overview' },
            { label: 'Catalog', slug: 'extruders/extruders-catalog' },
          ],
        },
        {
          label: 'Hotends',
          items: [
            { label: 'Overview', slug: 'hotends/hotends-overview' },
            { label: 'Catalog', slug: 'hotends/hotends-catalog' },
          ],
        },
        {
          label: 'Probes',
          items: [
            { label: 'Overview', slug: 'probes/probes-overview' },
            { label: 'Catalog', slug: 'probes/probes-catalog' },
          ],
        },
      ],
    }),

    // ⭐ Enable React
    react(),
  ],

  // ⭐ Enable Tailwind via Vite plugin
  vite: {
    plugins: [tailwindcss()],
  },

  adapter: cloudflare(),
});