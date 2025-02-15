import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface GeneratedMeditation {
  content: string;
  duration: number;
}

export async function generateMeditation(prompt: string): Promise<GeneratedMeditation> {
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: "You are a meditation guide specialized in creating calming, personalized meditations. Generate a meditation script that includes breathing instructions and visualization. Format the response as JSON with 'content' (the meditation script) and 'duration' (estimated duration in seconds)."
      },
      {
        role: "user",
        content: prompt
      }
    ],
    response_format: { type: "json_object" }
  });

  // Parse and validate the response
  const content = response.choices[0].message.content;
  if (!content) {
    throw new Error("Failed to generate meditation content");
  }

  const parsed = JSON.parse(content);
  return {
    content: parsed.content,
    duration: parsed.duration
  };
}