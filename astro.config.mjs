// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import tailwindcss from "@tailwindcss/vite";


// https://astro.build/config
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
          label: 'Hotends',
          items: [
            { label: 'Hotends', slug: 'hotends' },
          ],
        },
        {
          label: 'Toolheads',
          items: [
            { label: 'Toolheads', slug: 'toolheads' },
          ],
        },
        {
          label: 'Extruders',
          items: [
            { label: 'Extruders', slug: 'extruders' },
          ],
        },
        {
          label: 'Reference',
          autogenerate: { directory: 'reference' },
        },
      ],
    }),
  ],
});
