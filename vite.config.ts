import { fileURLToPath, URL } from 'node:url';
import path from 'node:path';

import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import vueDevTools from 'vite-plugin-vue-devtools';

import VueI18nPlugin from '@intlify/unplugin-vue-i18n/vite';

import UnoCSS from 'unocss/vite';

import AutoImport from './plugins/auto-import';
import Components from './plugins/components';
import svgLoader from './plugins/svg-loader';
import scssTokensPlugin from './plugins/vite-plugin-scss-tokens';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    VueI18nPlugin({
      include: [path.resolve(__dirname, './src/locales/**')],
    }),
    svgLoader(),
    AutoImport(),
    Components(),
    UnoCSS(),
    vueDevTools(),
    scssTokensPlugin(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    target: 'esnext',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
      format: {
        comments: false,
      },
    },
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('vue') || id.includes('pinia')) return 'vue';
            return 'vendor';
          }
        },
      },
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `
					@use "@/styles/tokens" as *;
					@use "@/styles/constants" as *;
					@use "@/styles/functions" as *;
					@use "@/styles/mixins" as *;
				`,
      },
    },
  },
});
