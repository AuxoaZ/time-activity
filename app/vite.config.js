import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Dev: /api is proxied to the local ActivityWatch server (no CORS needed).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true, // auto-start relies on a fixed address
    proxy: { "/api": { target: "http://127.0.0.1:5600", changeOrigin: true } },
  },
});
