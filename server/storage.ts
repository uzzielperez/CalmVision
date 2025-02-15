import { db } from "./db";
import { eq } from "drizzle-orm";
import { meditations, journalEntries, type Meditation, type InsertMeditation, type UpdateMeditation, type JournalEntry, type InsertJournalEntry } from "@shared/schema";

export interface IStorage {
  // Meditation methods
  createMeditation(meditation: InsertMeditation): Promise<Meditation>;
  getMeditation(id: number): Promise<Meditation | undefined>;
  listMeditations(): Promise<Meditation[]>;
  rateMeditation(id: number, rating: number): Promise<Meditation>;
  deleteMeditation(id: number): Promise<void>;

  // Journal methods
  createJournalEntry(entry: InsertJournalEntry): Promise<JournalEntry>;
  getJournalEntry(id: number): Promise<JournalEntry | undefined>;
  updateJournalEntry(id: number, entry: Partial<InsertJournalEntry>): Promise<JournalEntry>;
  listJournalEntriesForMeditation(meditationId: number): Promise<JournalEntry[]>;
}

export class DatabaseStorage implements IStorage {
  // Existing meditation methods
  async createMeditation(meditation: InsertMeditation & { content: string }): Promise<Meditation> {
    const [newMeditation] = await db
      .insert(meditations)
      .values(meditation)
      .returning();
    return newMeditation;
  }

  async getMeditation(id: number): Promise<Meditation | undefined> {
    const [meditation] = await db
      .select()
      .from(meditations)
      .where(eq(meditations.id, id));
    return meditation;
  }

  async listMeditations(): Promise<Meditation[]> {
    return db
      .select()
      .from(meditations)
      .orderBy(meditations.createdAt);
  }

  async rateMeditation(id: number, rating: number): Promise<Meditation> {
    const [updated] = await db
      .update(meditations)
      .set({ rating })
      .where(eq(meditations.id, id))
      .returning();
    return updated;
  }

  async deleteMeditation(id: number): Promise<void> {
    await db
      .delete(meditations)
      .where(eq(meditations.id, id));
  }

  // New journal methods
  async createJournalEntry(entry: InsertJournalEntry): Promise<JournalEntry> {
    const [newEntry] = await db
      .insert(journalEntries)
      .values(entry)
      .returning();
    return newEntry;
  }

  async getJournalEntry(id: number): Promise<JournalEntry | undefined> {
    const [entry] = await db
      .select()
      .from(journalEntries)
      .where(eq(journalEntries.id, id));
    return entry;
  }

  async updateJournalEntry(id: number, entry: Partial<InsertJournalEntry>): Promise<JournalEntry> {
    const [updated] = await db
      .update(journalEntries)
      .set(entry)
      .where(eq(journalEntries.id, id))
      .returning();
    return updated;
  }

  async listJournalEntriesForMeditation(meditationId: number): Promise<JournalEntry[]> {
    return db
      .select()
      .from(journalEntries)
      .where(eq(journalEntries.meditationId, meditationId))
      .orderBy(journalEntries.createdAt);
  }
}

export const storage = new DatabaseStorage();