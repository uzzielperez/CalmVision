import Groq from "groq-sdk";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

const groqApiKey = process.env.GROQ_API_KEY;

if (!groqApiKey) {
  console.error("GROQ_API_KEY environment variable is not set. Groq features will be disabled.");
}

// Initialize Groq SDK with explicit baseURL and logging
const groq = groqApiKey ? new Groq({ apiKey: groqApiKey, baseURL: 'https://api.groq.com' }) : null;
console.log('Groq SDK initialized with baseURL:', groq ? 'https://api.groq.com' : 'not initialized');

// Simple estimation function (words per minute) - adjust WPM as needed
function estimateDuration(text: string, wpm = 150): number {
  if (!text) return 0;
  const words = text.trim().split(/\s+/).length;
  const minutes = words / wpm;
  return Math.ceil(minutes * 60); // Duration in seconds
}

export async function generateMeditation(prompt: string): Promise<{ content: string; duration: number }> {
  if (!groq) {
    console.error("Groq client not initialized due to missing API key.");
    return { content: "Meditation generation is currently unavailable.", duration: 0 };
  }

  console.log(`Generating meditation with Groq for prompt: "${prompt}"`);

  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant that generates guided meditation scripts. The script should be calm, soothing, and follow the user's prompt. Focus on mindfulness and relaxation techniques. Keep the script concise and suitable for the estimated duration based on word count (approx 150 words per minute)."
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      model: "llama3-8b-8192",
      temperature: 0.7,
    });

    const content = chatCompletion.choices[0]?.message?.content || "";
    if (!content) {
      console.error("Groq response did not contain content. Full response:", JSON.stringify(chatCompletion));
      throw new Error("Failed to generate meditation content from Groq.");
    }

    const duration = estimateDuration(content);
    console.log(`Generated content length: ${content.length} chars, Estimated duration: ${duration}s`);

    return { content, duration };
  } catch (error: any) {
    console.error("Error calling Groq API:");
    console.error("  Status:", error?.status);
    console.error("  Message:", error?.message);
    console.error("  Headers:", error?.headers);
    console.error("  Error Body:", error?.error);
    console.error("  Full Error:", error);
    throw new Error("Failed to generate meditation using Groq API.");
  }
}