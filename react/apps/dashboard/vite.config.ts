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
        // Lets any `*.module.scss` reach the shared mixins with `@use "mixins" as *;` instead of counting `../`s.
        // Vite 5.3 still drives Sass through its legacy API, which reads `includePaths`; `loadPaths` is the modern
        // equivalent and is kept so this keeps working when the modern compiler becomes the default.
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
