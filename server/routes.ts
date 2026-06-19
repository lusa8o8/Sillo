import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { apiResponse, apiError } from "./utils";
import { authMiddleware, getUserId } from "./auth";

export function registerRoutes(
  httpServer: Server,
  app: Express
): Server {
  // All API surfaces below require an authenticated Firebase user.
  // (Health/debug routes in index.ts stay open. AI now lives in a Supabase Edge Function.)
  app.use("/api/metadata", authMiddleware);
  app.use("/api/vaults", authMiddleware);
  app.use("/api/youtube", authMiddleware);
  app.use("/api/playlists", authMiddleware);

  // Metadata Fetcher
  app.post("/api/metadata", async (req, res) => {
    try {
      const { url } = req.body;
      if (!url) return apiError(res, "No URL provided", 400);

      const fetchMod = await import('node-fetch');
      const fetch = fetchMod.default;

      const response = await fetch(`https://noembed.com/embed?url=${encodeURIComponent(url)}`);
      if (!response.ok) {
        console.warn("Metadata fetch failed (provider error), using default.");
        return apiResponse(res, {
          title: "New Learning Vault",
          thumbnail: ""
        });
      }

      const data = await response.json() as any;

      if (data.error) {
        console.warn("Metadata fetch returned error, using default:", data.error);
        return apiResponse(res, {
          title: "New Learning Vault",
          thumbnail: ""
        });
      }

      apiResponse(res, {
        title: data.title || "New Learning Vault",
        thumbnail: data.thumbnail_url || ""
      });
    } catch (error) {
      console.error("Metadata fetch error:", error);
      // Fallback to default metadata instead of 500
      apiResponse(res, {
        title: "New Learning Vault",
        thumbnail: ""
      });
    }
  });

  // Vaults
  app.get("/api/vaults", async (req, res) => {
    try {
      const vaults = await storage.getVaults(getUserId(req));
      apiResponse(res, vaults);
    } catch (error) {
      console.error("Fetch vaults error:", error);
      apiError(res, "Failed to fetch vaults");
    }
  });

  app.post("/api/vaults", async (req, res) => {
    try {
      const vaultData = { ...req.body, userId: getUserId(req) };
      const vault = await storage.createVault(vaultData);
      apiResponse(res, vault, 201);
    } catch (error: any) {
      console.error("Create vault error detailed:", error);
      apiError(res, `Failed to create vault: ${error.message || "Unknown error"}`);
    }
  });

  app.delete("/api/vaults/:id", async (req, res) => {
    try {
      const vault = await storage.getVault(req.params.id);
      if (!vault || vault.userId !== getUserId(req)) {
        return apiError(res, "Vault not found", 404);
      }
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
      const vault = await storage.getVault(req.params.id);
      if (!vault || vault.userId !== getUserId(req)) {
        return apiError(res, "Vault not found", 404);
      }
      const notes = await storage.getNotes(req.params.id);
      apiResponse(res, notes);
    } catch (error) {
      console.error("Fetch notes error:", error);
      apiError(res, "Failed to fetch notes");
    }
  });

  app.post("/api/vaults/:id/notes", async (req, res) => {
    try {
      const vault = await storage.getVault(req.params.id);
      if (!vault || vault.userId !== getUserId(req)) {
        return apiError(res, "Vault not found", 404);
      }
      const noteData = { ...req.body, vaultId: req.params.id };
      const note = await storage.createNote(noteData);
      apiResponse(res, note, 201);
    } catch (error) {
      console.error("Create note error:", error);
      apiError(res, "Failed to create note");
    }
  });

  app.patch("/api/vaults/:vaultId/notes/:noteId", async (req, res) => {
    try {
      const { text } = req.body;
      if (typeof text !== "string") {
        return apiError(res, "Note text is required", 400);
      }

      const vault = await storage.getVault(req.params.vaultId);
      if (!vault || vault.userId !== getUserId(req)) {
        return apiError(res, "Note not found", 404);
      }

      const note = await storage.updateNote(req.params.noteId, req.params.vaultId, text);
      if (!note) {
        return apiError(res, "Note not found", 404);
      }

      apiResponse(res, note);
    } catch (error) {
      console.error("Update note error:", error);
      apiError(res, "Failed to update note");
    }
  });

  app.delete("/api/vaults/:vaultId/notes/:noteId", async (req, res) => {
    try {
      const vault = await storage.getVault(req.params.vaultId);
      if (!vault || vault.userId !== getUserId(req)) {
        return apiError(res, "Note not found", 404);
      }
      await storage.deleteNote(req.params.noteId, req.params.vaultId);
      apiResponse(res, { success: true });
    } catch (error) {
      console.error("Delete note error:", error);
      apiError(res, "Failed to delete note");
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

  // Get Playlist Items
  app.get("/api/playlists/:id/items", async (req, res) => {
    try {
      const { getPlaylistItems } = await import("./services/youtube");
      const items = await getPlaylistItems(req.params.id);
      apiResponse(res, items);
    } catch (error) {
      console.error("Playlist items error:", error);
      apiError(res, "Failed to fetch playlist items");
    }
  });

  // TEMP diagnostic: checks DB connectivity without exposing the password.
  // Returns the host:port in use and the raw error if the query fails.
  app.get("/api/debug/db", async (_req, res) => {
    const url = process.env.DATABASE_URL;
    let host = "unset (falling back to localhost)";
    try {
      if (url) host = new URL(url).host;
    } catch {
      host = "DATABASE_URL is not a valid URL";
    }
    try {
      const { db } = await import("./db");
      const { sql } = await import("drizzle-orm");
      await db.execute(sql`select 1`);
      res.json({ ok: true, dbUrlSet: !!url, host });
    } catch (error: any) {
      res.json({ ok: false, dbUrlSet: !!url, host, error: error?.message || String(error) });
    }
  });


  return httpServer;
}
