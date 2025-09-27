/**
 * @fileoverview Vite configuration for PhishProof MFA Banking
 * Configures build settings for production deployment with optimizations
 * for performance and security.
 */

import { defineConfig } from 'vite';

export default defineConfig({
  root: 'src/frontend',
  build: {
    outDir: '../../dist',
    emptyOutDir: true,
    // Production optimizations
    minify: 'terser',
    sourcemap: false,
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        // Optimize chunk sizes
        manualChunks: {
          webauthn: ['@simplewebauthn/browser'],
        },
        // Asset naming for caching
        entryFileNames: 'assets/[name].[hash].js',
        chunkFileNames: 'assets/[name].[hash].js',
        assetFileNames: 'assets/[name].[hash].[ext]',
      },
    },
    // Security headers
    assetsInlineLimit: 4096,
    // Performance budgets
    chunkSizeWarningLimit: 500,
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
    host: true,
    port: 5173,
  },
  // Security optimizations
  define: {
    __DEV__: false,
  },
  // CSS preprocessing
  css: {
    devSourcemap: true,
    modules: false,
  },
  // Production environment
  mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
});