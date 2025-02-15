import { pgTable, text, serial, timestamp, integer, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

export const meditations = pgTable("meditations", {
  id: serial("id").primaryKey(),
  prompt: text("prompt").notNull(),
  content: text("content").notNull(),
  rating: integer("rating"),  // Rating from 1-5
  createdAt: timestamp("created_at").defaultNow(),
});

// Journal entries table for emotion tracking
export const journalEntries = pgTable("journal_entries", {
  id: serial("id").primaryKey(),
  meditationId: integer("meditation_id").notNull().references(() => meditations.id),
  emotionBefore: integer("emotion_before").notNull(), // Scale 1-5
  emotionAfter: integer("emotion_after"), // Scale 1-5
  notes: text("notes"),
  emotions: json("emotions").$type<string[]>(), // Array of emotion tags
  createdAt: timestamp("created_at").defaultNow(),
});

// Define relations
export const meditationsRelations = relations(meditations, ({ many }) => ({
  journalEntries: many(journalEntries),
}));

export const journalEntriesRelations = relations(journalEntries, ({ one }) => ({
  meditation: one(meditations, {
    fields: [journalEntries.meditationId],
    references: [meditations.id],
  }),
}));

// Only require prompt for insertion, content will be generated
export const insertMeditationSchema = createInsertSchema(meditations)
  .pick({ prompt: true })
  .extend({
    prompt: z.string().min(1, "Please enter a meditation prompt"),
  });

export const updateMeditationSchema = createInsertSchema(meditations)
  .pick({ rating: true })
  .extend({
    rating: z.number().min(1).max(5),
  });

export const insertJournalEntrySchema = createInsertSchema(journalEntries)
  .extend({
    emotionBefore: z.number().min(1).max(5),
    emotionAfter: z.number().min(1).max(5).optional(),
    notes: z.string().optional(),
    emotions: z.array(z.string()).optional(),
  });

export type InsertMeditation = z.infer<typeof insertMeditationSchema>;
export type UpdateMeditation = z.infer<typeof updateMeditationSchema>;
export type Meditation = typeof meditations.$inferSelect;
export type InsertJournalEntry = z.infer<typeof insertJournalEntrySchema>;
export type JournalEntry = typeof journalEntries.$inferSelect;