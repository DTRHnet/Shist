import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig(({ mode }) => {
  const plugins = [react()];

  // Only load Replit dev plugins when not in production and REPL_ID exists
  if (mode !== "production" && process.env.REPL_ID) {
    try {
      const runtimeErrorOverlay = require("@replit/vite-plugin-runtime-error-modal");
      plugins.push(runtimeErrorOverlay());

      const { cartographer } = require("@replit/vite-plugin-cartographer");
      plugins.push(cartographer());
    } catch {
      // If not installed (like on Vercel), safely ignore
    }
  }

  return {
    plugins,
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "src"),
        "@shared": path.resolve(__dirname, "../shared"),
        "@assets": path.resolve(__dirname, "../attached_assets"),
      },
    },
    root: path.resolve(__dirname),
    build: {
      outDir: path.resolve(__dirname, "../dist/public"),
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
