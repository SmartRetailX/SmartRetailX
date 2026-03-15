// import path from 'node:path';
import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import { tanstackRouter } from '@tanstack/router-plugin/rspack';

export default defineConfig({
  html: {
    template: './src/index.html',
  },
  plugins: [pluginReact()],
  source: {
    // alias: {
    //   '@': path.resolve(__dirname, 'src'),
    // },
    entry: {
      index: './src/main.tsx',
    },
    tsconfigPath: './tsconfig.app.json',
  },
  server: {
    port: 5173,
  },
  output: {
    copy: [{ from: './src/favicon.ico' }, { from: './public' }],
    target: 'web',
    distPath: {
      root: 'dist',
    },
  },
  tools: {
    rspack: {
      plugins: [
        tanstackRouter({
          target: 'react',
          autoCodeSplitting: true,
        }),
      ],
    },
  },
});
