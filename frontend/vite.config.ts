import tailwindcss from '@tailwindcss/vite'
import basicSsl from '@vitejs/plugin-basic-ssl'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// `npm run dev:lan` serves the dev site to other devices on the network (e.g. a phone). Browsers only
// allow sign-in's crypto on https or localhost, so it uses a self-signed certificate (accept the warning
// once), and sends API calls through this server so the page and the API share that one https origin.
const lan = process.env.LAN === '1'

// https://vite.dev/config/
export default defineConfig({
  // Project page on GitHub Pages is served from /<repo-name>/.
  base: '/mysite/',
  plugins: [react(), tailwindcss(), ...(lan ? [basicSsl()] : [])],
  server: lan ? { host: true, proxy: { '/api': 'http://localhost:8000' } } : undefined,
})
