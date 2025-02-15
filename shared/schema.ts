import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const meditations = pgTable("meditations", {
  id: serial("id").primaryKey(),
  prompt: text("prompt").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertMeditationSchema = createInsertSchema(meditations).pick({
  prompt: true,
  content: true,
});

export type InsertMeditation = z.infer<typeof insertMeditationSchema>;
export type Meditation = typeof meditations.$inferSelect;
