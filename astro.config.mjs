import { defineConfig } from 'astro/config';

import tailwind from "@astrojs/tailwind";

import icon from 'astro-icon';

// https://astro.build/config
export default defineConfig({
  integrations: [
    tailwind(), 
    icon({
      include: {
        'simple-icons': ['*'], // Include all simple-icons
        'bx': ['*'], // Include all boxicons (for bxl-linkedin)
      },
    })
  ],
  site: 'https://h4sci.github.io'
});