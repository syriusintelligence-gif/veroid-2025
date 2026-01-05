import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: false,
    watch: { 
      usePolling: true, 
      interval: 1000
    },
    hmr: {
      overlay: true,
      protocol: 'ws',
      host: 'localhost',
      port: 5173
    },
    cors: true,
    proxy: {}
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  preview: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: false
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Vendor chunks - separate large libraries
          if (id.includes('node_modules')) {
            // React ecosystem
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
              return 'vendor-react';
            }
            // Framer Motion
            if (id.includes('framer-motion')) {
              return 'vendor-framer';
            }
            // Supabase
            if (id.includes('@supabase')) {
              return 'vendor-supabase';
            }
            // Radix UI components
            if (id.includes('@radix-ui')) {
              return 'vendor-ui';
            }
            // Lucide icons
            if (id.includes('lucide-react')) {
              return 'vendor-icons';
            }
            // Crypto libraries
            if (id.includes('jsrsasign')) {
              return 'vendor-crypto';
            }
            // Canvas libraries
            if (id.includes('html2canvas')) {
              return 'vendor-canvas';
            }
            // Other utilities
            return 'vendor-utils';
          }
        }
      }
    },
    // Optimize chunk size
    chunkSizeWarningLimit: 1000,
    // Enable minification
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: false, // 🆕 MANTÉM console.log para debug do 2FA
        drop_debugger: true
      }
    }
  }
});