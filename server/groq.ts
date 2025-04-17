import { Groq } from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function generateMeditation(prompt: string) {
  try {
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "user",
          content: `Create a meditation script based on this prompt: ${prompt}`,
        },
      ],
      model: "llama2-70b-4096", // Changed to LLaMA 2 (alternatively use "qwen-72b" for Qwen)
    });

    const content = completion.choices[0]?.message?.content || "";
    const duration = Math.round(content.length / 15); // Estimate duration in seconds

    return { content, duration };
  } catch (error) {
    console.error('Groq API error:', error);
    throw new Error('Failed to generate meditation. Please check your Groq API connection.');
  }
}