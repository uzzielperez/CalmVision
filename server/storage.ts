import { meditations, type Meditation, type InsertMeditation } from "@shared/schema";

export interface IStorage {
  createMeditation(meditation: InsertMeditation): Promise<Meditation>;
  getMeditation(id: number): Promise<Meditation | undefined>;
  listMeditations(): Promise<Meditation[]>;
}

export class MemStorage implements IStorage {
  private meditations: Map<number, Meditation>;
  private currentId: number;

  constructor() {
    this.meditations = new Map();
    this.currentId = 1;
  }

  async createMeditation(meditation: InsertMeditation): Promise<Meditation> {
    const id = this.currentId++;
    const newMeditation: Meditation = {
      ...meditation,
      id,
      createdAt: new Date(),
    };
    this.meditations.set(id, newMeditation);
    return newMeditation;
  }

  async getMeditation(id: number): Promise<Meditation | undefined> {
    return this.meditations.get(id);
  }

  async listMeditations(): Promise<Meditation[]> {
    return Array.from(this.meditations.values());
  }
}

export const storage = new MemStorage();
