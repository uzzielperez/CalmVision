import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

export const meditations = pgTable("meditations", {
  id: serial("id").primaryKey(),
  prompt: text("prompt").notNull(),
  content: text("content"), //remove not null
  rating: integer("rating"), // Rating from 1-5
  createdAt: timestamp("created_at").defaultNow(),
});

// Define relations (no journal entries)
export const meditationsRelations = relations(meditations, ({ many }) => ({}));

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

export type InsertMeditation = z.infer<typeof insertMeditationSchema>;
export type UpdateMeditation = z.infer<typeof updateMeditationSchema>;
export type Meditation = typeof meditations.$inferSelect;