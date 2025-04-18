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
      if (!meditation || !meditation.content) {
        return res.status(404).json({ error: "Meditation content not found" });
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

      // Log every step
      console.log('Generating meditation...');
      let generated;
      
      try {
        // Try using your implementation
        generated = await generateMeditation(prompt);
        console.log('Generated meditation content successfully, length:', generated.content.length);
      } catch (genError: any) {
        console.error('Specific generation error:', genError);
        console.error('Error stack:', genError.stack);
        throw genError;
      }

      console.log('Truncating content if needed...');
      // Before saving to database, truncate if needed
      const maxContentLength = 10000;
      const truncatedContent = generated.content.length > maxContentLength 
        ? generated.content.substring(0, maxContentLength - 3) + "..."
        : generated.content;
      console.log('Content ready for database, truncated:', generated.content.length > maxContentLength);

      console.log('Saving to database...');
      const meditation = await storage.createMeditation({
        prompt,
        content: truncatedContent,
      });
      console.log('Saved to database, ID:', meditation.id);

      res.json({ ...meditation, duration: generated.duration });
    } catch (error: any) {
      console.error('FULL ERROR DETAILS:');
      console.error('Error type:', typeof error);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      console.error('Error stringified:', JSON.stringify(error, null, 2));
      
      res.status(500).json({ 
        error: "Failed to create meditation", 
        details: error?.message || "Unknown error" 
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

  // Add a simple test endpoint
  app.get('/api/test', (req, res) => {
    res.json({ status: 'ok', message: 'Server is working' });
  });

  // Add a Groq test endpoint
  app.get('/api/groq-test', async (req, res) => {
    console.log("==== GROQ TEST ENDPOINT CALLED ====");
    try {
      console.log("Testing Groq connection...");
      console.log("GROQ_API_KEY set:", process.env.GROQ_API_KEY ? "Yes (length: " + process.env.GROQ_API_KEY.length + ")" : "No");
      
      // Test a basic fetch first
      try {
        console.log("Testing basic fetch to Groq API...");
        const response = await fetch('https://api.groq.com/openai/v1/models', {
          headers: {
            'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
            'Content-Type': 'application/json',
          },
        });
        console.log("Fetch status:", response.status);
        if (response.ok) {
          const data = await response.json();
          console.log("Basic fetch successful, models count:", data.data?.length || 0);
        } else {
          console.log("Basic fetch failed:", response.statusText);
        }
      } catch (fetchError) {
        console.error("Basic fetch error:", fetchError);
      }
      
      // Now try listModels
      console.log("Trying listModels function...");
      const models = await listModels();
      console.log("listModels returned:", models);
      
      // Return success with models list
      res.json({ 
        status: 'ok', 
        message: 'Groq connection successful',
        models: models
      });
      console.log("==== GROQ TEST ENDPOINT COMPLETED SUCCESSFULLY ====");
    } catch (error: any) {
      console.error("==== GROQ TEST ERROR ====");
      console.error("Groq test error:", error);
      console.error("Error name:", error?.name);
      console.error("Error message:", error?.message);
      console.error("Error stack:", error?.stack);
      res.status(500).json({ 
        status: 'error', 
        message: 'Groq connection failed',
        error: error?.message || String(error)
      });
    }
  });

  // Add a DB test endpoint
  app.get('/api/db-test', async (req, res) => {
    console.log("==== DB TEST ENDPOINT CALLED ====");
    try {
      // Try a simple write and read
      const testPrompt = "Test prompt for debugging";
      const testContent = "Short test content to verify database operations";
      
      console.log("Creating test meditation...");
      const created = await storage.createMeditation({
        prompt: testPrompt,
        content: testContent,
      });
      console.log("Test meditation created:", created);
      
      const retrieved = await storage.getMeditation(created.id);
      console.log("Test meditation retrieved:", retrieved);
      
      // Clean up
      await storage.deleteMeditation(created.id);
      console.log("Test meditation deleted");
      
      res.json({ 
        status: 'ok',
        message: 'Database operations successful'
      });
    } catch (error: any) {
      console.error("==== DB TEST ERROR ====");
      console.error("DB test error:", error);
      console.error("Error name:", error?.name);
      console.error("Error message:", error?.message);
      res.status(500).json({
        status: 'error',
        message: 'Database test failed',
        error: error?.message || String(error)
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}