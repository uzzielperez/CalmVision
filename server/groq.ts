import { Groq } from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// Add listModels function
export async function listModels() {
  try {
    const models = await groq.models.list();
    return models.data;
  } catch (error) {
    console.error('Error listing models:', error);
    throw error;
  }
}

export async function generateMeditation(prompt: string) {
  try {
    const completion = await groq.chat.completions.create({
      model: "llama2-7b", // Changed to LLaMA 2 7B
      messages: [
        {
          role: "user",
          content: `Create a meditation script based on this prompt: ${prompt}`,
        },
      ],
      temperature: 1,
      max_tokens: 1024,
      top_p: 1,
      stream: true,
    });

    let content = "";
    for await (const chunk of completion) {
      content += chunk.choices[0]?.delta?.content || "";
    }

    const duration = Math.round(content.length / 15); // Estimate duration in seconds
    return { content, duration };
  } catch (error) {
    console.error('Groq API error:', error);
    throw new Error('Failed to generate meditation. Please check your Groq API connection.');
  }
}