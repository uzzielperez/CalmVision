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
  if (!groq) {
    console.error("Groq client not initialized due to missing API key.");
    return [];
  }
  
  try {
    const models = await groq.models.list();
    return models.data || [];
  } catch (error) {
    console.error("Error listing Groq models:", error);
    return [];
  }
}

export async function generateMeditation(prompt: string) {
  try {
    console.log(`Starting meditation generation for prompt: "${prompt}"`);
    
    // Use fetch directly instead of the Groq client
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
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
        max_tokens: 2048
      })
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    const content = data.choices[0]?.message?.content || "";
    console.log(`Generated meditation with ${content.length} characters`);
    
    const duration = Math.round(content.length / 15);
    return { content, duration };
  } catch (error: any) {
    console.error('Meditation generation error:', error);
    throw new Error(`Failed to generate meditation: ${error.message || 'Unknown error'}`);
  }
}

console.log("Database URL:", process.env.DATABASE_URL ? "Set" : "Not set");