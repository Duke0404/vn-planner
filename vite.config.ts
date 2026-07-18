import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import dotenv from 'dotenv'

dotenv.config()

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    'import.meta.env.EXPORT_SECRET': JSON.stringify(process.env.EXPORT_SECRET ?? ''),
  },
})
