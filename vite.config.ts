import { fileURLToPath, URL } from 'node:url'

import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // React Compiler: memoizes components and hooks at build time.
    babel({ presets: [reactCompilerPreset()] }),
    tailwindcss(),
  ],
  build: {
    rolldownOptions: {
      output: {
        // Vendor chunks change rarely, so browsers keep them cached between deploys.
        codeSplitting: {
          groups: [
            { name: 'react', test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/ },
            { name: 'state', test: /node_modules[\\/](@reduxjs|redux|react-redux|immer|reselect)/ },
            { name: 'router', test: /node_modules[\\/]react-router/ },
            { name: 'i18n', test: /node_modules[\\/](i18next|react-i18next)/ },
            {
              name: 'ui',
              test: /node_modules[\\/](radix-ui|@radix-ui|@floating-ui|lucide-react|cn)[\\/]/,
            },
          ],
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
