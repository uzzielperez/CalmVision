import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface GeneratedMeditation {
  content: string;
  duration: number;
}

export async function generateMeditation(prompt: string): Promise<GeneratedMeditation> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a meditation guide specialized in creating calming, personalized meditations.
Generate a meditation script that guides the user through breathing and visualization.

Format your response with natural pacing:
- Use periods (...) for longer pauses
- Start with "Take a deep breath in..." then guide breathing
- Break paragraphs for major transitions
- Use commas for brief pauses
- Keep sentences short and soothing

Example format:
"Take a deep breath in... and slowly exhale... Feel your body relaxing with each breath...

Now, imagine yourself in a peaceful garden... The gentle breeze caresses your skin..."

The response MUST be a valid JSON object with exactly these fields:
{
  "content": "the meditation script as a string",
  "duration": estimated duration in seconds (number)
}`
        },
        {
          role: "user",
          content: `Generate a calming meditation focused on: ${prompt}`
        }
      ],
      response_format: { type: "json_object" }
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No content received from OpenAI");
    }

    try {
      const parsed = JSON.parse(content);
      if (typeof parsed.content !== 'string' || typeof parsed.duration !== 'number') {
        throw new Error("Invalid response format");
      }
      return {
        content: parsed.content,
        duration: parsed.duration
      };
    } catch (e: unknown) {
      if (e instanceof Error) {
        throw new Error(`Failed to parse OpenAI response: ${e.message}`);
      }
      throw new Error('Failed to parse OpenAI response');
    }
  } catch (error) {
    console.error('OpenAI API Error:', error);
    throw new Error("Failed to generate meditation. Please try again.");
  }
}