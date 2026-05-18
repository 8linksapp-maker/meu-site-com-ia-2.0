// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';
import react from '@astrojs/react';

import vercel from '@astrojs/vercel';

// https://astro.build/config
export default defineConfig({
  vite: {
    plugins: [tailwindcss()],
    define: {
      __BUILD_DATE__: JSON.stringify(
        new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
      ),
    },
  },

  integrations: [react()],

  output: 'server',
  adapter: vercel({
    maxDuration: 60,
  })
});