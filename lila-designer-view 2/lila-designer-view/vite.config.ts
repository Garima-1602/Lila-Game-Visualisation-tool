import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Relative asset paths so the built app works on Netlify, GitHub Pages, or any subpath.
export default defineConfig({
  plugins: [react()],
  base: './',
})
