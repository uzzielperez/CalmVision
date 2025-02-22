import type { Express } from "express";
import { createServer } from "http";
import { storage } from "./storage";
import { generateMeditation } from "./openai";
import { synthesizeSpeech, listVoices } from "./elevenlabs";
import { insertMeditationSchema, updateMeditationSchema, insertJournalEntrySchema } from "@shared/schema";
import { ZodError } from "zod";

export async function registerRoutes(app: Express) {
  // Get available voices
  app.get("/api/voices", async (_req, res) => {
    try {
      const voicesData = await listVoices();
      // Pass through the voices array directly
      res.json(voicesData);
    } catch (error) {
      console.error('Failed to fetch voices:', error);
      res.status(500).json({ error: "Failed to fetch voices" });
    }
  });

  // Get audio for a meditation
  app.get("/api/meditations/:id/audio", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const voiceId = req.query.voice_id as string;

      const meditation = await storage.getMeditation(id);

      if (!meditation) {
        res.status(404).json({ error: "Meditation not found" });
        return;
      }

      const audioBuffer = await synthesizeSpeech(meditation.content, voiceId);

      res.set({
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.length,
      });

      res.send(audioBuffer);
    } catch (error) {
      console.error('Failed to generate audio:', error);
      res.status(500).json({ error: "Failed to generate audio" });
    }
  });

  app.post("/api/meditations", async (req, res) => {
    try {
      // Validate request body
      const { prompt } = insertMeditationSchema.parse(req.body);
      console.log('Received meditation prompt:', prompt);

      try {
        // Generate meditation content
        console.log('Generating meditation...');
        const generated = await generateMeditation(prompt);
        console.log('Generated meditation content successfully');

        // Store in database
        const meditation = await storage.createMeditation({
          prompt,
          content: generated.content
        });

        res.json({ ...meditation, duration: generated.duration });
      } catch (error) {
        console.error('Generation error:', error);
        res.status(500).json({ 
          error: "Failed to generate meditation",
          details: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    } catch (error) {
      if (error instanceof ZodError) {
        console.error('Validation error:', error.errors);
        res.status(400).json({ error: error.errors });
      } else {
        console.error('Unexpected error:', error);
        res.status(500).json({ error: "Internal server error" });
      }
    }
  });

  app.get("/api/meditations", async (_req, res) => {
    try {
      const meditations = await storage.listMeditations();
      res.json(meditations);
    } catch (error) {
      console.error('Failed to list meditations:', error);
      res.status(500).json({ error: "Failed to list meditations" });
    }
  });

  app.get("/api/meditations/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    const meditation = await storage.getMeditation(id);

    if (!meditation) {
      res.status(404).json({ error: "Meditation not found" });
      return;
    }

    res.json(meditation);
  });

  app.patch("/api/meditations/:id/rate", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { rating } = updateMeditationSchema.parse(req.body);

      const meditation = await storage.rateMeditation(id, rating);
      res.json(meditation);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ error: error.errors });
      } else {
        res.status(500).json({ error: "Failed to rate meditation" });
      }
    }
  });

  app.delete("/api/meditations/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteMeditation(id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete meditation" });
    }
  });

  // Journal Entry Routes
  app.post("/api/meditations/:meditationId/journal", async (req, res) => {
    try {
      const meditationId = parseInt(req.params.meditationId);
      const journalData = insertJournalEntrySchema.parse({
        ...req.body,
        meditationId
      });

      const entry = await storage.createJournalEntry(journalData);
      res.json(entry);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ error: error.errors });
      } else {
        res.status(500).json({ error: "Failed to create journal entry" });
      }
    }
  });

  app.get("/api/meditations/:meditationId/journal", async (req, res) => {
    try {
      const meditationId = parseInt(req.params.meditationId);
      const entries = await storage.listJournalEntriesForMeditation(meditationId);
      res.json(entries);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch journal entries" });
    }
  });

  app.patch("/api/journal/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const entry = await storage.updateJournalEntry(id, req.body);
      res.json(entry);
    } catch (error) {
      res.status(500).json({ error: "Failed to update journal entry" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}