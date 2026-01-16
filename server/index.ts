import * as dotenv from "dotenv";
dotenv.config();
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";

export const app = express();
const httpServer = createServer(app);

app.get("/api/bundle-check", (_req, res) => {
  res.json({ status: "bundle-ready", node_env: process.env.NODE_ENV });
});

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        try {
          const jsonStr = JSON.stringify(capturedJsonResponse);
          logLine += ` :: ${jsonStr.length > 500 ? jsonStr.substring(0, 500) + "..." : jsonStr}`;
        } catch (e) {
          logLine += ` :: [Circular or large JSON]`;
        }
      }

      log(logLine);
    }
  });

  next();
});

// ALWAYS register routes first
registerRoutes(httpServer, app);

// ALWAYS register static files
serveStatic(app);

// Debug routes for Vercel troubleshooting
app.get("/api/debug/health", (_req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// Production error handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  console.error("Server Error:", err);
  res.status(status).json({ message });
});

// Dev only async block
if (process.env.NODE_ENV !== "production") {
  (async () => {
    try {
      const { setupVite } = await import("./vite");
      await setupVite(httpServer, app);

      const port = parseInt(process.env.PORT || "5005", 10);
      httpServer.listen(port, "localhost", () => {
        log(`dev server serving on port ${port}`);
      });
    } catch (err) {
      console.error("Dev server init error:", err);
    }
  })();
}

export default app;
