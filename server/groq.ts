import { Groq } from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

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
      model: "llama3-70b-8192", // Changed to llama3-70b-8192
      messages: [
        {
          role: "system",
          content: "You are a meditation guide. Create calming and insightful meditation scripts."
        },
        {
          role: "user",
          content: `Create a meditation script based on this prompt: ${prompt}`,
        },
      ],
      temperature: 0.7,
      max_tokens: 2048,
      stream: true,
    });

    let content = "";
    for await (const chunk of completion) {
      content += chunk.choices[0]?.delta?.content || "";
    }

    const duration = Math.round(content.length / 15);
    return { content, duration };
  } catch (error) {
    console.error('Groq API error:', error);
    throw new Error('Failed to generate meditation. Please check your Groq API connection.');
  }
}