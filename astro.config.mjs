// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  // Static output: the whole point is that the reel keeps running when the
  // market venue's wifi does not.
  output: 'static',
  vite: { plugins: [tailwindcss()] },
});
