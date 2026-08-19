import path from "node:path";
import react from "@vitejs/plugin-react";
import {splitVendorChunkPlugin} from "vite";
import {defineConfig} from "vitest/config";

export default defineConfig({
  plugins: [react(), splitVendorChunkPlugin()],

  root: path.resolve(__dirname, "./src"),

  publicDir: path.resolve(__dirname, "./src/public"),

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },

  css: {
    preprocessorOptions: {
      scss: {
        // Vite 5.3 drives Sass through the legacy API, which reads includePaths; loadPaths is the modern name.
        includePaths: [path.resolve(__dirname, "./src/styles")],
        loadPaths: [path.resolve(__dirname, "./src/styles")],
      },
    },
  },

  build: {
    outDir: path.resolve(__dirname, "./dist"),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        app: path.resolve(__dirname, "./src/index.html"),
      },
    },
    assetsInlineLimit: 0,
  },

  server: {
    host: true,
    port: 8080,
    strictPort: true,
    hmr: {
      port: 8081,
      clientPort: 8081,
    },
  },

  preview: {
    host: true,
    port: 8080,
    strictPort: true,
  },

  test: {
    environment: "jsdom",
  },
});
