import { sql } from "drizzle-orm";
import { pgTable, text, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const vaults = pgTable("vaults", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(), // Ideally references users(id) but keeping loose for MVP/MemStorage compatibility if needed
  type: text("type").notNull().default("video"), // 'video' | 'playlist'
  title: text("title").notNull(),
  url: text("url").notNull(),
  thumbnail: text("thumbnail"),
  addedAt: text("added_at").notNull(), // storing as ISO string for simplicity in prototype
  lastActive: text("last_active"),
  progress: text("progress"), // Using text to store number strings or simple serialization if needed, or just integer
  data: text("data"), // JSON string for extra metadata (playlist items etc)
});

export const notes = pgTable("notes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  vaultId: varchar("vault_id").notNull(), 
  timestamp: text("timestamp").notNull(), // Storing as number string
  text: text("text").notNull(),
  createdAt: text("created_at").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertVaultSchema = createInsertSchema(vaults).omit({ 
  id: true, 
  addedAt: true 
});

export const insertNoteSchema = createInsertSchema(notes).omit({ 
  id: true, 
  createdAt: true 
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertVault = z.infer<typeof insertVaultSchema>;
export type Vault = typeof vaults.$inferSelect;
export type InsertNote = z.infer<typeof insertNoteSchema>;
export type Note = typeof notes.$inferSelect;
