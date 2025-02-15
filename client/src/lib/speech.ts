import { useState, useCallback, useEffect } from "react";

interface VoiceWithAccent extends SpeechSynthesisVoice {
  accent?: string;
}

export function useSpeech() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [utterance, setUtterance] = useState<SpeechSynthesisUtterance>();
  const [voices, setVoices] = useState<VoiceWithAccent[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<VoiceWithAccent | null>(null);

  useEffect(() => {
    function loadVoices() {
      const availableVoices = speechSynthesis.getVoices();

      // Process voices to identify accents
      const processedVoices = availableVoices.map(voice => {
        const voiceWithAccent: VoiceWithAccent = voice;
        const name = voice.name.toLowerCase();

        if (name.includes('british') || name.includes('uk')) {
          voiceWithAccent.accent = 'British';
        } else if (name.includes('irish')) {
          voiceWithAccent.accent = 'Irish';
        } else if (name.includes('australian') || name.includes('au')) {
          voiceWithAccent.accent = 'Australian';
        } else if (name.includes('scottish') || name.includes('scotland')) {
          voiceWithAccent.accent = 'Scottish';
        }

        return voiceWithAccent;
      });

      setVoices(processedVoices);

      // Try to find a preferred accent voice as default
      const defaultVoice = processedVoices.find(voice => 
        voice.accent === 'British' || 
        voice.accent === 'Irish' ||
        voice.accent === 'Australian' ||
        voice.accent === 'Scottish'
      ) || processedVoices.find(voice => 
        voice.name.toLowerCase().includes('female') || 
        voice.name.toLowerCase().includes('samantha')
      ) || processedVoices[0];

      setSelectedVoice(defaultVoice);
    }

    loadVoices();
    speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  const speak = useCallback((text: string) => {
    const newUtterance = new SpeechSynthesisUtterance(text);

    if (selectedVoice) {
      newUtterance.voice = selectedVoice;
    }

    // Adjust speech parameters for a more calming effect
    newUtterance.rate = 0.85;  // Slightly slower
    newUtterance.pitch = 0.95; // Slightly lower pitch
    newUtterance.volume = 0.8; // Slightly softer

    newUtterance.onstart = () => setIsPlaying(true);
    newUtterance.onend = () => setIsPlaying(false);
    newUtterance.onpause = () => setIsPlaying(false);
    newUtterance.onresume = () => setIsPlaying(true);

    setUtterance(newUtterance);
    speechSynthesis.speak(newUtterance);
    setIsPlaying(true);
  }, [selectedVoice]);

  const stop = useCallback(() => {
    speechSynthesis.cancel();
    setIsPlaying(false);
  }, []);

  const pause = useCallback(() => {
    speechSynthesis.pause();
    setIsPlaying(false);
  }, []);

  const resume = useCallback(() => {
    speechSynthesis.resume();
    setIsPlaying(true);
  }, []);

  return { 
    speak, 
    stop, 
    pause, 
    resume, 
    isPlaying,
    voices,
    selectedVoice,
    setSelectedVoice
  };
}