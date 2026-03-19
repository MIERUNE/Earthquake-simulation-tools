import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  plugins: [sveltekit()],
  server: {
    port: 5173
  },
  resolve: {
    alias: {
      '@melt-ui/svelte': resolve('./node_modules/@melt-ui/svelte/dist/index.js'),
      'svelte-hero-icons': resolve('./node_modules/svelte-hero-icons/dist/index.js'),
      '@fortawesome/svelte-fontawesome': resolve('./node_modules/@fortawesome/svelte-fontawesome/index.js'),
      'svelte-maplibre-gl': resolve('./node_modules/svelte-maplibre-gl/dist/index.js')
    }
  },
  ssr: {
    noExternal: ['@melt-ui/svelte', 'svelte-hero-icons', '@fortawesome/svelte-fontawesome', 'svelte-maplibre-gl']
  },
  optimizeDeps: {
    include: ['@melt-ui/svelte', 'svelte-hero-icons', '@fortawesome/svelte-fontawesome', 'svelte-maplibre-gl']
  }
});