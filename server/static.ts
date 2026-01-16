import express, { type Express } from "express";
import fs from "fs";
import path from "path";
// Use process.cwd() as base for Vercel to ensure reliability
const baseDir = process.cwd();

export function serveStatic(app: Express) {
  // On Vercel, dist/public is relative to the function root (process.cwd())
  let distPath = path.resolve(baseDir, "dist", "public");

  if (!fs.existsSync(distPath)) {
    // Try one level up if we are running in an api function sub-directory
    distPath = path.resolve(baseDir, "..", "dist", "public");
  }

  if (!fs.existsSync(distPath)) {
    console.error(`Could not find the build directory. Paths tried:
      - ${path.resolve(baseDir, "dist", "public")}
      - ${path.resolve(baseDir, "..", "dist", "public")}
    `);

    // Check if we have a local fallback in the api directory
    const fallbackPath = path.resolve(__dirname, "root.html");
    if (fs.existsSync(fallbackPath)) {
      app.use("*", (_req, res) => {
        res.sendFile(fallbackPath);
      });
      return;
    }
  }

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
