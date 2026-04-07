import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1200,
  },
  server: {
    port: 5173,
    host: true,
    proxy: {
      // 127.0.0.1 avoids Windows resolving "localhost" to ::1 while Node listens on IPv4 only
      "/api": { target: "http://127.0.0.1:4000", changeOrigin: true },
    },
  },
});
