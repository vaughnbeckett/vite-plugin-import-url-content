import { defineConfig } from 'vite'
import Vue from '@vitejs/plugin-vue'
import { VitePlugin } from '@vaughnbeckett/vite-plugin-template'

export default defineConfig({
  plugins: [
    Vue(),
    VitePlugin(),
  ]
})
