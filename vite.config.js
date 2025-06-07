import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  base: process.env.NODE_ENV === 'production' ? '/task-seeder/' : '/',
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './tests/setup.js',
    exclude: ['**/node_modules/**', '**/tests/e2e/**']
  }
})
