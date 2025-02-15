import type { Express } from "express";
import { createServer } from "http";
import { storage } from "./storage";
import { generateMeditation } from "./openai";
import { insertMeditationSchema } from "@shared/schema";
import { ZodError } from "zod";

export async function registerRoutes(app: Express) {
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

  app.get("/api/meditations/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    const meditation = await storage.getMeditation(id);

    if (!meditation) {
      res.status(404).json({ error: "Meditation not found" });
      return;
    }

    res.json(meditation);
  });

  const httpServer = createServer(app);
  return httpServer;
}