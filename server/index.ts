import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";

export const app = express();
const httpServer = createServer(app);

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

// Register routes and static files synchronously for production
// This ensures they are ready when Vercel's serverless function handler is called
if (process.env.NODE_ENV === "production") {
  registerRoutes(httpServer, app);
  serveStatic(app);
}

(async () => {
  try {
    if (process.env.NODE_ENV !== "production") {
      // Register routes first in dev
      registerRoutes(httpServer, app);

      const { setupVite } = await import("./vite");
      await setupVite(httpServer, app);
    }

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      if (status >= 500) {
        console.error("Server Error:", err);
      }

      res.status(status).json({ message });
    });

    // Only start listening if strict mode (dev) or if running as standalone server
    if (process.env.NODE_ENV !== "production" || require.main === module) {
      const port = parseInt(process.env.PORT || "5005", 10);

      httpServer.on('error', (e: any) => {
        if (e.code === 'EADDRINUSE') {
          console.error(`Port ${port} is already in use. Please kill the process using it.`);
        } else {
          console.error('Server error:', e);
        }
        process.exit(1);
      });

      httpServer.listen(
        {
          port,
          host: "localhost",
        },
        () => {
          log(`serving on port ${port}`);
        },
      );
    }
  } catch (err) {
    console.error("Critical server initialization error:", err);
    process.exit(1);
  }
})();
