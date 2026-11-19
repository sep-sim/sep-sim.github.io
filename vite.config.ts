import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages serves the project site under /SEPSim/. Local dev and preview keep the root base.
export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === 'build' && process.env.GITHUB_PAGES ? '/SEPSim/' : '/',
}))
