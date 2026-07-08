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
      // Alias @fb → firebase.ts (migré de .js en M0.2)
      '@fb': path.resolve(__dirname, 'firebase.ts'),
      // Alias @ → src/
      '@': path.resolve(__dirname, 'src'),
    },
  },
})
