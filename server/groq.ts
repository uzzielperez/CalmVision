import { Groq } from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com" // Removed /openai/v1 from baseURL
});

// Add connection test function
export async function testConnection() {
  try {
    const response = await fetch('https://api.groq.com/openai/v1/models', {
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return true;
  } catch (error) {
    console.error('Connection test failed:', error);
    throw error;
  }
}

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
    // Test connection before proceeding
    await testConnection();

    const completion = await groq.chat.completions.create({
      model: "llama3-70b-8192",
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
    if (error.code === 'ECONNREFUSED') {
      throw new Error('Connection to Groq API failed. Please check your API key and endpoint configuration.');
    }
    throw new Error(`Failed to generate meditation: ${error.message}`);
  }
}