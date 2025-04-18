import { db } from "./db";
import { eq } from "drizzle-orm";
import { meditations, type Meditation, type InsertMeditation, type UpdateMeditation } from "@shared/schema"; // Removed journalEntries and related types

// Store the last generated meditation for development mode
let lastGeneratedMeditation: Meditation | null = null;

export interface IStorage {
  // Meditation methods
  createMeditation(meditation: InsertMeditation & { content: string }): Promise<Meditation>;
  getMeditation(id: number): Promise<Meditation | undefined>;
  listMeditations(): Promise<Meditation[]>;
  rateMeditation(id: number, rating: number): Promise<Meditation>;
  deleteMeditation(id: number): Promise<void>;
  updateMeditationContent(id: number, content: string): Promise<Meditation>;
}

export class DatabaseStorage implements IStorage {
  // Create a new meditation
  async createMeditation(meditation: InsertMeditation & { content: string }): Promise<Meditation> {
    try {
      // For development, store in memory
      if (process.env.NODE_ENV === 'development') {
        console.log("[MOCK] Creating meditation:", meditation.prompt);
        
        // Create a mock meditation with the actual content
        lastGeneratedMeditation = {
          id: Date.now(), // Use timestamp for unique ID
          prompt: meditation.prompt,
          content: meditation.content, // Store the actual generated content
          rating: null,
          model: meditation.model || "llama3-70b-8192", // Add default model
          createdAt: new Date()
        };
        
        return lastGeneratedMeditation;
      }
      
      // Production code
      const [newMeditation] = await db
        .insert(meditations)
        .values(meditation)
        .returning();
      return newMeditation;
    } catch (error: any) {
      console.error("Database error details:", {
        message: error?.message || "No message",
        code: error?.code || "No code",
        detail: error?.detail || "No detail",
        sqlState: error?.sqlState || "No sqlState",
        query: error?.query || "No query",
        fullError: JSON.stringify(error, Object.getOwnPropertyNames(error))
      });
      throw error;
    }
  }

  // Get a specific meditation by ID
  async getMeditation(id: number): Promise<Meditation | undefined> {
    // For development, return the last generated meditation
    if (process.env.NODE_ENV === 'development') {
      console.log("[MOCK] Getting meditation:", id);
      
      // Return the last generated meditation regardless of ID in development
      if (lastGeneratedMeditation) {
        return lastGeneratedMeditation;
      }
      
      // Fallback if nothing generated yet
      return {
        id: id,
        prompt: "Mock prompt",
        content: "This is a mock meditation content for development.",
        rating: null,
        model: "llama3-70b-8192", // Add default model
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
      
      // Include the last generated meditation in the list if it exists
      const mockMeditations: Meditation[] = [{
        id: 1,
        prompt: "Mock prompt",
        content: "This is a mock meditation content for development.",
        rating: null,
        model: "llama3-70b-8192", // Add default model
        createdAt: new Date(Date.now() - 86400000) // 1 day ago
      }];
      
      if (lastGeneratedMeditation) {
        mockMeditations.unshift(lastGeneratedMeditation); // Add to beginning of array
      }
      
      return mockMeditations;
    }
    
    // Production code remains the same
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
        model: "llama3-70b-8192", // Add default model
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

  // Update meditation content
  async updateMeditationContent(id: number, content: string): Promise<Meditation> {
    if (process.env.NODE_ENV === 'development') {
      console.log("[MOCK] Updating meditation content:", id);
      
      // Update the last generated meditation if it exists
      if (lastGeneratedMeditation && lastGeneratedMeditation.id === id) {
        lastGeneratedMeditation.content = content;
        return lastGeneratedMeditation;
      }
      
      // Return a mock meditation
      return {
        id: id,
        prompt: "Mock prompt",
        content: content,
        rating: null,
        model: "llama3-70b-8192", // Add default model
        createdAt: new Date()
      };
    }
    
    // Production code
    const [updated] = await db
      .update(meditations)
      .set({ content })
      .where(eq(meditations.id, id))
      .returning();
    return updated;
  }
}

export const storage = new DatabaseStorage();