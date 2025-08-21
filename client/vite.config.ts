import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig(async ({ mode }) => {
  const plugins: any[] = [react()];

  // Only load Replit plugins in dev + REPL_ID
  if (mode !== "production" && process.env.REPL_ID) {
    try {
      const { default: runtimeErrorOverlay } = await import(
        "@replit/vite-plugin-runtime-error-modal"
      );
      plugins.push(runtimeErrorOverlay());

      const { cartographer } = await import(
        "@replit/vite-plugin-cartographer"
      );
      plugins.push(cartographer());
    } catch {
      // silently ignore if not available
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
