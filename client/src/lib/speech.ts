import { useState, useCallback, useEffect } from "react";

export function useSpeech() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [utterance, setUtterance] = useState<SpeechSynthesisUtterance>();
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    function loadVoices() {
      const availableVoices = speechSynthesis.getVoices();
      setVoices(availableVoices);
    }

    loadVoices();
    speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  const speak = useCallback((text: string) => {
    const newUtterance = new SpeechSynthesisUtterance(text);

    // Find a female voice for a more soothing experience
    const femaleVoice = voices.find(voice => 
      voice.name.toLowerCase().includes('female') || 
      voice.name.toLowerCase().includes('samantha')
    );

    if (femaleVoice) {
      newUtterance.voice = femaleVoice;
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
  }, [voices]);

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

  return { speak, stop, pause, resume, isPlaying };
}