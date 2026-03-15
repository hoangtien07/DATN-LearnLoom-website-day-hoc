import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [sveltekit()],
  server: {
    proxy: {
      "/auth": "http://localhost:5000",
      "/api": "http://localhost:5000",
    },
  },
});
