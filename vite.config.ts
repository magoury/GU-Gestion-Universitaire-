import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { fileURLToPath } from 'url'

// En ESM ("type": "module"), __dirname n'est pas disponible nativement.
// On le reconstruit via fileURLToPath + import.meta.url.
const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      // Alias @fb → firebase.js (fichier JS, migration M0.2 le renommera en .ts)
      '@fb': path.resolve(__dirname, 'firebase.js'),
      // Alias @ → src/
      '@': path.resolve(__dirname, 'src'),
    },
  },
})
