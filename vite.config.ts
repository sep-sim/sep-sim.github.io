import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Served at the root of https://sep-sim.github.io/ (organization site), so the base is / everywhere.
export default defineConfig({
  plugins: [react()],
  base: '/',
})
