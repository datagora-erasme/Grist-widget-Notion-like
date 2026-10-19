import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  base: '/Grist-widget-Notion-like/',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      input: {
        kanban: path.resolve(import.meta.dirname, 'kanban.html'),
        galerie: path.resolve(import.meta.dirname, 'galerie.html'),
      },
    },
  },
})