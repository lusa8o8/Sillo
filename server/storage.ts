import { users, vaults, notes, type User, type InsertUser, type Vault, type InsertVault, type Note, type InsertNote } from "../shared/schema";
import { db } from "./db";
import { eq, and } from "drizzle-orm";

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Vaults
  getVaults(userId?: string): Promise<Vault[]>;
  getVault(id: string): Promise<Vault | undefined>;
  createVault(vault: InsertVault): Promise<Vault>;
  deleteVault(id: string): Promise<void>;

  // Notes (vault-scoped to prevent cross-vault access)
  getNotes(vaultId: string): Promise<Note[]>;
  createNote(note: InsertNote): Promise<Note>;
  updateNote(id: string, vaultId: string, text: string): Promise<Note | undefined>;
  deleteNote(id: string, vaultId: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getVaults(userId?: string): Promise<Vault[]> {
    if (userId) {
      return await db.select().from(vaults).where(eq(vaults.userId, userId));
    }

    return await db.select().from(vaults);
  }

  async getVault(id: string): Promise<Vault | undefined> {
    const [vault] = await db.select().from(vaults).where(eq(vaults.id, id));
    return vault;
  }

  async createVault(insertVault: InsertVault): Promise<Vault> {
    const [vault] = await db
      .insert(vaults)
      .values({
        ...insertVault,
        type: insertVault.type || "video",
        addedAt: new Date().toISOString(),
        lastActive: new Date().toISOString(),
        progress: "0"
      })
      .returning();
    return vault;
  }

  async deleteVault(id: string): Promise<void> {
    // Delete associated notes first
    await db.delete(notes).where(eq(notes.vaultId, id));
    // Then delete the vault
    await db.delete(vaults).where(eq(vaults.id, id));
  }

  async getNotes(vaultId: string): Promise<Note[]> {
    return await db.select().from(notes).where(eq(notes.vaultId, vaultId));
  }

  async createNote(insertNote: InsertNote): Promise<Note> {
    const [note] = await db
      .insert(notes)
      .values({
        ...insertNote,
        createdAt: new Date().toISOString()
      })
      .returning();
    return note;
  }

  async updateNote(id: string, vaultId: string, text: string): Promise<Note | undefined> {
    const [note] = await db
      .update(notes)
      .set({ text })
      .where(and(eq(notes.id, id), eq(notes.vaultId, vaultId)))
      .returning();
    return note;
  }

  async deleteNote(id: string, vaultId: string): Promise<void> {
    await db.delete(notes).where(and(eq(notes.id, id), eq(notes.vaultId, vaultId)));
  }
}

export const storage = new DatabaseStorage();
