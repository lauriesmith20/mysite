import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // Project page on GitHub Pages is served from /<repo-name>/.
  base: '/mysite/',
  plugins: [react(), tailwindcss()],
})
