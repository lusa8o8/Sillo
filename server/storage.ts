import { users, vaults, notes, type User, type InsertUser, type Vault, type InsertVault, type Note, type InsertNote } from "../shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Vaults
  getVaults(): Promise<Vault[]>;
  createVault(vault: InsertVault): Promise<Vault>;
  deleteVault(id: string): Promise<void>;

  // Notes
  getNotes(vaultId: string): Promise<Note[]>;
  createNote(note: InsertNote): Promise<Note>;
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

  async getVaults(): Promise<Vault[]> {
    return await db.select().from(vaults);
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
}

export const storage = new DatabaseStorage();
