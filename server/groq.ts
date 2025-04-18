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

export async function generateMeditation(prompt: string, model: string = "llama3-70b-8192") {
  try {
    console.log(`Starting meditation generation for prompt: "${prompt}" using model: ${model}`);
    
    // Use fetch directly instead of the Groq client
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model,
        messages: [
          {
            role: "system",
            content: `You are a meditation guide creating scripts to be read aloud. 
            Follow these guidelines:
            1. Provide ONLY the verbatim script that would be read aloud during the meditation
            2. DO NOT include introductions, titles, notes, metadata, or durations
            3. DO NOT use markdown formatting, asterisks, or other special characters
            4. DO NOT number steps or sections
            5. Use natural pauses in the text with line breaks where appropriate
            6. Begin directly with the meditation guidance (e.g., "Close your eyes...", "Take a deep breath...")
            7. Use plain, clear language designed for speaking
            8. Avoid any text that isn't meant to be read aloud
            
            Your response should be the exact text a narrator would read, without any additional content.`
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