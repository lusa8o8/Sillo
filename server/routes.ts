import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { apiResponse, apiError } from "./utils";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Metadata Fetcher
  app.post("/api/metadata", async (req, res) => {
    try {
      const { url } = req.body;
      if (!url) return apiError(res, "No URL provided", 400);

      const fetchMod = await import('node-fetch');
      const fetch = fetchMod.default;

      const response = await fetch(`https://noembed.com/embed?url=${encodeURIComponent(url)}`);
      if (!response.ok) {
        return apiError(res, "Failed to fetch metadata from provider", 422);
      }

      const data = await response.json() as any;

      if (data.error) {
        return apiError(res, data.error, 422);
      }

      apiResponse(res, {
        title: data.title || "New Learning Vault",
        thumbnail: data.thumbnail_url || ""
      });
    } catch (error) {
      console.error("Metadata fetch error:", error);
      apiError(res, "Internal server error during metadata fetch", 500);
    }
  });

  // Vaults
  app.get("/api/vaults", async (_req, res) => {
    try {
      const vaults = await storage.getVaults();
      apiResponse(res, vaults);
    } catch (error) {
      console.error("Fetch vaults error:", error);
      apiError(res, "Failed to fetch vaults");
    }
  });

  app.post("/api/vaults", async (req, res) => {
    try {
      const vaultData = { ...req.body, userId: "user-123" };
      const vault = await storage.createVault(vaultData);
      apiResponse(res, vault, 201);
    } catch (error) {
      console.error("Create vault error:", error);
      apiError(res, "Failed to create vault");
    }
  });

  app.delete("/api/vaults/:id", async (req, res) => {
    try {
      await storage.deleteVault(req.params.id);
      apiResponse(res, { success: true });
    } catch (error) {
      console.error("Delete vault error:", error);
      apiError(res, "Failed to delete vault");
    }
  });

  // Notes
  app.get("/api/vaults/:id/notes", async (req, res) => {
    try {
      const notes = await storage.getNotes(req.params.id);
      apiResponse(res, notes);
    } catch (error) {
      console.error("Fetch notes error:", error);
      apiError(res, "Failed to fetch notes");
    }
  });

  app.post("/api/vaults/:id/notes", async (req, res) => {
    try {
      const noteData = { ...req.body, vaultId: req.params.id };
      const note = await storage.createNote(noteData);
      apiResponse(res, note, 201);
    } catch (error) {
      console.error("Create note error:", error);
      apiError(res, "Failed to create note");
    }
  });

  // YouTube Search
  app.get("/api/youtube/search", async (req, res) => {
    const query = req.query.q as string;
    const type = req.query.type as string;

    if (!query) {
      return apiError(res, "Missing query", 400);
    }

    try {
      const { searchYouTube } = await import("./services/youtube");
      const results = await searchYouTube(query, { type });
      apiResponse(res, results);
    } catch (error) {
      console.error("YouTube search error:", error);
      apiError(res, "Failed to search YouTube");
    }
  });

  return httpServer;
}
