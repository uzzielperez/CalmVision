import type { Express } from "express";
import { createServer } from "http";
import { storage } from "./storage";
import { generateMeditation } from "./openai";
import { insertMeditationSchema } from "@shared/schema";
import { ZodError } from "zod";

export async function registerRoutes(app: Express) {
  app.post("/api/meditations", async (req, res) => {
    try {
      const parsed = insertMeditationSchema.parse(req.body);
      const generated = await generateMeditation(parsed.prompt);

      const meditation = await storage.createMeditation({
        prompt: parsed.prompt,
        content: generated.content
      });

      res.json({ ...meditation, duration: generated.duration });
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ error: error.errors });
      } else {
        res.status(500).json({ error: "Failed to generate meditation" });
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