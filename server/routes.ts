import type { Express } from "express";
import { createServer } from "http";
import { storage } from "./storage";
// import { generateMeditation } from "./openai"; // Remove OpenAI import
import { generateMeditation } from "./groq"; // Import from your Groq implementation file - ADD .js EXTENSION
import { synthesizeSpeech, listVoices } from "./elevenlabs";
import { insertMeditationSchema, updateMeditationSchema } from "@shared/schema";
import { ZodError } from "zod";
import { listModels } from "./groq";

export async function registerRoutes(app: Express) {
  // Add this new route to list models
  app.get("/api/models", async (_req, res) => {
    try {
      const models = await listModels();
      res.json(models.map(model => model.id));
    } catch (error) {
      console.error('Failed to list models:', error);
      res.status(500).json({ error: "Failed to list models" });
    }
  });

  // Get available voices
  app.get("/api/voices", async (_req, res) => {
    try {
      const voicesData = await listVoices();
      res.json(voicesData);
    } catch (error) {
      console.error('Failed to fetch voices:', error);
      res.status(500).json({ error: "Failed to fetch voices" });
    }
  });

  // Stream meditation audio
  app.get("/api/meditations/:id/audio", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid ID" });
      }

      const voiceId = req.query.voice_id as string;
      if (!voiceId) {
        return res.status(400).json({ error: "Voice ID is required" });
      }

      const meditation = await storage.getMeditation(id);
      if (!meditation) {
        return res.status(404).json({ error: "Meditation not found" });
      }

      const audioBuffer = await synthesizeSpeech(meditation.content, voiceId);

      res.set({
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.length,
        'Cache-Control': 'no-cache',
        'Content-Disposition': 'inline',
      });

      res.send(audioBuffer);
    } catch (error) {
      console.error('Failed to generate audio:', error);
      res.status(500).json({ error: "Failed to generate audio" });
    }
  });

  // Create a new meditation
  app.post("/api/meditations", async (req, res) => {
    try {
      const { prompt } = insertMeditationSchema.parse(req.body);
      console.log('Received meditation prompt:', prompt);

      // Add basic fallback
      let generated;
      try {
        // Try using your implementation
        generated = await generateMeditation(prompt);
        console.log('Generated meditation content successfully');
      } catch (genError) {
        console.error('Specific generation error:', genError);
        // Fallback to a simple response
        generated = {
          content: `Meditation on ${prompt}. Close your eyes. Take a deep breath. Focus on your breathing. Relax each part of your body from head to toe. Continue breathing deeply.`,
          duration: 30
        };
        console.log('Using fallback meditation content');
      }

      const meditation = await storage.createMeditation({
        prompt,
        content: generated.content,
      });

      res.json({ ...meditation, duration: generated.duration });
    } catch (error) {
      console.error('Full error details:', error);
      res.status(500).json({ 
        error: "Failed to create meditation", 
        details: error.message 
      });
    }
  });

  // List all meditations
  app.get("/api/meditations", async (_req, res) => {
    try {
      const meditations = await storage.listMeditations();
      res.json(meditations);
    } catch (error) {
      // Replace the incorrect handleError call with standard logging and response
      console.error('Failed to list meditations:', error); // Log the actual error
      res.status(500).json({ error: "Failed to list meditations" }); // Send JSON response
    }
  });

  // Get a specific meditation
  app.get("/api/meditations/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid ID" });
      }

      const meditation = await storage.getMeditation(id);
      if (!meditation) {
        return res.status(404).json({ error: "Meditation not found" });
      }

      res.json(meditation);
    } catch (error) {
      console.error('Failed to fetch meditation:', error);
      res.status(500).json({ error: "Failed to fetch meditation" });
    }
  });

  // Rate a meditation
  app.patch("/api/meditations/:id/rate", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid ID" });
      }

      const { rating } = updateMeditationSchema.parse(req.body);
      const meditation = await storage.rateMeditation(id, rating);

      res.json(meditation);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ error: error.errors });
      } else {
        console.error('Failed to rate meditation:', error);
        res.status(500).json({ error: "Failed to rate meditation" });
      }
    }
  });

  // Delete a meditation
  app.delete("/api/meditations/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid ID" });
      }

      await storage.deleteMeditation(id);
      res.status(204).send();
    } catch (error) {
      console.error('Failed to delete meditation:', error);
      res.status(500).json({ error: "Failed to delete meditation" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}