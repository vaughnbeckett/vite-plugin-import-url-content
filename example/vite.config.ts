import { defineConfig } from 'vite'
import Vue from '@vitejs/plugin-vue'
import { importUrlContent } from '@vaughnbeckett/vite-plugin-import-url-content'

export default defineConfig({
  plugins: [
    Vue(),
    importUrlContent(),
  ]
})
