import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Browser → Etherscan V2 (avoids CORS during local dev)
      '/api/etherscan': {
        target: 'https://api.etherscan.io',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/etherscan/, ''),
      },
    },
  },
})
