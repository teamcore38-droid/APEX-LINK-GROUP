import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const verificationTags = [
    env.VITE_GOOGLE_SITE_VERIFICATION
      ? { tag: 'meta', attrs: { name: 'google-site-verification', content: env.VITE_GOOGLE_SITE_VERIFICATION } }
      : null,
    env.VITE_BING_SITE_VERIFICATION
      ? { tag: 'meta', attrs: { name: 'msvalidate.01', content: env.VITE_BING_SITE_VERIFICATION } }
      : null,
  ].filter(Boolean)

  return {
  plugins: [
    react(),
    {
      name: 'search-engine-verification',
      transformIndexHtml() {
        return verificationTags
      },
    },
  ],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      }
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          const normalizedId = id.replaceAll('\\', '/')

          if (!normalizedId.includes('/node_modules/')) {
            return undefined
          }

          if (
            normalizedId.includes('/node_modules/react-router/') ||
            normalizedId.includes('/node_modules/react-router-dom/')
          ) {
            return 'router-vendor'
          }

          if (
            normalizedId.includes('/node_modules/react/') ||
            normalizedId.includes('/node_modules/react-dom/') ||
            normalizedId.includes('/node_modules/scheduler/')
          ) {
            return 'react-vendor'
          }

          if (normalizedId.includes('/node_modules/axios/')) {
            return 'http-vendor'
          }

          return undefined
        },
      },
    },
  },
  }
})
