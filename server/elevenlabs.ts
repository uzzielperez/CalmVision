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

export async function synthesizeSpeech(text: string, voiceId = DEFAULT_VOICE_ID): Promise<Buffer> {
  if (!process.env.ELEVENLABS_API_KEY) {
    throw new Error("ELEVENLABS_API_KEY is required");
  }

  // Split text into chunks
  const chunks = [];
  let start = 0;
  while (start < text.length) {
    // Find the last sentence end within the chunk size
    const chunk = text.slice(start, start + CHUNK_SIZE);
    const lastSentence = Math.max(
      chunk.lastIndexOf('. '),
      chunk.lastIndexOf('! '),
      chunk.lastIndexOf('? ')
    );

    // If we found a sentence end, use it; otherwise use the full chunk
    const end = lastSentence > 0 ? start + lastSentence + 1 : start + CHUNK_SIZE;
    chunks.push(text.slice(start, end));
    start = end;
  }

  // Process each chunk
  const audioBuffers: Buffer[] = [];
  for (const chunk of chunks) {
    try {
      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "xi-api-key": process.env.ELEVENLABS_API_KEY,
          },
          body: JSON.stringify({
            text: chunk,
            voice_settings: {
              stability: 0.75,
              similarity_boost: 0.75,
              style: 0.5,
              use_speaker_boost: true,
            } as VoiceSettings,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.text();
        if (error.includes("quota_exceeded")) {
          throw new Error("ElevenLabs quota exceeded. Please try a shorter meditation or contact support.");
        }
        throw new Error(`ElevenLabs API error: ${error}`);
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      audioBuffers.push(buffer);
    } catch (error) {
      throw error;
    }
  }

  // Concatenate all audio buffers
  return Buffer.concat(audioBuffers);
}

export async function listVoices() {
  if (!process.env.ELEVENLABS_API_KEY) {
    throw new Error("ELEVENLABS_API_KEY is required");
  }

  const response = await fetch("https://api.elevenlabs.io/v1/voices", {
    headers: {
      "xi-api-key": process.env.ELEVENLABS_API_KEY,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`ElevenLabs API error: ${error}`);
  }

  return response.json();
}