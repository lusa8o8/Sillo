import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Metadata Fetcher (Server-Side to avoid CORS)
  app.post("/api/metadata", async (req, res) => {
    try {
      const { url } = req.body;
      if (!url) return res.status(400).json({ error: "No URL provided" });

      // Use noembed.com for generic oEmbed support (Works for YouTube, Vimeo, etc.)
      const fetchMod = await import('node-fetch');
      const fetch = fetchMod.default;

      const response = await fetch(`https://noembed.com/embed?url=${encodeURIComponent(url)}`);
      const data = await response.json();

      if (data.error) {
        return res.json({ title: "New Learning Vault", thumbnail: "" });
      }

      res.json({
        title: data.title || "New Learning Vault",
        thumbnail: data.thumbnail_url || ""
      });
    } catch (error) {
      console.error("Metadata fetch error:", error);
      res.status(500).json({ title: "New Learning Vault", thumbnail: "" });
    }
  });

  // Vaults
  app.get("/api/vaults", async (req, res) => {
    const vaults = await storage.getVaults();
    res.json(vaults);
  });

  app.post("/api/vaults", async (req, res) => {
    try {
      // In a real app we would validate req.body against insertVaultSchema
      // For MVP we assume the client sends valid data matching Schema
      // Using a fixed userId for now since we don't have auth middleware active
      const vaultData = { ...req.body, userId: "user-123" };
      const vault = await storage.createVault(vaultData);
      res.json(vault);
    } catch (error) {
      res.status(500).json({ error: "Failed to create vault" });
    }
  });

  // Notes
  app.get("/api/vaults/:id/notes", async (req, res) => {
    const notes = await storage.getNotes(req.params.id);
    res.json(notes);
  });

  app.post("/api/vaults/:id/notes", async (req, res) => {
    try {
      const noteData = { ...req.body, vaultId: req.params.id };
      const note = await storage.createNote(noteData);
      res.json(note);
    } catch (error) {
      res.status(500).json({ error: "Failed to create note" });
    }
  });

  // YouTube Search
  app.get("/api/youtube/search", async (req, res) => {
    const query = req.query.q as string;
    const type = req.query.type as string;

    if (!query) {
      return res.status(400).json({ error: "Missing query" });
    }

    try {
      const { searchYouTube } = await import("./services/youtube");
      const results = await searchYouTube(query, { type });
      res.json(results);
    } catch (error) {
      res.status(500).json({ error: "Failed to search YouTube" });
    }
  });

  return httpServer;
}
