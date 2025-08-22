import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes.js";
import { setupVite, serveStatic, log } from "./vite.js";
import { requestIdMiddleware, logRequest } from './logger';
import { errorHandler } from './errors';

const app = express();
app.use(requestIdMiddleware);
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  } as any;

  res.on("finish", () => {
    if (path.startsWith("/api")) {
      logRequest(req, res, start);
    }
  });

  next();
});

// ✅ Register your routes normally
import('./authRoutes').then(({ mountAuthRoutes }) => mountAuthRoutes(app));
registerRoutes(app);

// Error handler (must be last)
app.use(errorHandler);

// ⚠️ DO NOT app.listen() on Vercel
// ✅ Export the app instead
export default app;
