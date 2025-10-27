import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import compression from 'vite-plugin-compression'

// https://vite.dev/config/
export default defineConfig({
  publicDir: 'public',
  define: {
    global: 'globalThis',
  },
  plugins: [
    react(),
    // Production compression only (gzip + brotli)
    ...(process.env.NODE_ENV === 'production' ? [
      compression({
        algorithm: 'gzip',
        ext: '.gz',
        threshold: 10240,  // Only compress files > 10KB
        deleteOriginFile: false
      }),
      compression({
        algorithm: 'brotliCompress',
        ext: '.br',
        threshold: 10240,
        deleteOriginFile: false
      })
    ] : [])
  ],
  resolve: {
    dedupe: ['react', 'react-dom', 'react/jsx-runtime', 'three'],
    alias: {
      '@': path.resolve(__dirname, 'src'),
      'buffer': 'buffer/'
    }
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react/jsx-runtime', 'three', '@react-three/fiber', '@react-three/drei', '@xyflow/react'],
    exclude: ['.eslintrc.cjs', 'tailwind.config.cjs', 'postcss.config.cjs'],
    esbuildOptions: {
      resolveExtensions: ['.mjs', '.js', '.jsx', '.json', '.ts', '.tsx']
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: undefined
      }
    },
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: false,  // Keep console for production debugging
        drop_debugger: true,  // Remove debugger statements
        pure_funcs: ['console.debug', 'console.log'], // Only drop debug/log, keep error/warn
        passes: 2
      },
      format: {
        comments: false
      }
    },
    chunkSizeWarningLimit: 1000
  },
  server: {
    port: 3000,
    strictPort: false,  // Allow next available port if 3000 is taken
    proxy: {
      '/api': {
        target: 'http://localhost:3004',
        changeOrigin: true,
      },
      '/assets': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      }
    }
  }
})
