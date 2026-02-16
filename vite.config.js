// vite.config.js
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'https://finals-tenant-system.onrender.com', // Siguraduhin na tama ito
        changeOrigin: true,
      }
    }
  }
})
