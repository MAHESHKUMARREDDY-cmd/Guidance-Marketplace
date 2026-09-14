import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    proxy: {
      "/api": {
        target: "http://localhost:4000",
        changeOrigin: true,
      },
      "/market-feed": {
        target: "https://query2.finance.yahoo.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/market-feed/, "/v8/finance/chart"),
        headers: { "User-Agent": "GuidanceMarketplace/1.0 market-research" },
      },
    },
  },
});
