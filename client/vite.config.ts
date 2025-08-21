import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig(({ mode }) => {
  const isReplit = process.env.REPL_ID !== undefined && mode !== "production";

  const plugins = [react()];

  // Only include Replit plugins if running in Replit dev env
  if (isReplit) {
    try {
      const runtimeErrorOverlay = require("@replit/vite-plugin-runtime-error-modal");
      plugins.push(runtimeErrorOverlay());

      const { cartographer } = require("@replit/vite-plugin-cartographer");
      plugins.push(cartographer());
    } catch (err) {
      console.warn("⚠️ Replit plugins not available, skipping...");
    }
  }

  return {
    plugins,
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "client", "src"),
        "@shared": path.resolve(__dirname, "shared"),
        "@assets": path.resolve(__dirname, "attached_assets"),
      },
    },
    root: path.resolve(__dirname, "client"),
    build: {
      outDir: path.resolve(__dirname, "dist/public"),
      emptyOutDir: true,
    },
    server: {
      fs: {
        strict: true,
        deny: ["**/.*"],
      },
    },
  };
});
