import fetch from "node-fetch";

interface VoiceSettings {
  stability: number;
  similarity_boost: number;
  style: number;
  use_speaker_boost: boolean;
}

interface ElevenLabsResponse {
  audio: string;
}

// Voice IDs reference: https://api.elevenlabs.io/v1/voices
const DEFAULT_VOICE_ID = "21m00Tcm4TlvDq8ikWAM"; // Rachel - calm, soothing voice

const CHUNK_SIZE = 500; // Maximum characters per request to avoid quota issues

// Voice mapping between services
const ELEVENLABS_DEFAULT_VOICE = "21m00Tcm4TlvDq8ikWAM"; // Rachel
const OPENAI_DEFAULT_VOICE = "nova"; // Similar calming voice

// Maps ElevenLabs voices to closest OpenAI equivalent for fallback
const voiceMap: Record<string, string> = {
  "21m00Tcm4TlvDq8ikWAM": "nova", // Rachel → Nova
  // Add more mappings as needed
};

// Voice types for each service
type ElevenLabsVoice = { voice_id: string; name: string };
type OpenAIVoice = { id: string; name: string };
type GroqVoice = { id: string; name: string };

// Function to clean up text before sending to TTS
export function cleanupTextForAudio(text: string): string {
  // Remove markdown formatting
  let cleanText = text
    .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
    .replace(/\*(.*?)\*/g, '$1')     // Remove italic
    .replace(/#{1,6}\s+/g, '')       // Remove headers
    .replace(/```[^`]*```/g, '')     // Remove code blocks
    .replace(/^Title:.*$/gm, '')     // Remove title metadata
    .replace(/^Meditation:.*$/gm, '') // Remove meditation metadata
    .replace(/^Script:.*$/gm, '');   // Remove script metadata
  
  // Clean up lines
  const lines = cleanText.split('\n');
  const cleanedLines = lines
    .filter(line => {
      const trimmedLine = line.trim();
      if (!trimmedLine) return false;
      
      // Skip metadata-like lines
      if (trimmedLine.match(/^(Title|Duration|Tags|Author|Category):/i)) return false;
      
      return true;
    })
    .map(line => line.trim());
  
  return cleanedLines.join('\n');
}

// Main function that handles fallback logic
export async function synthesizeSpeech(
  text: string, 
  voiceId: string
): Promise<Buffer> {
  const cleanedText = cleanupTextForAudio(text);
  
  // Try ElevenLabs if configured
  if (process.env.ELEVENLABS_API_KEY && !voiceId.startsWith('openai_') && !voiceId.startsWith('groq_')) {
    try {
      console.log("Attempting ElevenLabs TTS...");
      return await synthesizeWithElevenLabs(cleanedText, voiceId);
    } catch (error) {
      console.error("ElevenLabs TTS failed:", error);
      // Fall through to next option
    }
  }
  
  // Try OpenAI if configured
  if (process.env.OPENAI_API_KEY && (!voiceId.startsWith('groq_') || voiceId.startsWith('openai_'))) {
    const openaiVoiceId = voiceId.startsWith('openai_') 
      ? voiceId.replace('openai_', '') 
      : mapElevenLabsToOpenAI(voiceId);
      
    try {
      console.log("Attempting OpenAI TTS...");
      return await synthesizeWithOpenAI(cleanedText, openaiVoiceId);
    } catch (error) {
      console.error("OpenAI TTS failed:", error);
      // Fall through to next option
    }
  }
  
  // Try Groq if configured
  if (process.env.GROQ_API_KEY) {
    const groqModel = voiceId.startsWith('groq_') 
      ? voiceId.replace('groq_', '') 
      : 'playai-tts-arabic';  // Default model
      
    try {
      console.log("Attempting Groq TTS...");
      return await synthesizeWithGroq(cleanedText, groqModel);
    } catch (error) {
      console.error("Groq TTS failed:", error);
    }
  }
  
  throw new Error("No TTS service available or all services failed");
}

// Function to synthesize speech with ElevenLabs
async function synthesizeWithElevenLabs(text: string, voiceId: string): Promise<Buffer> {
  if (!process.env.ELEVENLABS_API_KEY) {
    throw new Error("ELEVENLABS_API_KEY is not configured");
  }

  // ElevenLabs has a character limit, so we need to chunk the text
  // The limit is approximately 5000 characters
  const MAX_CHUNK_SIZE = 4000;
  const textChunks = [];
  
  for (let i = 0; i < text.length; i += MAX_CHUNK_SIZE) {
    textChunks.push(text.substring(i, i + MAX_CHUNK_SIZE));
  }
  
  console.log(`Synthesizing speech with ElevenLabs: ${textChunks.length} chunks`);
  
  let allAudioBuffers: Buffer[] = [];
  
  for (let i = 0; i < textChunks.length; i++) {
    const chunk = textChunks[i];
    console.log(`Processing chunk ${i+1}/${textChunks.length}, length: ${chunk.length}`);
    
    const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'xi-api-key': process.env.ELEVENLABS_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: chunk,
        model_id: 'eleven_turbo_v2',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.5,
        },
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ElevenLabs API error: ${response.status} ${errorText}`);
    }
    
    const audioBuffer = Buffer.from(await response.arrayBuffer());
    allAudioBuffers.push(audioBuffer);
  }
  
  // If we only have one chunk, just return it directly
  if (allAudioBuffers.length === 1) {
    return allAudioBuffers[0];
  }
  
  // Combine all audio buffers into one
  return Buffer.concat(allAudioBuffers);
}

// Function to synthesize speech with OpenAI
async function synthesizeWithOpenAI(text: string, voiceId: string): Promise<Buffer> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const url = "https://api.openai.com/v1/audio/speech";
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: "tts-1",
      input: text,
      voice: voiceId,
      response_format: "mp3"
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API error: ${response.status} ${errorText}`);
  }

  return Buffer.from(await response.arrayBuffer());
}

// Function to synthesize speech with Groq
async function synthesizeWithGroq(text: string, model: string): Promise<Buffer> {
  if (!process.env.GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY is not configured");
  }

  const url = "https://api.groq.com/openai/v1/audio/speech";
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: model, // 'playai-tts-arabic' or other Groq TTS model
      input: text,
      voice: "default", // Adjust if Groq offers voice options
      response_format: "mp3"
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Groq API error: ${response.status} ${errorText}`);
  }

  return Buffer.from(await response.arrayBuffer());
}

// Voice mapping function
function mapElevenLabsToOpenAI(elevenLabsVoiceId: string): string {
  // Map ElevenLabs voices to the closest OpenAI voice
  const mapping: Record<string, string> = {
    "21m00Tcm4TlvDq8ikWAM": "nova", // Rachel - female voice
    "AZnzlk1XvdvUeBnXmlld": "alloy", // Domi - neutral voice
    "EXAVITQu4vr4xnSDxMaL": "echo",  // Bella - female voice
    "MF3mGyEYCl7XYWbV9V6O": "onyx",  // Adam - male voice
    "TxGEqnHWrfWFTfGW9XjX": "shimmer", // Josh - male voice
    "VR6AewLTigWG4xSOukaG": "fable",  // Elli - female voice
    "pNInz6obpgDQGcFmaJgB": "alloy",  // Antoni - male voice
    "yoZ06aMxZJJ28mfd3POQ": "nova",   // Sam - female voice
  };
  
  return mapping[elevenLabsVoiceId] || "alloy"; // Default to alloy if no match
}

// Function to list available voices
export async function listVoices(): Promise<Array<{ id: string; name: string }>> {
  let voices: Array<{ id: string; name: string }> = [];
  let serviceAvailable = false;
  
  // Add ElevenLabs voices if configured
  if (process.env.ELEVENLABS_API_KEY) {
    try {
      console.log("Fetching ElevenLabs voices...");
      const response = await fetch('https://api.elevenlabs.io/v1/voices', {
        headers: {
          'xi-api-key': process.env.ELEVENLABS_API_KEY,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.voices && Array.isArray(data.voices)) {
          const elevenLabsVoices = data.voices.map((voice: ElevenLabsVoice) => ({
            id: voice.voice_id,
            name: voice.name,
          }));
          voices.push(...elevenLabsVoices);
          serviceAvailable = true;
          console.log(`Found ${elevenLabsVoices.length} ElevenLabs voices`);
        } else {
          console.error('ElevenLabs response did not contain voices array:', data);
        }
      } else {
        console.error('Failed to fetch ElevenLabs voices:', await response.text());
      }
    } catch (error) {
      console.error("Failed to fetch ElevenLabs voices:", error);
    }
  } else {
    console.log("ElevenLabs API key not configured");
  }
  
  // Add OpenAI voices if configured
  if (process.env.OPENAI_API_KEY) {
    try {
      console.log("Adding OpenAI voices...");
      const openaiVoices: OpenAIVoice[] = [
        { id: "openai_alloy", name: "OpenAI Alloy" },
        { id: "openai_echo", name: "OpenAI Echo" },
        { id: "openai_fable", name: "OpenAI Fable" },
        { id: "openai_onyx", name: "OpenAI Onyx" },
        { id: "openai_nova", name: "OpenAI Nova" },
        { id: "openai_shimmer", name: "OpenAI Shimmer" }
      ];
      voices.push(...openaiVoices);
      serviceAvailable = true;
      console.log(`Added ${openaiVoices.length} OpenAI voices`);
    } catch (error) {
      console.error("Failed to add OpenAI voices:", error);
    }
  } else {
    console.log("OpenAI API key not configured");
  }
  
  // Add Groq voices if configured
  if (process.env.GROQ_API_KEY) {
    try {
      console.log("Adding Groq voices...");
      const groqVoices: GroqVoice[] = [
        { id: "groq_playai-tts-arabic", name: "Arabic TTS (Groq)" },
        // Add other Groq models if available
      ];
      voices.push(...groqVoices);
      serviceAvailable = true;
      console.log(`Added ${groqVoices.length} Groq voices`);
    } catch (error) {
      console.error("Failed to add Groq voices:", error);
    }
  } else {
    console.log("Groq API key not configured");
  }
  
  // If no services available, add fallback voices
  if (!serviceAvailable || voices.length === 0) {
    console.log("No TTS services available or no voices found, adding fallback voices");
    voices = [
      { id: "default", name: "Default Voice" },
      { id: "groq_playai-tts-arabic", name: "Arabic TTS (Groq)" },
      { id: "openai_nova", name: "OpenAI Nova" },
      { id: "21m00Tcm4TlvDq8ikWAM", name: "ElevenLabs Rachel" }
    ];
  }
  
  console.log(`Total voices available: ${voices.length}`);
  return voices;
}