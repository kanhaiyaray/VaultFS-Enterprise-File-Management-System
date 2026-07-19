import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Proxy API calls to Express backend during dev
    proxy: {
      "/api": {
        target: "http://localhost:5000", // ✅ Ensure this matches your backend port
        changeOrigin: true,
        // No rewrite needed – backend expects /api prefix
      },
      "/uploads": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
      "/socket.io": {
        target: "http://localhost:5000",
        ws: true,
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: "dist",
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (id.includes("recharts")) return "charts";
          if (id.includes("lucide-react") || id.includes("react-hot-toast")) return "ui";
          if (
            id.includes("react-router-dom") ||
            id.includes("react-dom") ||
            id.match(/node_modules[\\/](react|scheduler)[\\/]/)
          ) {
            return "vendor";
          }
        },
      },
    },
  },
});