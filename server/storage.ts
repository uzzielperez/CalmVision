import { db } from "./db";
import { eq } from "drizzle-orm";
import { meditations, type Meditation, type InsertMeditation, type UpdateMeditation } from "@shared/schema"; // Removed journalEntries and related types

export interface IStorage {
  // Meditation methods
  createMeditation(meditation: InsertMeditation & { content: string }): Promise<Meditation>;
  getMeditation(id: number): Promise<Meditation | undefined>;
  listMeditations(): Promise<Meditation[]>;
  rateMeditation(id: number, rating: number): Promise<Meditation>;
  deleteMeditation(id: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // Create a new meditation
  async createMeditation(meditation: InsertMeditation & { content: string }): Promise<Meditation> {
    // For development, return a mock meditation
    if (process.env.NODE_ENV === 'development') {
      console.log("[MOCK] Creating meditation:", meditation.prompt);
      return {
        id: 1,
        prompt: meditation.prompt,
        content: meditation.content,
        rating: null,
        createdAt: new Date()
      };
    }
    
    // Production code
    const [newMeditation] = await db
      .insert(meditations)
      .values(meditation)
      .returning();
    return newMeditation;
  }

  // Get a specific meditation by ID
  async getMeditation(id: number): Promise<Meditation | undefined> {
    // For development, return a mock meditation
    if (process.env.NODE_ENV === 'development') {
      console.log("[MOCK] Getting meditation:", id);
      return {
        id: id,
        prompt: "Mock prompt",
        content: "This is a mock meditation content for development.",
        rating: null,
        createdAt: new Date()
      };
    }
    
    // Production code
    const [meditation] = await db
      .select()
      .from(meditations)
      .where(eq(meditations.id, id));
    return meditation;
  }

  // List all meditations
  async listMeditations(): Promise<Meditation[]> {
    if (process.env.NODE_ENV === 'development') {
      console.log("[MOCK] Listing meditations");
      return [{
        id: 1,
        prompt: "Mock prompt",
        content: "This is a mock meditation content for development.",
        rating: null,
        createdAt: new Date()
      }];
    }
    
    return db
      .select()
      .from(meditations)
      .orderBy(meditations.createdAt);
  }

  // Rate a meditation
  async rateMeditation(id: number, rating: number): Promise<Meditation> {
    if (process.env.NODE_ENV === 'development') {
      console.log("[MOCK] Rating meditation:", id, rating);
      return {
        id: id,
        prompt: "Mock prompt",
        content: "This is a mock meditation content for development.",
        rating: rating,
        createdAt: new Date()
      };
    }
    
    const [updated] = await db
      .update(meditations)
      .set({ rating })
      .where(eq(meditations.id, id))
      .returning();
    return updated;
  }

  // Delete a meditation
  async deleteMeditation(id: number): Promise<void> {
    if (process.env.NODE_ENV === 'development') {
      console.log("[MOCK] Deleting meditation:", id);
      return;
    }
    
    await db
      .delete(meditations)
      .where(eq(meditations.id, id));
  }
}

export const storage = new DatabaseStorage();