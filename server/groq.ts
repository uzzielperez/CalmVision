import { Groq } from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// Function to list available models
export async function listModels() {
  try {
    const models = await groq.models.list();
    console.log('Available models:');
    models.data.forEach(model => console.log(`- ${model.id}`));
    return models.data;
  } catch (error) {
    console.error('Error listing models:', error);
    throw error;
  }
}

export async function generateMeditation(prompt: string) {
  try {
    const models = await listModels();
    const model = models[0]?.id || 'llama-3.3-70b-versatile';

    console.log('Making API request to:', 'https://api.groq.com/v1/chat/completions');
    console.log('Request payload:', {
      messages: [{
        role: "user",
        content: `Create a meditation script based on this prompt: ${prompt}`,
      }],
      model: model,
    });

    const completion = await groq.chat.completions.create({
      messages: [{
        role: "user",
        content: `Create a meditation script based on this prompt: ${prompt}`,
      }],
      model: model,
    });

    const content = completion.choices[0]?.message?.content || "";
    const duration = Math.round(content.length / 15); // Estimate duration in seconds

    return { content, duration };
  } catch (error) {
    console.error('Groq API error:', error);
    throw new Error('Failed to generate meditation. Please check your Groq API connection.');
  }
}